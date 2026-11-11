import { describe, expect, it, vi } from 'vitest';

import { animarNoNavegador } from '@/presentation/animacao/animar-no-navegador';

describe('animarNoNavegador', () => {
  it('devolve a animação que o navegador criou, com os quadros e as opções pedidos', () => {
    const elemento = document.createElement('div');
    const animacao = { finished: Promise.resolve() } as unknown as Animation;
    const animate = vi.spyOn(elemento, 'animate').mockReturnValue(animacao);
    const quadros = [{ opacity: 0 }, { opacity: 1 }];

    expect(animarNoNavegador(elemento, quadros, { duration: 100 })).toBe(animacao);
    expect(animate).toHaveBeenCalledWith(quadros, { duration: 100 });
  });

  it('cancelar não deixa uma rejeição solta: o AbortError de `finished` é engolido', async () => {
    const elemento = document.createElement('div');
    const aoRejeitarSolto = vi.fn();
    process.on('unhandledRejection', aoRejeitarSolto);
    const rejeitada = Promise.reject(new DOMException('cancelada', 'AbortError'));
    vi.spyOn(elemento, 'animate').mockReturnValue({ finished: rejeitada } as unknown as Animation);

    animarNoNavegador(elemento, [], {});
    await new Promise((resolver) => setTimeout(resolver, 20));
    process.off('unhandledRejection', aoRejeitarSolto);

    expect(aoRejeitarSolto).not.toHaveBeenCalled();
  });

  it('tolera um navegador que não expõe `finished`', () => {
    const elemento = document.createElement('div');
    vi.spyOn(elemento, 'animate').mockReturnValue({} as unknown as Animation);

    expect(() => animarNoNavegador(elemento, [], {})).not.toThrow();
  });
});
