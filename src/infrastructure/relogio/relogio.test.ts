import { afterEach, describe, expect, it, vi } from 'vitest';

import { criarRelogio } from './relogio';

afterEach(() => {
  vi.useRealTimers();
});

describe('criarRelogio', () => {
  it('usa a hora real do aparelho por padrão', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));

    const relogio = criarRelogio({ desenvolvimento: false, busca: '' });

    expect(relogio.agora()).toBe(Date.parse('2026-11-01T12:00:00Z'));
  });

  it('em desenvolvimento, ?data= congela o instante em horário de Brasília', () => {
    const relogio = criarRelogio({ desenvolvimento: true, busca: '?data=2026-11-15T10:00' });

    expect(relogio.agora()).toBe(Date.parse('2026-11-15T10:00:00-03:00'));
    expect(relogio.agora()).toBe(relogio.agora());
  });

  it('em produção, ignora ?data=', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));

    const relogio = criarRelogio({ desenvolvimento: false, busca: '?data=2027-01-22T10:00' });

    expect(relogio.agora()).toBe(Date.parse('2026-11-01T12:00:00Z'));
  });

  it.each(['?data=ontem', '?data=2026-11-15', '?data=2026-13-45T99:00', '?outra=1', ''])(
    'em desenvolvimento, volta à hora real se a busca for "%s"',
    (busca) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));

      const relogio = criarRelogio({ desenvolvimento: true, busca });

      expect(relogio.agora()).toBe(Date.parse('2026-11-01T12:00:00Z'));
    },
  );
});
