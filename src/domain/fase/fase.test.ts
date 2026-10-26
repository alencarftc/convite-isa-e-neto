import { describe, expect, it } from 'vitest';

import { ehFaseFinal, FASES, proximaFase, transicaoValida } from './fase';

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

describe('transicaoValida', () => {
  it('permite avançar, inclusive saltando fases', () => {
    expect(transicaoValida('carregando', 'aguardando-entrada')).toBe(true);
    expect(transicaoValida('bosque', 'historia')).toBe(true);
  });

  it('não permite voltar nem repetir a mesma fase', () => {
    expect(transicaoValida('historia', 'bosque')).toBe(false);
    expect(transicaoValida('bau', 'bau')).toBe(false);
  });

  it('"informacoes" e "seguranca" valem de qualquer fase não final (pular, erro)', () => {
    for (const fase of FASES.filter((f) => !ehFaseFinal(f))) {
      expect(transicaoValida(fase, 'informacoes')).toBe(true);
      expect(transicaoValida(fase, 'seguranca')).toBe(true);
    }
  });

  it('das fases finais não se sai, nem de uma final para a outra', () => {
    expect(transicaoValida('informacoes', 'seguranca')).toBe(false);
    expect(transicaoValida('seguranca', 'informacoes')).toBe(false);
    expect(transicaoValida('informacoes', 'bosque')).toBe(false);
  });
});
