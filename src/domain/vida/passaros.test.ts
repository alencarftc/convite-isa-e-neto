import { describe, expect, it } from 'vitest';

import { type ParametrosDePassaros, planejarBando } from './passaros';
import type { Aleatorio } from './sorteio';

const PARAMETROS: ParametrosDePassaros = {
  intervalo: [12, 25],
  tamanhoDoBando: [2, 5],
  desvio: { x: 40, y: 24 },
  faixa: [0.08, 0.3],
  travessia: [9, 14],
  ondulacao: { amplitude: 10, ciclos: [2, 3] },
  asas: { periodo: [0.35, 0.5], escalaMinima: -0.55 },
  planar: { chance: 0.3, duracao: 1.2, escala: 0.6 },
  largura: [10, 18],
};

function congruente(semente: number): Aleatorio {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

describe('planejarBando (SPEC-20, "Pássaros")', () => {
  it('tem de 2 a 5 pássaros, voa entre 8% e 30% da altura e atravessa em 9 a 14 s (CT-20.2)', () => {
    const aleatorio = congruente(1);
    const tamanhos = new Set<number>();
    for (let i = 0; i < 300; i += 1) {
      const bando = planejarBando(aleatorio, PARAMETROS);

      expect(bando.passaros.length).toBeGreaterThanOrEqual(2);
      expect(bando.passaros.length).toBeLessThanOrEqual(5);
      expect(bando.faixa).toBeGreaterThanOrEqual(0.08);
      expect(bando.faixa).toBeLessThanOrEqual(0.3);
      expect(bando.duracao).toBeGreaterThanOrEqual(9);
      expect(bando.duracao).toBeLessThanOrEqual(14);
      tamanhos.add(bando.passaros.length);
    }
    expect(tamanhos).toEqual(new Set([2, 3, 4, 5]));
  });

  it('entra por um lado e sai pelo oposto (CT-20.2)', () => {
    const aleatorio = congruente(2);
    const entradas = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      const bando = planejarBando(aleatorio, PARAMETROS);

      expect(bando.sai).not.toBe(bando.entra);
      entradas.add(bando.entra);
    }
    expect(entradas).toEqual(new Set(['esquerda', 'direita']));
  });

  it('cada pássaro tem de 10 a 18 px, bate as asas em 0,35 a 0,5 s e fica perto do líder', () => {
    const aleatorio = congruente(4);
    for (let i = 0; i < 200; i += 1) {
      for (const passaro of planejarBando(aleatorio, PARAMETROS).passaros) {
        expect(passaro.largura).toBeGreaterThanOrEqual(10);
        expect(passaro.largura).toBeLessThanOrEqual(18);
        expect(passaro.periodo).toBeGreaterThanOrEqual(0.35);
        expect(passaro.periodo).toBeLessThanOrEqual(0.5);
        expect(passaro.fase).toBeGreaterThanOrEqual(0);
        expect(passaro.fase).toBeLessThan(1);
        expect(Math.abs(passaro.desvio.x)).toBeLessThanOrEqual(40);
        expect(Math.abs(passaro.desvio.y)).toBeLessThanOrEqual(24 * 1.5);
      }
    }
  });

  it('os pássaros não batem as asas todos juntos', () => {
    const bando = planejarBando(congruente(8), PARAMETROS);

    expect(new Set(bando.passaros.map((passaro) => passaro.fase)).size).toBe(bando.passaros.length);
  });

  it('os menores parecem mais longe: um pouco mais lentos e mais altos que os maiores', () => {
    const aleatorio = congruente(6);
    const passaros = Array.from({ length: 400 }, () =>
      planejarBando(aleatorio, PARAMETROS),
    ).flatMap((bando) =>
      bando.passaros.map((passaro) => ({ ...passaro, travessia: bando.duracao })),
    );
    const menores = passaros.filter((passaro) => passaro.largura < 12);
    const maiores = passaros.filter((passaro) => passaro.largura > 16);
    const media = (lista: typeof passaros, valor: (p: (typeof passaros)[number]) => number) =>
      lista.reduce((soma, passaro) => soma + valor(passaro), 0) / lista.length;

    expect(media(menores, (p) => p.duracao / p.travessia)).toBeGreaterThan(
      media(maiores, (p) => p.duracao / p.travessia),
    );
    expect(media(menores, (p) => p.desvio.y)).toBeLessThan(media(maiores, (p) => p.desvio.y));
    for (const passaro of passaros) {
      expect(passaro.duracao / passaro.travessia).toBeLessThanOrEqual(1.15 + 1e-9);
    }
  });

  it('cerca de 30% dos bandos planam e a ondulação tem 2 ou 3 ciclos', () => {
    const aleatorio = congruente(10);
    const total = 1000;
    let planam = 0;
    const ciclos = new Set<number>();
    for (let i = 0; i < total; i += 1) {
      const bando = planejarBando(aleatorio, PARAMETROS);
      if (bando.planar) planam += 1;
      ciclos.add(bando.ondulacao.ciclos);
      expect(bando.ondulacao.amplitude).toBe(10);
    }

    expect(planam / total).toBeGreaterThan(0.25);
    expect(planam / total).toBeLessThan(0.35);
    expect(ciclos).toEqual(new Set([2, 3]));
  });
});
