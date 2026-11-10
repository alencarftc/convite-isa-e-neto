import { describe, expect, it } from 'vitest';

import { type ParametrosDeFolha, planejarFolha } from './folhas';
import type { Aleatorio } from './sorteio';

const PARAMETROS: ParametrosDeFolha = {
  intervalo: [1.6, 3.2],
  duracao: [7, 11],
  balanco: [20, 60],
  trocasDeLado: [2, 3],
  giro: 540,
  largura: { fundo: [0.014, 0.024], frente: [0.026, 0.036] },
  larguraNoComputador: { fundo: [0.02, 0.03], frente: [0.03, 0.045] },
  fracaoNaFrente: 0.2,
  aceleracaoNaFrente: 1.3,
  copa: {
    vertical: { x: [0.55, 0.95], y: [0.05, 0.3] },
    horizontal: { x: [0.6, 0.95], y: [0.05, 0.35] },
  },
  chao: [0.72, 0.86],
  esmaecerNoFim: 0.2,
  aparece: 0.5,
  inclinacao: 25,
  esmaecerAoAbrir: 1.2,
  larguraMinima: 10,
};

/** Um gerador que devolve sempre o mesmo valor (CT-20.1 usa 0,1 e 0,9). */
const fixo =
  (valor: number): Aleatorio =>
  () =>
    valor;

