import { describe, expect, it } from 'vitest';

import { ajusteDeCobertura, elipseDaImagemParaACaixa } from './enquadramento';

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

describe('âncora pela base e elipse da imagem para a caixa (09/11/2026)', () => {
  const pintura = { largura: 1672, altura: 941 };

  it('numa janela larga e baixa a pintura é ancorada pela base: corta o alto, nunca o gramado', () => {
    // 1600 × 500: a pintura cobre pela largura (altura de 900 px) e a caixa mostra só 500 px dela.
    const ajuste = ajusteDeCobertura({
      imagem: pintura,
      caixa: { largura: 1600, altura: 500 },
      posicao: [0.5, 1],
    });

    expect(ajuste.escala[0]).toBe(1);
    expect(ajuste.escala[1]).toBeCloseTo(500 / ((1600 / 1672) * 941), 4); // uns 55% da altura da pintura
    // Ancorada na base: o deslocamento leva o que sobra todo para cima, e a última linha da caixa é a última da pintura.
    expect(ajuste.deslocamento[1]).toBeCloseTo(1 - ajuste.escala[1], 6);
    expect(ajuste.deslocamento[1] + ajuste.escala[1]).toBeCloseTo(1, 6);
    // Centrada (o padrão), a mesma caixa cortaria o gramado embaixo.
    const centrada = ajusteDeCobertura({ imagem: pintura, caixa: { largura: 1600, altura: 500 } });
    expect(centrada.deslocamento[1] + centrada.escala[1]).toBeLessThan(1);
  });

  it('numa janela de pé corta as laterais, centrada, e a base continua alinhada', () => {
    const ajuste = ajusteDeCobertura({
      imagem: pintura,
      caixa: { largura: 600, altura: 900 },
      posicao: [0.5, 1],
    });

    expect(ajuste.escala[1]).toBe(1);
    expect(ajuste.deslocamento[0]).toBeCloseTo((1 - ajuste.escala[0]) / 2, 6);
    expect(ajuste.deslocamento[1]).toBe(0);
  });

  it('a elipse da imagem vira a da caixa: com a caixa igual à imagem não muda, e numa caixa cortada acompanha o recorte', () => {
    const elipse = { centro: [0.6, 0.565] as const, raio: [0.33, 0.07] as const };
    const igual = ajusteDeCobertura({ imagem: pintura, caixa: pintura, posicao: [0.5, 1] });

    expect(elipseDaImagemParaACaixa(elipse, igual)).toEqual({
      centro: [0.6, 0.565],
      raio: [0.33, 0.07],
    });

    // Janela baixa, ancorada na base: a caixa mostra só os 55% de baixo da pintura. O lago (a 56,5% da altura da imagem)
    // cai perto do alto da caixa e o raio vertical cresce na razão do recorte.
    const baixa = ajusteDeCobertura({
      imagem: pintura,
      caixa: { largura: 1600, altura: 500 },
      posicao: [0.5, 1],
    });
    const naCaixa = elipseDaImagemParaACaixa(elipse, baixa);
    expect(naCaixa.centro[0]).toBeCloseTo(0.6, 6);
    expect(naCaixa.centro[1]).toBeCloseTo((0.565 - baixa.deslocamento[1]) / baixa.escala[1], 6);
    expect(naCaixa.centro[1]).toBeGreaterThan(0);
    expect(naCaixa.centro[1]).toBeLessThan(0.3); // no terço de cima da caixa, não sobre o gramado de baixo
    expect(naCaixa.raio[1]).toBeCloseTo(0.07 / baixa.escala[1], 6);
  });
});
