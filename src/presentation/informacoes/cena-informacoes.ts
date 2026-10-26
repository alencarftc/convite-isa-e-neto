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

  function mostrar(): void {
    montadas ??= montarInformacoes({ ...dependencias, raiz: destino?.() ?? dependencias.raiz });
  }

  return {
    init: () => undefined,
    run() {
      mostrar();
      return Promise.resolve();
    },
    skip: mostrar,
    destroy() {
      montadas?.destruir();
      montadas = undefined;
    },
  };
}
