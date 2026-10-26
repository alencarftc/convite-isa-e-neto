import { describe, expect, it } from 'vitest';

import {
  analisarInstante,
  diaEmBrasilia,
  MS_POR_DIA,
  MS_POR_HORA,
  MS_POR_MINUTO,
  msAteProximoMinuto,
} from './tempo';

describe('analisarInstante', () => {
  it('converte data com fuso explícito em ms', () => {
    expect(analisarInstante('2027-01-22T17:00:00-03:00')).toBe(Date.UTC(2027, 0, 22, 20, 0, 0));
    expect(analisarInstante('2027-01-22T20:00:00Z')).toBe(Date.UTC(2027, 0, 22, 20, 0, 0));
  });

  it('rejeita data sem fuso, para não depender do aparelho', () => {
    expect(() => analisarInstante('2027-01-22T17:00:00')).toThrow(/sem fuso/);
  });

  it('rejeita data inexistente', () => {
    expect(() => analisarInstante('2027-13-45T99:00:00-03:00')).toThrow(/inválida/);
  });
});

describe('diaEmBrasilia', () => {
  it('usa o dia civil de UTC−3, não o de UTC', () => {
    // 01:30 UTC de 23/01 ainda é 22:30 de 22/01 em Brasília.
    expect(diaEmBrasilia(Date.UTC(2027, 0, 23, 1, 30))).toBe('2027-01-22');
  });

  it('vira o dia à meia-noite de Brasília', () => {
    expect(diaEmBrasilia(analisarInstante('2027-01-21T23:59:59-03:00'))).toBe('2027-01-21');
    expect(diaEmBrasilia(analisarInstante('2027-01-22T00:00:00-03:00'))).toBe('2027-01-22');
  });
});

describe('msAteProximoMinuto', () => {
  it('devolve o tempo restante do minuto corrente', () => {
    expect(msAteProximoMinuto(10 * MS_POR_MINUTO + 15_000)).toBe(45_000);
  });

  it('devolve um minuto inteiro quando está exatamente na virada', () => {
    expect(msAteProximoMinuto(10 * MS_POR_MINUTO)).toBe(MS_POR_MINUTO);
  });
});

describe('constantes', () => {
  it('são coerentes entre si', () => {
    expect(MS_POR_HORA).toBe(60 * MS_POR_MINUTO);
    expect(MS_POR_DIA).toBe(24 * MS_POR_HORA);
  });
});
