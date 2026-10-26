import type { Cena } from '@/application/cena';

import {
  type DependenciasInformacoes,
  type InformacoesMontadas,
  montarInformacoes,
} from './informacoes';

/**
 * Estado final do convite (SPEC-07) como cena: monta o bloco "Informações" na primeira vez que é
 * mostrado. `run()` e `skip()` fazem o mesmo (o bloco não tem animação própria ainda) e funcionam
 * mesmo que `init()` não tenha rodado, porque o modo de segurança depende disto (SPEC-09).
 */
export function criarCenaInformacoes(
  dependencias: DependenciasInformacoes,
  /** Onde o bloco é montado, resolvido na hora de mostrar (a carta cria o `.conteudo`, SPEC-06). */
  destino?: () => HTMLElement,
): Cena {
  let montadas: InformacoesMontadas | undefined;

  function mostrar(animar: boolean): void {
    montadas ??= montarInformacoes({
      ...dependencias,
      animar,
      raiz: destino?.() ?? dependencias.raiz,
    });
  }

  return {
    init: () => undefined,
    run() {
      // No caminho completo os cartões surgem ao entrar na tela (SPEC-07).
      mostrar(dependencias.animar ?? false);
      return Promise.resolve();
    },
    skip() {
      // Pular, animação reduzida e modo de segurança: tudo já à vista, sem animação.
      mostrar(false);
    },
    destroy() {
      montadas?.destruir();
      montadas = undefined;
    },
  };
}
