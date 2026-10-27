import { describe, expect, it } from 'vitest';

import {
  type Aleatorio,
  escolherItem,
  escolherLado,
  ladoOposto,
  sortearEntre,
  sortearInteiro,
} from './sorteio';

/** Devolve os valores na ordem e repete o último quando acabam. */
function sequencia(...valores: number[]): Aleatorio {
  let indice = 0;
  return () => {
    const valor = valores[Math.min(indice, valores.length - 1)] ?? 0;
    indice += 1;
    return valor;
  };
}

describe('sorteios da cena viva', () => {
  it('sortearEntre cobre o intervalo de ponta a ponta', () => {
    expect(sortearEntre([1.6, 3.2], sequencia(0))).toBeCloseTo(1.6);
    expect(sortearEntre([1.6, 3.2], sequencia(0.5))).toBeCloseTo(2.4);
    expect(sortearEntre([1.6, 3.2], sequencia(0.999999))).toBeCloseTo(3.2, 4);
  });

  it('sortearInteiro inclui as duas pontas (2 a 5 pássaros)', () => {
    expect(sortearInteiro([2, 5], sequencia(0))).toBe(2);
    expect(sortearInteiro([2, 5], sequencia(0.26))).toBe(3);
    expect(sortearInteiro([2, 5], sequencia(0.999999))).toBe(5);
  });

  it('sortearInteiro nunca passa do máximo, nem com um sorteio que chegue a 1', () => {
    expect(sortearInteiro([2, 5], sequencia(1))).toBe(5);
  });

  it('escolherLado divide ao meio e ladoOposto inverte', () => {
    expect(escolherLado(sequencia(0.1))).toBe('esquerda');
    expect(escolherLado(sequencia(0.9))).toBe('direita');
    expect(ladoOposto('esquerda')).toBe('direita');
    expect(ladoOposto('direita')).toBe('esquerda');
  });

  it('escolherItem sorteia da lista e devolve undefined se ela estiver vazia', () => {
    const itens = ['a', 'b', 'c'] as const;

    expect(escolherItem(itens, sequencia(0))).toBe('a');
    expect(escolherItem(itens, sequencia(0.5))).toBe('b');
    expect(escolherItem(itens, sequencia(1))).toBe('c');
    expect(escolherItem<string>([], sequencia(0.5))).toBeUndefined();
  });
});
