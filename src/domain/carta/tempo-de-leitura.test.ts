import { describe, expect, it } from 'vitest';

import { type ParametrosDeLeitura, tempoDeLeitura } from './tempo-de-leitura';

const parametros: ParametrosDeLeitura = { base: 0.5, porCaractere: 0.02, maximo: 3 };

describe('tempoDeLeitura (ADR-0012)', () => {
  it('um bloco sem texto (ornamento) ainda ganha a pausa mínima', () => {
    expect(tempoDeLeitura(0, parametros)).toBe(0.5);
  });

  it('cresce com o tamanho do texto', () => {
    expect(tempoDeLeitura(50, parametros)).toBeCloseTo(1.5);
    expect(tempoDeLeitura(100, parametros)).toBeCloseTo(2.5);
    expect(tempoDeLeitura(100, parametros)).toBeGreaterThan(tempoDeLeitura(50, parametros));
  });

  it('para no teto: um parágrafo longo não segura a carta', () => {
    expect(tempoDeLeitura(250, parametros)).toBe(3);
    expect(tempoDeLeitura(10_000, parametros)).toBe(3);
  });

  it('número de caracteres inválido é erro, não um tempo qualquer', () => {
    expect(() => tempoDeLeitura(-1, parametros)).toThrow(RangeError);
    expect(() => tempoDeLeitura(Number.NaN, parametros)).toThrow(RangeError);
  });
});