/** Gerador determinístico simples, para varrer muitos sorteios. */
function congruente(semente: number): Aleatorio {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

describe('planejarFolha (SPEC-20, "Folhas")', () => {
  it('a origem fica dentro da copa, a queda termina entre 72% e 86% e dura de 7 a 11 s (CT-20.1)', () => {
    const aleatorio = congruente(7);
    for (let i = 0; i < 300; i += 1) {
      const folha = planejarFolha(aleatorio, PARAMETROS, 'vertical');

      expect(folha.origem.x).toBeGreaterThanOrEqual(0.55);
      expect(folha.origem.x).toBeLessThanOrEqual(0.95);
      expect(folha.origem.y).toBeGreaterThanOrEqual(0.05);
      expect(folha.origem.y).toBeLessThanOrEqual(0.3);
      expect(folha.chao).toBeGreaterThanOrEqual(0.72);
      expect(folha.chao).toBeLessThanOrEqual(0.86);
      const minimo = folha.frente ? 7 / 1.3 : 7;
      const maximo = folha.frente ? 11 / 1.3 : 11;
      expect(folha.duracao).toBeGreaterThanOrEqual(minimo - 1e-9);
      expect(folha.duracao).toBeLessThanOrEqual(maximo + 1e-9);
    }
  });

  it('a copa muda com a orientação: na horizontal vai de 60% a 95% da largura e até 35% da altura', () => {
    const aleatorio = congruente(11);
    for (let i = 0; i < 200; i += 1) {
      const folha = planejarFolha(aleatorio, PARAMETROS, 'horizontal');

      expect(folha.origem.x).toBeGreaterThanOrEqual(0.6);
      expect(folha.origem.y).toBeLessThanOrEqual(0.35);
    }
  });

  it('com o sorteio sempre em 0,1 a folha vai para a frente: maior e 30% mais rápida (CT-20.1)', () => {
    const folha = planejarFolha(fixo(0.1), PARAMETROS, 'vertical');

    expect(folha.frente).toBe(true);
    expect(folha.largura).toBeGreaterThanOrEqual(0.026);
    expect(folha.largura).toBeLessThanOrEqual(0.036);
    expect(folha.duracao).toBeCloseTo((7 + (11 - 7) * 0.1) / 1.3);
  });

  it('com o sorteio sempre em 0,9 a folha fica atrás do baú: menor e com a duração inteira', () => {
    const folha = planejarFolha(fixo(0.9), PARAMETROS, 'vertical');

    expect(folha.frente).toBe(false);
    expect(folha.largura).toBeGreaterThanOrEqual(0.014);
    expect(folha.largura).toBeLessThanOrEqual(0.024);
    expect(folha.duracao).toBeCloseTo(7 + (11 - 7) * 0.9);
  });

  it('cerca de 20% das folhas vão para a frente', () => {
    const aleatorio = congruente(3);
    const total = 2000;
    let naFrente = 0;
    for (let i = 0; i < total; i += 1) {
      if (planejarFolha(aleatorio, PARAMETROS, 'vertical').frente) naFrente += 1;
    }

    expect(naFrente / total).toBeGreaterThan(0.16);
    expect(naFrente / total).toBeLessThan(0.24);
  });

  it('balanço de 20 a 60 px, 2 ou 3 trocas de lado e giro de até 540° para qualquer lado', () => {
    const aleatorio = congruente(5);
    const giros = new Set<number>();
    for (let i = 0; i < 300; i += 1) {
      const folha = planejarFolha(aleatorio, PARAMETROS, 'vertical');

      expect(folha.balanco).toBeGreaterThanOrEqual(20);
      expect(folha.balanco).toBeLessThanOrEqual(60);
      expect([2, 3]).toContain(folha.trocasDeLado);
      expect(Math.abs(folha.giro)).toBeLessThanOrEqual(540);
      expect(Math.abs(folha.giro)).toBeGreaterThanOrEqual(216);
      giros.add(Math.sign(folha.giro));
    }
    expect(giros).toEqual(new Set([-1, 1]));
  });

  it('no celular e no tablet a largura é fração da largura da tela, como sempre', () => {
    const folha = planejarFolha(fixo(0.9), PARAMETROS, 'vertical');

    expect(folha.larguraRelativaA).toBe('largura');
    expect(planejarFolha(fixo(0.9), PARAMETROS, 'horizontal', false)).toEqual(
      planejarFolha(fixo(0.9), PARAMETROS, 'horizontal'),
    );
  });

  it('no computador a folha é medida pela ALTURA da tela e sai menor (09/11/2026)', () => {
    const fundo = planejarFolha(fixo(0.9), PARAMETROS, 'horizontal', true);
    const frente = planejarFolha(fixo(0.1), PARAMETROS, 'horizontal', true);

    expect(fundo.larguraRelativaA).toBe('altura');
    expect(fundo.largura).toBeGreaterThanOrEqual(0.02);
    expect(fundo.largura).toBeLessThanOrEqual(0.03);
    expect(frente.larguraRelativaA).toBe('altura');
    expect(frente.largura).toBeGreaterThanOrEqual(0.03);
    expect(frente.largura).toBeLessThanOrEqual(0.045);
    // Num monitor de 1920 × 1080 a folha da frente tem de 32 a 49 px, e não os 96 a 134 px de antes (5% a 7% da largura).
    expect(frente.largura * 1080).toBeLessThan(50);
  });

  it('o resto do plano não muda com o computador: só a largura e a medida dela', () => {
    const normal = planejarFolha(congruente(2), PARAMETROS, 'horizontal');
    const noComputador = planejarFolha(congruente(2), PARAMETROS, 'horizontal', true);

    expect({
      ...noComputador,
      largura: normal.largura,
      larguraRelativaA: normal.larguraRelativaA,
    }).toEqual(normal);
  });

  it('sorteia as três variações e espelha metade das vezes', () => {
    const aleatorio = congruente(9);
    const variacoes = new Set<string>();
    let espelhadas = 0;
    const total = 600;
    for (let i = 0; i < total; i += 1) {
      const folha = planejarFolha(aleatorio, PARAMETROS, 'vertical');
      variacoes.add(folha.variacao);
      if (folha.espelhada) espelhadas += 1;
    }

    expect(variacoes).toEqual(new Set(['a', 'b', 'c']));
    expect(espelhadas / total).toBeGreaterThan(0.4);
    expect(espelhadas / total).toBeLessThan(0.6);
  });
});
