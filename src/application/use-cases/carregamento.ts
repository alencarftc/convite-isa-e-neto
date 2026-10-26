import type { ConfigConvite } from '@/domain/config/config-convite';
import {
  type ChaveDeImagem,
  CHAVES_CRITICAS,
  FILA_SECUNDARIA,
  urlDaImagem,
} from '@/domain/imagens/catalogo-de-imagens';
import type { Orientacao } from '@/domain/tela/orientacao';

import type { CarregadorDeImagens, PrioridadeDeImagem } from '../ports/carregador-de-imagens';
import type { Temporizador } from '../ports/temporizador';

export interface ResultadoCritico {
  /** `true` só quando todas as críticas terminaram; `false` se o tempo limite veio antes. */
  readonly completo: boolean;
  /** Críticas que falharam mesmo depois da nova tentativa (só confiável se `completo`). */
  readonly ausentes: readonly ChaveDeImagem[];
}

export type SituacaoDoBosque = 'pronto' | 'ausente' | 'demorou';

export interface Carregamento {
  /** Termina quando o crítico termina ou depois de `limiteCritico`, o que vier primeiro (RF-02.4). */
  critico(orientacao: Orientacao): Promise<ResultadoCritico>;
  /** Só termina quando o crítico termina de fato (RF-03.2). Reaproveita downloads em andamento. */
  criticoPronto(orientacao: Orientacao): Promise<ResultadoCritico>;
  /** Depois do toque: espera o bosque por até `limiteSeguranca` (RF-02.8). */
  aguardarBosque(orientacao: Orientacao): Promise<SituacaoDoBosque>;
  /** Dispara a fila secundária, na ordem de uso, sem bloquear ninguém (RF-02.7). */
  secundario(orientacao: Orientacao): void;
}

export interface DependenciasDoCarregamento {
  readonly imagens: CarregadorDeImagens;
  readonly temporizador: Temporizador;
  readonly config: Pick<ConfigConvite, 'duracoes' | 'imagens'>;
  /**
   * Fotos dos balões (`content.baloes[].foto`): não são imagens de `config`, mas entram na fila
   * secundária junto com os balões, para estarem no cache quando a história começar.
   */
  readonly fotos?: readonly string[];
}

/**
 * Pré-carregamento (SPEC-02). Cada arquivo é baixado uma única vez; quem pede de novo recebe o
 * mesmo resultado. Falha de uma imagem tem uma nova tentativa depois de
 * `duracoes.novaTentativaDeImagem`; persistindo, ela é dada como ausente.
 */
export function criarCarregamento({
  imagens,
  temporizador,
  config,
  fotos = [],
}: DependenciasDoCarregamento): Carregamento {
  const { duracoes } = config;
  const downloads = new Map<string, Promise<boolean>>();
  const criticos = new Map<Orientacao, Promise<ResultadoCritico>>();

  function baixarUmaVez(url: string, prioridade: PrioridadeDeImagem): Promise<boolean> {
    const existente = downloads.get(url);
    if (existente) return existente;
    const download = (async () => {
      if (await imagens.baixar(url, prioridade)) return true;
      await temporizador.esperar(duracoes.novaTentativaDeImagem);
      return imagens.baixar(url, prioridade);
    })();
    downloads.set(url, download);
    return download;
  }

  function baixarImagem(
    chave: ChaveDeImagem,
    orientacao: Orientacao,
    prioridade: PrioridadeDeImagem,
  ): Promise<boolean> {
    return baixarUmaVez(urlDaImagem(config.imagens[chave], orientacao), prioridade);
  }

  function criticoPronto(orientacao: Orientacao): Promise<ResultadoCritico> {
    const existente = criticos.get(orientacao);
    if (existente) return existente;
    const pronto = Promise.all(
      CHAVES_CRITICAS.map(async (chave) => ({
        chave,
        ok: await baixarImagem(chave, orientacao, 'alta'),
      })),
    ).then((resultados) => ({
      completo: true,
      ausentes: resultados.filter(({ ok }) => !ok).map(({ chave }) => chave),
    }));
    criticos.set(orientacao, pronto);
    return pronto;
  }

  return {
    criticoPronto,

    critico(orientacao) {
      return Promise.race([
        criticoPronto(orientacao),
        temporizador
          .esperar(duracoes.limiteCritico)
          .then((): ResultadoCritico => ({ completo: false, ausentes: [] })),
      ]);
    },

    aguardarBosque(orientacao) {
      return Promise.race([
        criticoPronto(orientacao).then(({ ausentes }): SituacaoDoBosque =>
          ausentes.length > 0 ? 'ausente' : 'pronto',
        ),
        temporizador.esperar(duracoes.limiteSeguranca).then((): SituacaoDoBosque => 'demorou'),
      ]);
    },

    secundario(orientacao) {
      void (async () => {
        for (const [indice, grupo] of FILA_SECUNDARIA.entries()) {
          // O primeiro grupo é o do baú e da história: as fotos dos balões vão com ele.
          const doGrupo = grupo.map((chave) => baixarImagem(chave, orientacao, 'baixa'));
          const dasFotos = indice === 0 ? fotos.map((url) => baixarUmaVez(url, 'baixa')) : [];
          await Promise.all([...doGrupo, ...dasFotos]);
        }
      })();
    },
  };
}
