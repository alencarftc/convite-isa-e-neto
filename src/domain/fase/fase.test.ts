import { describe, expect, it } from 'vitest';

import { ehFaseFinal, FASES, proximaFase } from './fase';

describe('fases do orquestrador', () => {
  it('começam em "carregando" e seguem a ordem do caminho completo', () => {
    expect(FASES[0]).toBe('carregando');
    expect(proximaFase('carregando')).toBe('aguardando-entrada');
    expect(proximaFase('aguardando-selo')).toBe('convite');
    expect(proximaFase('convite')).toBe('informacoes');
  });

  it('"informacoes" e "seguranca" são finais e não têm próxima', () => {
    expect(ehFaseFinal('informacoes')).toBe(true);
    expect(ehFaseFinal('seguranca')).toBe(true);
    expect(proximaFase('informacoes')).toBeNull();
    expect(proximaFase('seguranca')).toBeNull();
  });

  it('as demais fases não são finais', () => {
    const naoFinais = FASES.filter((fase) => fase !== 'informacoes' && fase !== 'seguranca');
    expect(naoFinais.every((fase) => !ehFaseFinal(fase))).toBe(true);
  });
});
