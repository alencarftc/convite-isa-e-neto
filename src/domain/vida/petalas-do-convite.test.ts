import { describe, expect, it } from 'vitest';

import { type ParametrosDasPetalas, planejarPetala } from './petalas-do-convite';
import type { Aleatorio } from './sorteio';

const parametros: ParametrosDasPetalas = {
  primeiroEm: 1.8,
  primeiroEmAoPular: 0.6,
  intervalo: [1.4, 3.2],
  duracao: [10, 20],
  balanco: [20, 40],
  trocasDeLado: [2, 4],
  giro: 200,
  largura: [14, 26],
  opacidade: 0.9,
  esmaecer: 0.1,
  virar: [1.6, 2.8],
  maximo: { completo: 9, leve: 5 },
  noComputador: { fatorDoIntervalo: 0.5, fatorDoMaximo: 1.8 },
};

/** Gerador determinístico (congruencial), para repetir sempre os mesmos sorteios. */
function congruente(semente: number): Aleatorio {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

describe('planejarPetala (08/11/2026)', () => {
  it('sorteia dentro dos limites da configuração, 500 vezes', () => {
    const aleatorio = congruente(7);
    for (let i = 0; i < 500; i += 1) {
      const plano = planejarPetala(aleatorio, parametros, 3);

      expect(plano.x).toBeGreaterThanOrEqual(0);
      expect(plano.x).toBeLessThan(1);
      expect(plano.largura).toBeGreaterThanOrEqual(14);
      expect(plano.largura).toBeLessThanOrEqual(26);
      expect(plano.duracao).toBeGreaterThanOrEqual(10);
      expect(plano.duracao).toBeLessThanOrEqual(20);
      expect(plano.balanco).toBeGreaterThanOrEqual(20);
      expect(plano.balanco).toBeLessThanOrEqual(40);
      expect([2, 3, 4]).toContain(plano.trocasDeLado);
      expect(Math.abs(plano.giro)).toBeLessThanOrEqual(200);
      expect(Math.abs(plano.giro)).toBeGreaterThanOrEqual(80);
      expect(plano.opacidade).toBeGreaterThanOrEqual(0.5);
      expect(plano.opacidade).toBeLessThanOrEqual(0.9);
      expect(plano.periodoDoVirar).toBeGreaterThanOrEqual(1.6);
      expect(plano.periodoDoVirar).toBeLessThanOrEqual(2.8);
      expect([0, 1, 2]).toContain(plano.variacao);
    }
  });

  it('a pétala grande (perto) cai mais depressa e é mais nítida que a pequena (longe)', () => {
    const longe = planejarPetala(() => 0, parametros, 3);
    const perto = planejarPetala(() => 0.999999, parametros, 3);

    expect(perto.largura).toBeGreaterThan(longe.largura);
    expect(perto.duracao).toBeLessThan(longe.duracao);
    expect(perto.opacidade).toBeGreaterThan(longe.opacidade);
  });

  it('com a mesma sequência de sorteios sai o mesmo plano, e com outra, outro (posições variadas)', () => {
    const a = planejarPetala(congruente(1), parametros, 3);
    const b = planejarPetala(congruente(1), parametros, 3);
    const xs = new Set(
      Array.from({ length: 30 }, (_, i) => planejarPetala(congruente(i + 100), parametros, 3).x),
    );

    expect(a).toEqual(b);
    expect(xs.size).toBeGreaterThan(20);
  });

  it('usa os dois sentidos de giro e as duas posições (espelhada ou não)', () => {
    const aleatorio = congruente(3);
    const planos = Array.from({ length: 200 }, () => planejarPetala(aleatorio, parametros, 3));

    expect(planos.some((p) => p.giro < 0)).toBe(true);
    expect(planos.some((p) => p.giro > 0)).toBe(true);
    expect(planos.some((p) => p.espelhada)).toBe(true);
    expect(planos.some((p) => !p.espelhada)).toBe(true);
  });

  it('uma só variação sempre escolhe a primeira, e nenhuma não quebra', () => {
    expect(planejarPetala(congruente(5), parametros, 1).variacao).toBe(0);
    expect(planejarPetala(congruente(5), parametros, 0).variacao).toBe(0);
  });
});
