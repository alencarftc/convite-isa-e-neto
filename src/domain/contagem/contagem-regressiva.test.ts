import { describe, expect, it } from 'vitest';

import { analisarInstante } from '../tempo/tempo';
import { calcularContagem, formatarContagem, type UnidadesDeTempo } from './contagem-regressiva';

const casamento = analisarInstante('2027-01-22T17:00:00-03:00');

const unidades: UnidadesDeTempo = {
  dia: ['dia', 'dias'],
  hora: ['hora', 'horas'],
  minuto: ['minuto', 'minutos'],
};
const modelo = 'Faltam {dias}, {horas} e {minutos} para o nosso sim';

describe('calcularContagem', () => {
  // CT-07.1
  it('conta 68 dias e 7 horas de 15/11/2026 10:00 até o casamento', () => {
    const agora = analisarInstante('2026-11-15T10:00:00-03:00');
    expect(calcularContagem(agora, casamento)).toEqual({ dias: 68, horas: 7, minutos: 0 });
  });

  // CT-07.3
  it('conta 1 dia, 0 horas e 1 minuto às 16:59 do dia anterior', () => {
    const agora = analisarInstante('2027-01-21T16:59:00-03:00');
    expect(calcularContagem(agora, casamento)).toEqual({ dias: 1, horas: 0, minutos: 1 });
  });

  it('despreza os segundos (usa o piso)', () => {
    const agora = analisarInstante('2027-01-22T16:58:30-03:00');
    expect(calcularContagem(agora, casamento)).toEqual({ dias: 0, horas: 0, minutos: 1 });
  });

  it('nunca fica negativa depois do casamento', () => {
    const agora = analisarInstante('2027-02-01T00:00:00-03:00');
    expect(calcularContagem(agora, casamento)).toEqual({ dias: 0, horas: 0, minutos: 0 });
  });
});

describe('formatarContagem', () => {
  it('usa o plural', () => {
    expect(formatarContagem({ dias: 87, horas: 3, minutos: 5 }, modelo, unidades)).toBe(
      'Faltam 87 dias, 3 horas e 5 minutos para o nosso sim',
    );
  });

  it('usa o singular só para 1', () => {
    expect(formatarContagem({ dias: 1, horas: 1, minutos: 1 }, modelo, unidades)).toBe(
      'Faltam 1 dia, 1 hora e 1 minuto para o nosso sim',
    );
  });

  it('trata zero como plural ("0 horas")', () => {
    expect(formatarContagem({ dias: 2, horas: 0, minutos: 0 }, modelo, unidades)).toBe(
      'Faltam 2 dias, 0 horas e 0 minutos para o nosso sim',
    );
  });
});
