import { describe, expect, it } from 'vitest';

import { deslocamentoComResistencia, distanciaDoGesto, gestoAbre } from './gesto-do-selo';

describe('distanciaDoGesto (SPEC-16, RF-16.1)', () => {
  it('conta o deslocamento para baixo e para o lado', () => {
    expect(distanciaDoGesto(0, 80)).toBe(80);
    expect(distanciaDoGesto(-60, 0)).toBe(60);
    expect(distanciaDoGesto(30, 40)).toBe(50);
  });

  it('o deslocamento para cima não conta', () => {
    expect(distanciaDoGesto(0, -90)).toBe(0);
    expect(distanciaDoGesto(40, -90)).toBe(40);
  });
});

describe('deslocamentoComResistencia', () => {
  it('é zero sem arrastar e nunca passa do limite, por mais que o dedo ande', () => {
    expect(deslocamentoComResistencia(0, 120)).toBe(0);
    expect(deslocamentoComResistencia(-5, 120)).toBe(0);
    expect(deslocamentoComResistencia(5000, 120)).toBeLessThanOrEqual(120);
    expect(deslocamentoComResistencia(5000, 120)).toBeGreaterThan(119);
  });

  it('cresce sempre, mas cada vez menos: o selo "pesa" mais quanto mais longe', () => {
    const passos = [20, 40, 60, 80, 100, 120].map((d) => deslocamentoComResistencia(d, 120));

    for (let i = 1; i < passos.length; i++) {
      expect(passos[i]).toBeGreaterThan(passos[i - 1] ?? 0);
    }
    const primeiro = (passos[1] ?? 0) - (passos[0] ?? 0);
    const ultimo = (passos[5] ?? 0) - (passos[4] ?? 0);
    expect(ultimo).toBeLessThan(primeiro);
  });

  it('o selo anda menos que o dedo (resistência)', () => {
    expect(deslocamentoComResistencia(60, 120)).toBeLessThan(60);
  });

  it('sem limite, não se move', () => {
    expect(deslocamentoComResistencia(50, 0)).toBe(0);
  });
});

describe('gestoAbre (CT-16.1)', () => {
  it('abre a partir do limiar e não abre antes dele', () => {
    expect(gestoAbre(59.9, 60)).toBe(false);
    expect(gestoAbre(60, 60)).toBe(true);
    expect(gestoAbre(200, 60)).toBe(true);
  });
});
