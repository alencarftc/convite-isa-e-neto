import { describe, expect, it } from 'vitest';

import { ajusteDeCobertura } from './enquadramento';

describe('ajusteDeCobertura (SPEC-19, RF-19.3)', () => {
  it('imagem 16:9 numa caixa 9:16 com cover: só parte da largura aparece, centrada (CT-19.1)', () => {
    const { escala, deslocamento } = ajusteDeCobertura({
      imagem: { largura: 1600, altura: 900 },
      caixa: { largura: 450, altura: 800 },
    });

    expect(escala[0]).toBeCloseTo(450 / 1422.22, 3); // 450 px de uma imagem que ocupa 1422 px na altura da caixa
    expect(escala[0]).toBeLessThan(1);
    expect(escala[1]).toBe(1);
    expect(deslocamento[0]).toBeCloseTo((1 - escala[0]) / 2);
    expect(deslocamento[1]).toBe(0);
  });

  it('imagem do mesmo tamanho (ou da mesma proporção) que a caixa: escala 1 e deslocamento 0 (CT-19.1)', () => {
    expect(
      ajusteDeCobertura({
        imagem: { largura: 800, altura: 600 },
        caixa: { largura: 400, altura: 300 },
      }),
    ).toEqual({ escala: [1, 1], deslocamento: [0, 0] });
  });

  it('imagem larga numa caixa baixa corta em cima e embaixo', () => {
    const { escala, deslocamento } = ajusteDeCobertura({
      imagem: { largura: 1000, altura: 1000 },
      caixa: { largura: 500, altura: 100 },
    });

    expect(escala[0]).toBe(1);
    expect(escala[1]).toBeCloseTo(0.2);
    expect(deslocamento[1]).toBeCloseTo(0.4);
  });

  it('a posição desloca o recorte: 0 mostra o começo da imagem e 1 o fim', () => {
    const opcoes = {
      imagem: { largura: 1600, altura: 900 },
      caixa: { largura: 450, altura: 800 },
    };

    const esquerda = ajusteDeCobertura({ ...opcoes, posicao: [0, 0.5] });
    const direita = ajusteDeCobertura({ ...opcoes, posicao: [1, 0.5] });

    expect(esquerda.deslocamento[0]).toBe(0);
    expect(direita.deslocamento[0] + direita.escala[0]).toBeCloseTo(1);
  });

  it('contain: a imagem cabe inteira e as faixas de fora ficam além de 0..1 (CT-19.1)', () => {
    const { escala, deslocamento } = ajusteDeCobertura({
      imagem: { largura: 520, altura: 400 },
      caixa: { largura: 520, altura: 800 },
      ajuste: 'contain',
    });

    expect(escala[0]).toBe(1);
    expect(escala[1]).toBeCloseTo(2);
    expect(deslocamento[1]).toBeCloseTo(-0.5);
    // O centro da caixa lê o centro da textura; o topo da caixa, acima dela (fora de 0..1).
    expect(0.5 * escala[1] + deslocamento[1]).toBeCloseTo(0.5);
    expect(0 * escala[1] + deslocamento[1]).toBeLessThan(0);
    expect(1 * escala[1] + deslocamento[1]).toBeGreaterThan(1);
  });

  it('recusa imagem ou caixa sem tamanho', () => {
    expect(() =>
      ajusteDeCobertura({
        imagem: { largura: 0, altura: 10 },
        caixa: { largura: 10, altura: 10 },
      }),
    ).toThrow(RangeError);
    expect(() =>
      ajusteDeCobertura({
        imagem: { largura: 10, altura: 10 },
        caixa: { largura: 10, altura: 0 },
      }),
    ).toThrow(RangeError);
  });
});
