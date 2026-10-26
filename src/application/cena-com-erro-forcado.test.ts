import { describe, expect, it, vi } from 'vitest';

import type { Cena } from './cena';
import { comErroForcado } from './cena-com-erro-forcado';

function cenaEspia(): Cena {
  return {
    init: vi.fn(),
    run: vi.fn(() => Promise.resolve()),
    skip: vi.fn(),
    destroy: vi.fn(),
  };
}

describe('comErroForcado', () => {
  it('run() rejeita com o nome da cena e não toca a cena original', async () => {
    const original = cenaEspia();

    await expect(comErroForcado('historia', original).run()).rejects.toThrow(
      'Erro forçado na cena "historia"',
    );
    expect(original.run).not.toHaveBeenCalled();
  });

  it('init, skip e destroy seguem para a cena original', () => {
    const original = cenaEspia();
    const forcada = comErroForcado('carta', original);

    forcada.init();
    forcada.skip();
    forcada.destroy();

    expect(original.init).toHaveBeenCalledOnce();
    expect(original.skip).toHaveBeenCalledOnce();
    expect(original.destroy).toHaveBeenCalledOnce();
  });
});
