import { describe, expect, it } from 'vitest';

import { dataPorExtenso, diaDaSemana, horaCurta } from './formato-de-data';
import { analisarInstante } from './tempo';

const casamento = analisarInstante('2027-01-22T17:00:00-03:00');
const prazo = analisarInstante('2026-12-31T23:59:59-03:00');

describe('formato de data em Brasília', () => {
  it('escreve a data do casamento por extenso', () => {
    expect(dataPorExtenso(casamento)).toBe('22 de janeiro de 2027');
  });

  it('o último segundo do prazo ainda é 31 de dezembro, mesmo sendo 02h59 do dia seguinte em UTC', () => {
    expect(dataPorExtenso(prazo)).toBe('31 de dezembro de 2026');
  });

  it('a virada do dia vale em Brasília, não em UTC (2027-01-01T00:00-03:00 já é 1º de janeiro)', () => {
    expect(dataPorExtenso(analisarInstante('2027-01-01T00:00:00-03:00'))).toBe(
      '1 de janeiro de 2027',
    );
    expect(dataPorExtenso(analisarInstante('2026-12-31T20:00:00-03:00'))).toBe(
      '31 de dezembro de 2026',
    );
  });

  it('o casamento é numa sexta-feira', () => {
    expect(diaDaSemana(casamento)).toBe('sexta-feira');
  });

  it('cobre todos os dias da semana', () => {
    const dias = Array.from({ length: 7 }, (_, i) =>
      diaDaSemana(analisarInstante(`2027-01-${String(24 + i).padStart(2, '0')}T12:00:00-03:00`)),
    );

    expect(dias).toEqual([
      'domingo',
      'segunda-feira',
      'terça-feira',
      'quarta-feira',
      'quinta-feira',
      'sexta-feira',
      'sábado',
    ]);
  });

  it('escreve a hora do casamento, com ou sem minutos', () => {
    expect(horaCurta(casamento)).toBe('17h');
    expect(horaCurta(analisarInstante('2027-01-22T17:05:00-03:00'))).toBe('17h05');
    expect(horaCurta(analisarInstante('2027-01-22T09:30:00-03:00'))).toBe('9h30');
  });

  it('não depende do fuso em que o instante foi escrito', () => {
    const emUtc = analisarInstante('2027-01-22T20:00:00Z');

    expect(horaCurta(emUtc)).toBe('17h');
    expect(dataPorExtenso(emUtc)).toBe('22 de janeiro de 2027');
  });
});
