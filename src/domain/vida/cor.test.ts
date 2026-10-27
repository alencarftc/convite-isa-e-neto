import { describe, expect, it } from 'vitest';

import { analisarCor } from './cor';

describe('analisarCor', () => {
  it('lê #rrggbb, como o token --cor-luz (#e5aa6e)', () => {
    const cor = analisarCor(' #e5aa6e ');

    expect(cor?.[0]).toBeCloseTo(229 / 255);
    expect(cor?.[1]).toBeCloseTo(170 / 255);
    expect(cor?.[2]).toBeCloseTo(110 / 255);
  });

  it('lê #rgb e ignora o alfa de #rrggbbaa e #rgba', () => {
    expect(analisarCor('#fff')).toEqual([1, 1, 1]);
    expect(analisarCor('#00ff0080')).toEqual([0, 1, 0]);
    expect(analisarCor('#f008')).toEqual([1, 0, 0]);
  });

  it('lê rgb() e rgba(), com vírgulas ou espaços', () => {
    expect(analisarCor('rgb(255, 0, 51)')).toEqual([1, 0, 51 / 255]);
    expect(analisarCor('rgba(0 255 0 / 0.5)')).toEqual([0, 1, 0]);
  });

  it('devolve undefined para o que não entende', () => {
    expect(analisarCor('')).toBeUndefined();
    expect(analisarCor('dourado')).toBeUndefined();
    expect(analisarCor('#12')).toBeUndefined();
    expect(analisarCor('hsl(30, 60%, 60%)')).toBeUndefined();
  });
});
