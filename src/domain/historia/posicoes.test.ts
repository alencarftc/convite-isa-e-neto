import { describe, expect, it } from 'vitest';

import { posicoesDoBalao } from './posicoes';

const base = { fracaoDaSaida: 0.62, fracaoDaLeitura: 0.08, margem: 16 };

describe('posicoesDoBalao', () => {
  it('em tela alta, o balão sai até 62% da altura (de baixo para cima) e sobe mais 8% na leitura', () => {
    const p = posicoesDoBalao({ ...base, alturaDaTela: 800, alturaDoBalao: 200 });

    expect(p.saida).toBeCloseTo(800 * 0.38); // 62% de baixo para cima = 38% do topo
    expect(p.leitura).toBeCloseTo(800 * 0.38 - 800 * 0.08);
  });

  it('o balão sai da tela pelo alto, com a altura inteira dele', () => {
    const p = posicoesDoBalao({ ...base, alturaDaTela: 800, alturaDoBalao: 200 });

    expect(p.fora).toBe(-200);
  });

  it('em tela baixa, o topo do balão nunca passa da margem durante a leitura (celular deitado)', () => {
    const alturaDoBalao = 180;
    const p = posicoesDoBalao({ ...base, alturaDaTela: 360, alturaDoBalao });

    expect(p.leitura - alturaDoBalao / 2).toBeGreaterThanOrEqual(base.margem);
  });

  it('em tela baixa, a subida da leitura continua valendo 8% da altura', () => {
    const p = posicoesDoBalao({ ...base, alturaDaTela: 360, alturaDoBalao: 180 });

    expect(p.saida - p.leitura).toBeCloseTo(360 * 0.08);
  });

  it('com espaço de sobra, a margem não interfere', () => {
    const livre = posicoesDoBalao({ ...base, margem: 0, alturaDaTela: 1000, alturaDoBalao: 100 });
    const comMargem = posicoesDoBalao({
      ...base,
      margem: 16,
      alturaDaTela: 1000,
      alturaDoBalao: 100,
    });

    expect(comMargem).toEqual(livre);
  });
});
