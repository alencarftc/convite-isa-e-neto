import { describe, expect, it } from 'vitest';

import { deslocamentoPorPonteiro } from './deslocamento';

describe('deslocamentoPorPonteiro', () => {
  it('no centro da tela a camada fica parada', () => {
    expect(deslocamentoPorPonteiro(500, 1000, 24, 1)).toBe(0);
  });

  it('nos cantos, a camada anda o máximo no sentido oposto ao do ponteiro (CT-03.2)', () => {
    expect(deslocamentoPorPonteiro(0, 1000, 24, 1)).toBe(24);
    expect(deslocamentoPorPonteiro(1000, 1000, 24, 1)).toBe(-24);
  });

  it('a profundidade multiplica o deslocamento: as rosas se movem mais que o céu', () => {
    const ceu = deslocamentoPorPonteiro(0, 1000, 24, 0.15);
    const rosas = deslocamentoPorPonteiro(0, 1000, 24, 1);

    expect(ceu).toBeCloseTo(3.6);
    expect(rosas).toBe(24);
    expect(rosas).toBeGreaterThan(ceu);
  });

  it('o ponteiro fora da janela não passa do máximo', () => {
    expect(deslocamentoPorPonteiro(-300, 1000, 12, 0.6)).toBeCloseTo(7.2);
    expect(deslocamentoPorPonteiro(1700, 1000, 12, 0.6)).toBeCloseTo(-7.2);
  });

  it('janela sem tamanho não desloca nada', () => {
    expect(deslocamentoPorPonteiro(10, 0, 24, 1)).toBe(0);
  });
});
