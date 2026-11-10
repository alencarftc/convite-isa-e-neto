import { describe, expect, it } from 'vitest';

import { type RegiaoDeOndulacao, validarRegiao } from './regioes';

describe('validarRegiao (SPEC-19, RF-19.4)', () => {
  it('aceita a faixa do lago: início 0,45 e borda 0,06 (CT-19.2)', () => {
    const faixa: RegiaoDeOndulacao = { tipo: 'faixa', inicio: 0.45, borda: 0.06 };

    expect(validarRegiao(faixa)).toBe(faixa);
  });

  it('aceita as elipses do vento do casal', () => {
    const cabelo: RegiaoDeOndulacao = {
      tipo: 'elipse',
      centro: [0.62, 0.32],
      raio: [0.12, 0.2],
      borda: 0.5,
      intensidade: 1,
    };

    expect(validarRegiao(cabelo)).toBe(cabelo);
  });

  it('recusa valores fora de 0..1 na faixa (CT-19.2)', () => {
    expect(() => validarRegiao({ tipo: 'faixa', inicio: 1.2, borda: 0.05 })).toThrow(RangeError);
    expect(() => validarRegiao({ tipo: 'faixa', inicio: 0.5, borda: -0.1 })).toThrow(RangeError);
    expect(() => validarRegiao({ tipo: 'faixa', inicio: Number.NaN, borda: 0 })).toThrow(
      RangeError,
    );
  });

  it('recusa valores fora de 0..1 na elipse, em qualquer campo', () => {
    const boa = {
      tipo: 'elipse',
      centro: [0.5, 0.5],
      raio: [0.2, 0.2],
      borda: 0.5,
      intensidade: 1,
    } as const;

    expect(() => validarRegiao({ ...boa, centro: [1.5, 0.5] })).toThrow(RangeError);
    expect(() => validarRegiao({ ...boa, centro: [0.5, -0.5] })).toThrow(RangeError);
    expect(() => validarRegiao({ ...boa, raio: [2, 0.2] })).toThrow(RangeError);
    expect(() => validarRegiao({ ...boa, borda: 2 })).toThrow(RangeError);
    expect(() => validarRegiao({ ...boa, intensidade: 3 })).toThrow(RangeError);
  });

  it('recusa elipse sem raio: não haveria o que mexer', () => {
    expect(() =>
      validarRegiao({
        tipo: 'elipse',
        centro: [0.5, 0.5],
        raio: [0, 0.2],
        borda: 0.5,
        intensidade: 1,
      }),
    ).toThrow(RangeError);
  });
});
