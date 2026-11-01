import { describe, expect, it } from 'vitest';

import {
  type ParametrosDoEsquilo,
  type PassoDoEsquilo,
  planejarVisita,
  type PuloDoEsquilo,
} from './esquilo';
import type { Aleatorio } from './sorteio';

const PARAMETROS: ParametrosDoEsquilo = {
  primeiroEm: 6,
  intervalo: [12, 28],
  largura: { vertical: 0.17, horizontal: 0.04 },
  chao: { vertical: 0.22, horizontal: 0.16 },
  paradas: [1, 3],
  centro: [0.3, 0.7],
  pulo: {
    distancia: [0.06, 0.09],
    altura: [12, 18],
    voo: 0.28,
    pouso: 0.08,
    achatamento: 0.92,
    respiro: [0.05, 0.25],
  },
  corrida: { distancia: [0.1, 0.15], altura: [6, 10], voo: 0.18, respiro: [0, 0.04] },
  chanceDeCorrida: 0.35,
  chanceDeEspiar: 0.15,
  chanceDeSairPeloOutroLado: 0.4,
  parada: [1, 2.8],
  sacudidasDoRabo: [0, 3],
  olhadas: [0, 2],
  inclinacaoDaSacudida: 3,
};

function congruente(semente: number): Aleatorio {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

/** Uma tela de celular de 390 px e um esquilo de 17%, como na vertical. */
const CELULAR = { larguraDaTela: 390, larguraDoEsquilo: 0.17 * 390 };

const ehPulo = (passo: PassoDoEsquilo): passo is PuloDoEsquilo => passo.tipo === 'pulo';

/** Percorre o plano e devolve a posição (borda esquerda do esquilo) depois de cada passo. */
function posicoes(
  lado: 'esquerda' | 'direita',
  passos: readonly PassoDoEsquilo[],
  cenario = CELULAR,
): number[] {
  let x = lado === 'esquerda' ? -cenario.larguraDoEsquilo : cenario.larguraDaTela;
  return passos.map((passo) => {
    if (passo.tipo === 'pulo') x += passo.sentido * passo.distancia;
    return x;
  });
}

describe('planejarVisita (SPEC-21)', () => {
  it('entra inteiro fora da tela, por um lado, e sai inteiro fora dela, pelo mesmo ou pelo outro', () => {
    const aleatorio = congruente(13);
    for (let i = 0; i < 300; i += 1) {
      const visita = planejarVisita(aleatorio, PARAMETROS, CELULAR);
      const fim = posicoes(visita.lado, visita.passos).at(-1) ?? Number.NaN;

      const esperado =
        visita.ladoDaSaida === 'esquerda' ? -CELULAR.larguraDoEsquilo : CELULAR.larguraDaTela;
      expect(fim).toBeCloseTo(esperado, 6);
      // O primeiro pulo parte da borda de entrada, para dentro da tela.
      const primeiro = visita.passos[0];
      expect(primeiro && ehPulo(primeiro) ? primeiro.sentido : 0).toBe(
        visita.lado === 'esquerda' ? 1 : -1,
      );
    }
  });

  it('as paradas ficam ao centro da tela: o centro do corpo cai entre 30% e 70% da largura (de 1 a 3 paradas)', () => {
    const aleatorio = congruente(21);
    const quantidades = new Set<number>();
    for (let i = 0; i < 400; i += 1) {
      const visita = planejarVisita(aleatorio, PARAMETROS, CELULAR);
      const pontos = posicoes(visita.lado, visita.passos);
      const paradas = visita.passos.flatMap((passo, indice) =>
        passo.tipo === 'parada' ? [pontos[indice] ?? Number.NaN] : [],
      );
      if (paradas.length === 0) throw new Error('toda visita tem pelo menos uma parada');
      quantidades.add(paradas.length);
      expect(paradas.length).toBeLessThanOrEqual(3);

      // Espiadas (uma parada, perto da borda) não passam do centro; as outras param todas ao centro.
      const espiada = paradas.length === 1 && (paradas[0] ?? 0) < 0.13 * 390 - 1;
      const espiadaDireita =
        paradas.length === 1 && (paradas[0] ?? 0) > 390 - 0.13 * 390 - CELULAR.larguraDoEsquilo;
      if (espiada || espiadaDireita) continue;
      for (const esquerda of paradas) {
        const centro = (esquerda + CELULAR.larguraDoEsquilo / 2) / 390;
        expect(centro).toBeGreaterThanOrEqual(0.3 - 1e-9);
        expect(centro).toBeLessThanOrEqual(0.7 + 1e-9);
      }
    }

    expect(quantidades).toEqual(new Set([1, 2, 3]));
  });

  it('os pulinhos e as corridas respeitam o estilo de cada um; o último pulo de um trecho cobre o que falta', () => {
    const aleatorio = congruente(5);
    let corridas = 0;
    let pulinhos = 0;
    for (let i = 0; i < 300; i += 1) {
      const visita = planejarVisita(aleatorio, PARAMETROS, CELULAR);
      for (const passo of visita.passos.filter(ehPulo)) {
        const estilo = passo.corrida ? PARAMETROS.corrida : PARAMETROS.pulo;
        if (passo.corrida) corridas += 1;
        else pulinhos += 1;
        // O último pulo de um trecho pode ser mais curto (cobre o que falta) ou mais longo (absorve uma sobra).
        expect(passo.distancia).toBeLessThanOrEqual(estilo.distancia[1] * 390 * 1.5 + 1e-9);
        expect(passo.distancia).toBeGreaterThan(0);
        expect(passo.altura).toBeGreaterThanOrEqual(estilo.altura[0]);
        expect(passo.altura).toBeLessThanOrEqual(estilo.altura[1]);
        expect(passo.voo).toBe(estilo.voo);
        expect(passo.respiro).toBeGreaterThanOrEqual(estilo.respiro[0]);
        expect(passo.respiro).toBeLessThanOrEqual(estilo.respiro[1]);
      }
    }

    expect(corridas).toBeGreaterThan(0);
    expect(pulinhos).toBeGreaterThan(corridas); // a corrida é a exceção (35% dos trechos)
  });

  it('cada parada dura de 1 a 2,8 s, sacode o rabo de 0 a 3 vezes e olha em volta de 0 a 2', () => {
    const aleatorio = congruente(2);
    const sacudidas = new Set<number>();
    const olhadas = new Set<number>();
    for (let i = 0; i < 300; i += 1) {
      for (const passo of planejarVisita(aleatorio, PARAMETROS, CELULAR).passos) {
        if (passo.tipo !== 'parada') continue;
        expect(passo.duracao).toBeGreaterThanOrEqual(1);
        expect(passo.duracao).toBeLessThanOrEqual(2.8);
        sacudidas.add(passo.sacudidas);
        olhadas.add(passo.olhadas);
      }
    }

    expect(sacudidas).toEqual(new Set([0, 1, 2, 3]));
    expect(olhadas).toEqual(new Set([0, 1, 2]));
  });

  it('é imprevisível: sorteia os dois lados de entrada e de saída, espiadas e travessias', () => {
    const aleatorio = congruente(8);
    const entradas = new Set<string>();
    const saidas = new Set<string>();
    let travessias = 0;
    let espiadas = 0;
    const formas = new Set<string>();
    for (let i = 0; i < 400; i += 1) {
      const visita = planejarVisita(aleatorio, PARAMETROS, CELULAR);
      entradas.add(visita.lado);
      saidas.add(visita.ladoDaSaida);
      if (visita.ladoDaSaida !== visita.lado) travessias += 1;
      const paradas = visita.passos.filter((passo) => passo.tipo === 'parada').length;
      if (paradas === 1 && visita.ladoDaSaida === visita.lado) {
        const pontos = posicoes(visita.lado, visita.passos);
        const quando = visita.passos.findIndex((passo) => passo.tipo === 'parada');
        const parada = pontos[quando] ?? 0;
        if (parada < 0.13 * 390 || parada > 390 - 0.13 * 390 - CELULAR.larguraDoEsquilo) {
          espiadas += 1;
        }
      }
      // p = pulinho, c = pulo de corrida, P = parada: o desenho da visita.
      formas.add(
        visita.passos
          .map((passo) => (passo.tipo === 'parada' ? 'P' : passo.corrida ? 'c' : 'p'))
          .join(''),
      );
    }

    expect(entradas).toEqual(new Set(['esquerda', 'direita']));
    expect(saidas).toEqual(new Set(['esquerda', 'direita']));
    expect(travessias).toBeGreaterThan(80); // cerca de 40% de 85% das visitas
    expect(espiadas).toBeGreaterThan(20); // cerca de 15% das visitas
    expect(formas.size).toBeGreaterThan(40); // quase nenhuma visita é igual à outra
  });

  it('a espiada mostra o esquilo perto da borda por onde entrou, e ele volta pelo mesmo lado', () => {
    const espiar: ParametrosDoEsquilo = { ...PARAMETROS, chanceDeEspiar: 1 };
    const aleatorio = congruente(3);
    for (let i = 0; i < 100; i += 1) {
      const visita = planejarVisita(aleatorio, espiar, CELULAR);
      const pontos = posicoes(visita.lado, visita.passos);
      const quando = visita.passos.findIndex((passo) => passo.tipo === 'parada');
      const parada = pontos[quando] ?? Number.NaN;

      expect(visita.ladoDaSaida).toBe(visita.lado);
      expect(visita.passos.filter((passo) => passo.tipo === 'parada')).toHaveLength(1);
      if (visita.lado === 'esquerda') {
        expect(parada).toBeGreaterThanOrEqual(0.02 * 390 - 1e-9);
        expect(parada).toBeLessThanOrEqual(0.12 * 390 + 1e-9);
      } else {
        expect(parada + CELULAR.larguraDoEsquilo).toBeLessThanOrEqual(390 - 0.02 * 390 + 1e-9);
        expect(parada + CELULAR.larguraDoEsquilo).toBeGreaterThanOrEqual(390 - 0.12 * 390 - 1e-9);
      }
    }
  });

  it('sem sorteio de outro lado e sem espiada, sai por onde entrou só quando o sorteio manda', () => {
    const sempreVoltar: ParametrosDoEsquilo = {
      ...PARAMETROS,
      chanceDeEspiar: 0,
      chanceDeSairPeloOutroLado: 0,
    };
    const sempreAtravessar: ParametrosDoEsquilo = {
      ...PARAMETROS,
      chanceDeEspiar: 0,
      chanceDeSairPeloOutroLado: 1,
    };
    const aleatorio = congruente(11);
    for (let i = 0; i < 50; i += 1) {
      const voltou = planejarVisita(aleatorio, sempreVoltar, CELULAR);
      const atravessou = planejarVisita(aleatorio, sempreAtravessar, CELULAR);

      expect(voltou.ladoDaSaida).toBe(voltou.lado);
      expect(atravessou.ladoDaSaida).not.toBe(atravessou.lado);
    }
  });

  it('a mesma sequência de sorteios dá o mesmo plano (o domínio não tem Math.random)', () => {
    const a = planejarVisita(congruente(77), PARAMETROS, CELULAR);
    const b = planejarVisita(congruente(77), PARAMETROS, CELULAR);

    expect(a).toEqual(b);
  });
});
