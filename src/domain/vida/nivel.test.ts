import { describe, expect, it } from 'vitest';

import { avaliarQuadros, escolherNivel } from './nivel';

const LIMITES = { quadroLento: 0.025, fracaoDeQuadrosLentos: 0.5 };

describe('escolherNivel (SPEC-18, "Níveis")', () => {
  it('animação reduzida desliga a cena viva (CT-18.1)', () => {
    expect(
      escolherNivel({ reduzido: true, pausadoPeloConvidado: false, aparelhoModesto: false }),
    ).toBe('desligado');
  });

  it('"Pausar animação" escolhido antes também desliga (CT-18.1)', () => {
    expect(
      escolherNivel({ reduzido: false, pausadoPeloConvidado: true, aparelhoModesto: false }),
    ).toBe('desligado');
  });

  it('desligar vale mesmo num aparelho modesto', () => {
    expect(
      escolherNivel({ reduzido: true, pausadoPeloConvidado: true, aparelhoModesto: true }),
    ).toBe('desligado');
  });

  it('aparelho modesto roda o nível leve (CT-18.1)', () => {
    expect(
      escolherNivel({ reduzido: false, pausadoPeloConvidado: false, aparelhoModesto: true }),
    ).toBe('leve');
  });

  it('o resto roda completo (CT-18.1)', () => {
    expect(
      escolherNivel({ reduzido: false, pausadoPeloConvidado: false, aparelhoModesto: false }),
    ).toBe('completo');
  });
});

describe('avaliarQuadros (SPEC-18, "Medição de quadros")', () => {
  it('60% dos quadros acima de 25 ms: rebaixa (CT-18.2)', () => {
    const intervalos = [0.04, 0.04, 0.04, 0.016, 0.016];

    expect(avaliarQuadros(intervalos, LIMITES)).toBe('rebaixar');
  });

  it('40% dos quadros lentos: mantém (CT-18.2)', () => {
    const intervalos = [0.04, 0.04, 0.016, 0.016, 0.016];

    expect(avaliarQuadros(intervalos, LIMITES)).toBe('manter');
  });

  it('metade exata ainda mantém: é "mais da metade" que rebaixa', () => {
    expect(avaliarQuadros([0.04, 0.016], LIMITES)).toBe('manter');
  });

  it('um quadro de exatamente 25 ms não é lento', () => {
    expect(avaliarQuadros([0.025, 0.025, 0.025], LIMITES)).toBe('manter');
  });

  it('sem quadros medidos, mantém (CT-18.2)', () => {
    expect(avaliarQuadros([], LIMITES)).toBe('manter');
  });
});
