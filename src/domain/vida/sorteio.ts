/**
 * Sorteios da cena viva (SPEC-18). O domínio não tem `Math.random`: quem chama injeta o `aleatorio`
 * (a apresentação passa `Math.random`; os testes passam uma sequência fixa).
 */

/** Devolve um número em [0, 1), como `Math.random`. */
export type Aleatorio = () => number;

/** Um intervalo `[mínimo, máximo]` da configuração, sorteado a cada vez. */
export type Intervalo = readonly [number, number];

export type Lado = 'esquerda' | 'direita';

/** Um número qualquer do intervalo. */
export function sortearEntre([minimo, maximo]: Intervalo, aleatorio: Aleatorio): number {
  return minimo + (maximo - minimo) * aleatorio();
}

/** Um inteiro do intervalo, com as duas pontas incluídas (por exemplo, 2 a 5 pássaros). */
export function sortearInteiro([minimo, maximo]: Intervalo, aleatorio: Aleatorio): number {
  const sorteado = minimo + Math.floor(aleatorio() * (maximo - minimo + 1));
  return Math.min(maximo, sorteado);
}

export function escolherLado(aleatorio: Aleatorio): Lado {
  return aleatorio() < 0.5 ? 'esquerda' : 'direita';
}

/** O lado oposto (quem entra por um lado sai pelo outro). */
export function ladoOposto(lado: Lado): Lado {
  return lado === 'esquerda' ? 'direita' : 'esquerda';
}

/** Um item da lista; `undefined` se ela estiver vazia. */
export function escolherItem<T>(itens: readonly T[], aleatorio: Aleatorio): T | undefined {
  if (itens.length === 0) return undefined;
  return itens[Math.min(itens.length - 1, Math.floor(aleatorio() * itens.length))];
}
