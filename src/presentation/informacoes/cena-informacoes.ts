import type { Cena } from '@/application/cena';

import { type HistoriaEstaticaMontada, montarHistoriaEstatica } from './cartoes-da-historia';
import {
  type DependenciasInformacoes,
  type InformacoesMontadas,
  montarInformacoes,
} from './informacoes';

/**
 * Estado final do convite (SPEC-07) como cena: monta o bloco "Informações" na primeira vez que é
 * mostrado. Funciona mesmo que `init()` não tenha rodado, porque o modo de segurança depende disto
 * (SPEC-09).
 *
 * `run()` é o caminho completo: o convidado acabou de ver os balões, então "A nossa história" não é
 * repetida. `skip()` é todo o resto (animação reduzida, "Pular para o convite", modo de segurança):
 * ninguém viu os balões, então a história estática entra entre a carta e as informações (SPEC-13,
 * RF-13.2).
 */
export function criarCenaInformacoes(
  dependencias: DependenciasInformacoes,
  /** Onde o bloco é montado, resolvido na hora de mostrar (a carta cria o `.conteudo`, SPEC-06). */
  destino?: () => HTMLElement,
): Cena {
  let montadas: InformacoesMontadas | undefined;
  let historia: HistoriaEstaticaMontada | undefined;

  function mostrar(animar: boolean, comHistoria: boolean): void {
    const raiz = destino?.() ?? dependencias.raiz;
    // Cada bloco só uma vez: o orquestrador tenta o final de novo se ele falhou (SPEC-09).
    if (comHistoria) {
      historia ??= montarHistoriaEstatica({ raiz, conteudo: dependencias.conteudo });
    }
    montadas ??= montarInformacoes({ ...dependencias, animar, raiz });
  }

  return {
    init: () => undefined,
    run() {
      // No caminho completo os cartões surgem ao entrar na tela (SPEC-07).
      mostrar(dependencias.animar ?? false, false);
      return Promise.resolve();
    },
    skip() {
      // Pular, animação reduzida e modo de segurança: tudo já à vista, sem animação.
      mostrar(false, true);
    },
    destroy() {
      historia?.destruir();
      historia = undefined;
      montadas?.destruir();
      montadas = undefined;
    },
  };
}
