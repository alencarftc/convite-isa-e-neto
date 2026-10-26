import { type Fase, transicaoValida } from '@/domain/fase/fase';

import type { Ambiente, Orientacao } from './ports/ambiente';
import type { Preferencias } from './ports/preferencias';

/** Estado global do convite (SPEC-01, RF-01.8). Leitura livre; só a fase é escrita por fora. */
export interface EstadoConvite {
  readonly fase: Fase;
  /** Preferência de som (SPEC-08); ligado por padrão. */
  readonly somLigado: boolean;
  /** Já abriu o convite neste aparelho? (SPEC-09) */
  readonly visitado: boolean;
  /** Animação reduzida: o convite vai direto ao estado final (SPEC-09). */
  readonly reduzido: boolean;
  readonly toque: boolean;
  readonly orientacao: Orientacao;
  /**
   * Avança a fase. Devolve `false`, sem mudar nada, se a transição não for válida (o convite só
   * anda para a frente e as fases finais não têm saída).
   */
  definirFase(fase: Fase): boolean;
  /** Avisa a cada mudança de fase ou de orientação; devolve a função que cancela o aviso. */
  aoMudar(escuta: (estado: EstadoConvite) => void): () => void;
  /** Para de ouvir o ambiente e esquece os avisos. */
  destruir(): void;
}

export interface DependenciasDoEstado {
  readonly preferencias: Preferencias;
  readonly ambiente: Ambiente;
}

export function criarEstado({ preferencias, ambiente }: DependenciasDoEstado): EstadoConvite {
  let fase: Fase = 'carregando';
  let orientacao = ambiente.orientacao();
  const escutas = new Set<(estado: EstadoConvite) => void>();

  const somLigado = preferencias.ler('convite:som', true);
  const visitado = preferencias.ler('convite:visitado', false);
  const reduzido = ambiente.animacaoReduzida();
  const toque = ambiente.porToque();

  function avisar(): void {
    for (const escuta of [...escutas]) escuta(estado);
  }

  const parar = ambiente.aoMudarOrientacao((nova) => {
    if (nova === orientacao) return;
    orientacao = nova;
    avisar();
  });

  const estado: EstadoConvite = {
    get fase() {
      return fase;
    },
    somLigado,
    visitado,
    reduzido,
    toque,
    get orientacao() {
      return orientacao;
    },
    definirFase(nova) {
      if (!transicaoValida(fase, nova)) return false;
      fase = nova;
      avisar();
      return true;
    },
    aoMudar(escuta) {
      escutas.add(escuta);
      return () => {
        escutas.delete(escuta);
      };
    },
    destruir() {
      parar();
      escutas.clear();
    },
  };

  return estado;
}
