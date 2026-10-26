import type { Cena } from './cena';

/**
 * Cena que se comporta como a original, mas falha em `run()` (SPEC-01, RF-01.10, `?erro=`).
 * Serve só para provar o modo de segurança em desenvolvimento.
 */
export function comErroForcado<R>(nome: string, cena: Cena<R>): Cena<R> {
  return {
    init: () => {
      cena.init();
    },
    run: () => Promise.reject(new Error(`Erro forçado na cena "${nome}" (?erro=${nome})`)),
    skip: () => {
      cena.skip();
    },
    destroy: () => {
      cena.destroy();
    },
  };
}
