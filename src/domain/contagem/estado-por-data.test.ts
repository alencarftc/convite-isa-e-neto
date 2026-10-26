import { describe, expect, it } from 'vitest';

import { analisarInstante } from '../tempo/tempo';
import { calcularEstadoPorData } from './estado-por-data';

const datas = {
  casamento: analisarInstante('2027-01-22T17:00:00-03:00'),
  prazoConfirmacao: analisarInstante('2026-12-31T23:59:59-03:00'),
};

const estadoEm = (iso: string) => calcularEstadoPorData(analisarInstante(iso), datas);

// CT-07.7 (SPEC-07): as cinco datas de borda e os quatro estados.
describe('calcularEstadoPorData', () => {
  it('no último minuto do prazo ainda é "antes do prazo"', () => {
    expect(estadoEm('2026-12-31T23:59:00-03:00')).toBe('antes-do-prazo');
  });

  it('na virada do prazo passa a "depois do prazo"', () => {
    expect(estadoEm('2027-01-01T00:00:00-03:00')).toBe('depois-do-prazo');
  });

  it('o dia do casamento é "no dia" desde a meia-noite, mesmo depois das 17h', () => {
    expect(estadoEm('2027-01-22T00:00:00-03:00')).toBe('no-dia');
    expect(estadoEm('2027-01-22T10:00:00-03:00')).toBe('no-dia');
    expect(estadoEm('2027-01-22T20:00:00-03:00')).toBe('no-dia');
  });

  it('a partir de 23/01 à meia-noite é "depois"', () => {
    expect(estadoEm('2027-01-23T00:00:00-03:00')).toBe('depois');
  });

  it('não depende do fuso em que o instante é escrito', () => {
    // 2027-01-23T02:00Z ainda é 22/01 em Brasília.
    expect(estadoEm('2027-01-23T02:00:00Z')).toBe('no-dia');
  });

  it('em 21/01 à noite ainda é "depois do prazo", nunca "no dia"', () => {
    expect(estadoEm('2027-01-21T23:59:00-03:00')).toBe('depois-do-prazo');
  });
});
