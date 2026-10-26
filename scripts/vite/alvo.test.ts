import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { alvosDoBuild } from './alvo';

describe('alvosDoBuild (SPEC-15, RF-15.5)', () => {
  it('converte as consultas do browserslist para o formato de build.target', () => {
    expect(alvosDoBuild(['chrome >= 90', 'ios_saf >= 15.1', 'safari >= 15.1'])).toEqual([
      'chrome90',
      'ios15.1',
      'safari15.1',
    ]);
  });

  it('recusa consulta que não seja "navegador >= versão", em vez de ignorá-la em silêncio', () => {
    expect(() => alvosDoBuild(['last 2 versions'])).toThrow(RangeError);
    expect(() => alvosDoBuild(['opera >= 80'])).toThrow(/não suportada/);
    expect(() => alvosDoBuild(['chrome > 90'])).toThrow(RangeError);
  });

  it('o browserslist do package.json é convertível e cobre iOS 15.1 e Chrome 90 (RF-15.1)', () => {
    const pacote = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', '..', 'package.json'), 'utf8'),
    ) as { browserslist?: string[] };

    const alvos = alvosDoBuild(pacote.browserslist ?? []);

    expect(alvos).toEqual(expect.arrayContaining(['ios15.1', 'chrome90']));
  });
});
