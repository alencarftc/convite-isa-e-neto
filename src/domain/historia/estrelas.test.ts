import { describe, expect, it } from 'vitest';

import { posicoesDasEstrelas } from './estrelas';

const arco = { centro: { x: 200, y: 500 }, raio: 100, achatamento: 0.5 };

describe('posicoesDasEstrelas (ADR-0026)', () => {
  it('abre um arco da esquerda para a direita, todo acima do centro', () => {
    const estrelas = posicoesDasEstrelas({ ...arco, quantidade: 5 });

    expect(estrelas).toHaveLength(5);
    const xs = estrelas.map((e) => e.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    for (const estrela of estrelas) expect(estrela.y).toBeLessThan(arco.centro.y);
  });

  it('a do meio fica no centro, no ponto mais alto, e as pontas são simétricas', () => {
    const [primeira, , meio, , ultima] = posicoesDasEstrelas({ ...arco, quantidade: 5 });

    expect(meio?.x).toBeCloseTo(200);
    expect(meio?.y).toBeCloseTo(500 - 100 * 0.5);
    expect((primeira?.x ?? 0) + (ultima?.x ?? 0)).toBeCloseTo(400);
    expect(primeira?.y).toBeCloseTo(ultima?.y ?? 0);
  });

  it('o raio vertical é o horizontal vezes o achatamento', () => {
    const [, , meio] = posicoesDasEstrelas({ ...arco, achatamento: 0.2, quantidade: 5 });

    expect(meio?.y).toBeCloseTo(500 - 100 * 0.2);
  });

  it('uma só estrela vai ao ponto mais alto, e nenhuma não dá estrela', () => {
    const [unica] = posicoesDasEstrelas({ ...arco, quantidade: 1 });

    expect(unica?.x).toBeCloseTo(200);
    expect(unica?.y).toBeCloseTo(450);
    expect(posicoesDasEstrelas({ ...arco, quantidade: 0 })).toEqual([]);
  });
});
