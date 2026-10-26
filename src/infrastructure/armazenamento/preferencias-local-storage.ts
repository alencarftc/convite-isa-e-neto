import type { ChavesDePreferencia, Preferencias } from '@/application/ports/preferencias';

export type ArmazenamentoMinimo = Pick<Storage, 'getItem' | 'setItem'>;

/** `window.localStorage` pode lançar (cookies bloqueados, navegador interno restrito). */
export function obterLocalStorageSeguro(): ArmazenamentoMinimo | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Preferências em JSON no armazenamento; qualquer falha cai no valor padrão. */
export function criarPreferencias(armazenamento: ArmazenamentoMinimo | undefined): Preferencias {
  return {
    ler<K extends keyof ChavesDePreferencia>(chave: K, padrao: ChavesDePreferencia[K]) {
      try {
        const bruto = armazenamento?.getItem(chave);
        if (bruto === null || bruto === undefined) return padrao;
        const valor: unknown = JSON.parse(bruto);
        return typeof valor === typeof padrao ? (valor as ChavesDePreferencia[K]) : padrao;
      } catch {
        return padrao;
      }
    },
    gravar(chave, valor) {
      try {
        armazenamento?.setItem(chave, JSON.stringify(valor));
      } catch {
        // Sem armazenamento: a escolha vale só nesta visita.
      }
    },
  };
}
