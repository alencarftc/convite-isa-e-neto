import { describe, expect, it } from 'vitest';

import { lerErroForcado } from './erro-forcado';

describe('lerErroForcado', () => {
  it('em desenvolvimento, devolve a cena pedida em ?erro=', () => {
    expect(lerErroForcado({ desenvolvimento: true, busca: '?erro=historia' })).toBe('historia');
  });

  it('em produção, ignora ?erro= (RF-01.10)', () => {
    expect(lerErroForcado({ desenvolvimento: false, busca: '?erro=historia' })).toBeNull();
  });

  it.each(['', '?data=2027-01-22T10:00', '?erro=', '?erro=Hist%C3%B3ria', '?erro=a-b', '?erro=1'])(
    'devolve null para a busca "%s"',
    (busca) => {
      expect(lerErroForcado({ desenvolvimento: true, busca })).toBeNull();
    },
  );
});
