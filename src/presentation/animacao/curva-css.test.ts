import { describe, expect, it } from 'vitest';

import { config } from '@/config/config';

import { curvaCss } from './curva-css';

describe('curvaCss', () => {
  it('traduz as curvas de seno e de potência do GSAP para a Bézier do CSS', () => {
    expect(curvaCss('sine.inOut')).toBe('cubic-bezier(0.37, 0, 0.63, 1)');
    expect(curvaCss('power2.out')).toBe('cubic-bezier(0.33, 1, 0.68, 1)');
    expect(curvaCss('power3.inOut')).toBe('cubic-bezier(0.76, 0, 0.24, 1)');
  });

  it('`none` e `linear` são linear', () => {
    expect(curvaCss('none')).toBe('linear');
    expect(curvaCss('linear')).toBe('linear');
  });

  it('uma curva sem equivalente (a elástica) cai em linear, sem quebrar', () => {
    expect(curvaCss('elastic.out(1, 0.5)')).toBe('linear');
  });

  it('toda curva de config.curvas, exceto a elástica, tem equivalente próprio (não cai em linear por esquecimento)', () => {
    for (const [nome, curva] of Object.entries(config.curvas)) {
      if (curva === 'none' || curva.startsWith('elastic')) continue;
      expect(curvaCss(curva), `config.curvas.${nome} = ${curva}`).not.toBe('linear');
    }
  });
});
