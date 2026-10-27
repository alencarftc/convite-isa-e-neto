import { type Fase, transicaoValida } from '@/domain/fase/fase';

import type { Ambiente, Orientacao } from './ports/ambiente';
import type { Preferencias } from './ports/preferencias';

/** Estado global do convite (SPEC-01, RF-01.8). Leitura livre; só a fase é escrita por fora. */
export interface EstadoConvite {
  readonly fase: Fase;
  /** Som ligado? Preferência salva no aparelho (SPEC-08); ligado por padrão. */
  readonly somLigado: boolean;
  /** Já abriu o convite neste aparelho? (SPEC-09) */
  readonly visitado: boolean;
  /**
   * Movimento de ambiente ligado? Preferência salva no aparelho (SPEC-18, US-13.6); ligado por padrão e
   * desligado depois de "Pausar animação". Vale para a cena viva e para a deriva das camadas.
   */
  readonly movimentoLigado: boolean;
  /** Animação reduzida: o convite vai direto ao estado final (SPEC-09). */
  readonly reduzido: boolean;
  /** O ponteiro principal é de toque (`pointer: coarse`): celular, tablet. */
  readonly toque: boolean;
  /** Há também toque, ainda que o principal seja o mouse (notebook com tela de toque; SPEC-04). */
  readonly algumToque: boolean;
  readonly orientacao: Orientacao;
  /**
   * Avança a fase. Devolve `false`, sem mudar nada, se a transição não for válida (o convite só
   * anda para a frente e as fases finais não têm saída).
   */
  definirFase(fase: Fase): boolean;
  /** Registra que o convidado já abriu o convite neste aparelho (`convite:visitado`; SPEC-06, RF-06.10). */
  marcarVisitado(): void;
  /** Liga ou desliga o som e lembra a escolha para a próxima visita (RF-08.6). */
  definirSom(ligado: boolean): void;
  /** Liga ou desliga o movimento de ambiente e lembra a escolha para a próxima visita (SPEC-18, RF-18.9). */
  definirMovimento(ligado: boolean): void;
  /** Avisa a cada mudança de fase, de som, de movimento ou de orientação; devolve a função que cancela o aviso. */
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

  let somLigado = preferencias.ler('convite:som', true);
  let visitado = preferencias.ler('convite:visitado', false);
  let movimentoLigado = preferencias.ler('convite:movimento', true);
  const reduzido = ambiente.animacaoReduzida();
  const toque = ambiente.porToque();
  const algumToque = ambiente.algumToque();

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
    get somLigado() {
      return somLigado;
    },
    get visitado() {
      return visitado;
    },
    get movimentoLigado() {
      return movimentoLigado;
    },
    reduzido,
    toque,
    algumToque,
    get orientacao() {
      return orientacao;
    },
    definirFase(nova) {
      if (!transicaoValida(fase, nova)) return false;
      fase = nova;
      avisar();
      return true;
    },
    marcarVisitado() {
      if (visitado) return;
      visitado = true;
      preferencias.gravar('convite:visitado', true);
      avisar();
    },
    definirSom(ligado) {
      if (ligado === somLigado) return;
      somLigado = ligado;
      preferencias.gravar('convite:som', ligado);
      avisar();
    },
    definirMovimento(ligado) {
      if (ligado === movimentoLigado) return;
      movimentoLigado = ligado;
      preferencias.gravar('convite:movimento', ligado);
      avisar();
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
