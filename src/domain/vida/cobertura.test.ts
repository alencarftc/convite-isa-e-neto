import { describe, expect, it } from 'vitest';

import { cartaCobreALargura, fracaoVisivelDaCena } from './cobertura';

describe('fracaoVisivelDaCena (SPEC-18, RF-18.4)', () => {
  it('topo do conteúdo em 52% da janela: a cena aparece em 52% (CT-18.3)', () => {
    expect(fracaoVisivelDaCena(416, 800)).toBeCloseTo(0.52);
  });

  it('topo do conteúdo em 10% da janela: 10% (CT-18.3)', () => {
    expect(fracaoVisivelDaCena(80, 800)).toBeCloseTo(0.1);
  });

  it('topo acima da janela: nada da cena aparece (CT-18.3)', () => {
    expect(fracaoVisivelDaCena(-120, 800)).toBe(0);
  });

  it('topo abaixo da janela: a cena inteira aparece', () => {
    expect(fracaoVisivelDaCena(1200, 800)).toBe(1);
  });

  it('janela sem altura não é motivo para pausar', () => {
    expect(fracaoVisivelDaCena(0, 0)).toBe(1);
  });
});

describe('cartaCobreALargura', () => {
  it('no celular a carta ocupa quase a largura toda e esconde a cena', () => {
    expect(cartaCobreALargura(345, 375, 0.8)).toBe(true);
  });

  it('no computador a carta é uma coluna: o lago continua à vista dos lados', () => {
    expect(cartaCobreALargura(560, 1366, 0.8)).toBe(false);
  });

  it('janela sem largura não é motivo para manter a cena viva', () => {
    expect(cartaCobreALargura(0, 0, 0.8)).toBe(true);
  });
});
