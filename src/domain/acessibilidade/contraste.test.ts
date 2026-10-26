import { describe, expect, it } from 'vitest';

import { razaoDeContraste } from './contraste';

describe('razaoDeContraste (WCAG)', () => {
  it('preto sobre branco é 21:1 e a razão é simétrica', () => {
    expect(razaoDeContraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(razaoDeContraste('#ffffff', '#000000')).toBeCloseTo(21, 5);
  });

  it('a mesma cor tem razão 1', () => {
    expect(razaoDeContraste('#32425d', '#32425d')).toBeCloseTo(1, 5);
  });

  it('o azul-noite sobre marfim da paleta tem cerca de 9,1:1 (SPEC-01)', () => {
    expect(razaoDeContraste('#32425d', '#f6f3e0')).toBeCloseTo(9.1, 0);
  });

  it('aceita maiúsculas e rejeita cor mal escrita', () => {
    expect(razaoDeContraste('#32425D', '#F6F3E0')).toBeCloseTo(9.1, 0);
    expect(() => razaoDeContraste('azul', '#ffffff')).toThrow(RangeError);
    expect(() => razaoDeContraste('#fff', '#000000')).toThrow(RangeError);
  });
});
