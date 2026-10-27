import { describe, expect, it } from 'vitest';

import { type ParametrosDoEsquilo, planejarVisita, visitaPermitida } from './esquilo';
import type { Aleatorio } from './sorteio';

const PARAMETROS: ParametrosDoEsquilo = {
  primeiroEm: 6,
  intervalo: [20, 35],
  largura: { vertical: 0.07, horizontal: 0.035 },
  chao: { vertical: 0.12, horizontal: 0.09 },
  pulos: [3, 6],
  pulo: {
    distancia: [0.04, 0.06],
    altura: [12, 18],
    voo: 0.28,
    pouso: 0.08,
    achatamento: 0.92,
    respiro: [0.05, 0.2],
  },
  folgaDoBau: 0.1,
  parada: [1.2, 2.4],
  sacudidasDoRabo: 2,
  inclinacaoDaSacudida: 3,
};

function congruente(semente: number): Aleatorio {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

const soma = (pulos: readonly { distancia: number }[]) =>
  pulos.reduce((total, pulo) => total + pulo.distancia, 0);

/** O cenário do CT-21.1: tela de 390 px e o baú entre 120 e 270 px. */
const CELULAR = { larguraDaTela: 390, bau: { esquerda: 120, direita: 270 } };

describe('planejarVisita (SPEC-21)', () => {
  it('em 390 px com o baú entre 120 e 270 px, a parada deixa 39 px de folga do baú, de 3 a 6 pulos de 4% a 6% (CT-21.1)', () => {
    const aleatorio = congruente(13);
    for (let i = 0; i < 300; i += 1) {
      const visita = planejarVisita(aleatorio, PARAMETROS, CELULAR);
      if (!visita) throw new Error('a visita devia caber');
      const andado = soma(visita.pulosDeIda);
      // Ele parte encostado na borda, inteiro fora da tela: o lado voltado para o baú para a 39 px dele.
      if (visita.lado === 'esquerda') expect(andado).toBeLessThanOrEqual(120 - 39 + 1e-9);
      else expect(390 - andado).toBeGreaterThanOrEqual(270 + 39 - 1e-9);
      expect(andado).toBeGreaterThan(0);
      expect(visita.pulosDeIda.length).toBeGreaterThanOrEqual(3);
      expect(visita.pulosDeIda.length).toBeLessThanOrEqual(6);
      for (const pulo of [...visita.pulosDeIda, ...visita.pulosDeVolta]) {
        expect(pulo.distancia).toBeGreaterThanOrEqual(0.04 * 390 - 1e-9);
        expect(pulo.distancia).toBeLessThanOrEqual(0.06 * 390 + 1e-9);
        expect(pulo.altura).toBeGreaterThanOrEqual(12);
        expect(pulo.altura).toBeLessThanOrEqual(18);
        expect(pulo.respiro).toBeGreaterThanOrEqual(0.05);
        expect(pulo.respiro).toBeLessThanOrEqual(0.2);
      }
    }
  });

  it('a volta cobre tudo o que foi andado, até sair da tela pelo mesmo lado', () => {
    const aleatorio = congruente(21);
    for (let i = 0; i < 100; i += 1) {
      const visita = planejarVisita(aleatorio, PARAMETROS, CELULAR);
      if (!visita) throw new Error('a visita devia caber');

      expect(soma(visita.pulosDeVolta)).toBeGreaterThanOrEqual(soma(visita.pulosDeIda));
    }
  });

  it('para de 1,2 a 2,4 s e se vira duas vezes (para o outro lado e de volta)', () => {
    const visita = planejarVisita(congruente(2), PARAMETROS, CELULAR);

    expect(visita?.parada).toBeGreaterThanOrEqual(1.2);
    expect(visita?.parada).toBeLessThanOrEqual(2.4);
    expect(visita?.olhadas).toBe(2);
  });

  it('sorteia os dois lados', () => {
    const aleatorio = congruente(5);
    const lados = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      const visita = planejarVisita(aleatorio, PARAMETROS, CELULAR);
      if (visita) lados.add(visita.lado);
    }

    expect(lados).toEqual(new Set(['esquerda', 'direita']));
  });

  it('sem espaço para dois pulos entre a borda e a folga do baú, cancela a visita (CT-21.2)', () => {
    // Tela de 320 px: a folga é 32 px e cada lado fica com 18 px, menos que dois pulos de 4% (2 × 12,8 px).
    const apertada = {
      larguraDaTela: 320,
      bau: { esquerda: 50, direita: 270 },
    };

    expect(planejarVisita(congruente(1), PARAMETROS, apertada)).toBeNull();
  });

  it('se só um lado tem espaço, a visita vem por ele', () => {
    // O baú encostado na direita: sobra espaço só à esquerda.
    const cenario = {
      larguraDaTela: 390,
      bau: { esquerda: 200, direita: 380 },
    };
    const aleatorio = congruente(8);
    for (let i = 0; i < 50; i += 1) {
      expect(planejarVisita(aleatorio, PARAMETROS, cenario)?.lado).toBe('esquerda');
    }
  });
});

describe('visitaPermitida (SPEC-21, CA-13.4.3)', () => {
  it('há visitas da entrada até a história', () => {
    for (const fase of [
      'carregando',
      'aguardando-entrada',
      'bosque',
      'aguardando-bau',
      'bau',
      'historia',
    ] as const) {
      expect(visitaPermitida(fase), fase).toBe(true);
    }
  });

  it('quando o envelope pousa (fase carta) e depois, não há mais', () => {
    for (const fase of [
      'carta',
      'aguardando-selo',
      'convite',
      'informacoes',
      'seguranca',
    ] as const) {
      expect(visitaPermitida(fase), fase).toBe(false);
    }
  });
});
