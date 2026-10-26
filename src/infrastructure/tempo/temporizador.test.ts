import { afterEach, describe, expect, it, vi } from 'vitest';

import { criarTemporizador } from './temporizador';

afterEach(() => {
  vi.useRealTimers();
});

describe('criarTemporizador', () => {
  it('resolve só depois do tempo pedido, em segundos', async () => {
    vi.useFakeTimers();
    const resolvido = vi.fn();

    void criarTemporizador().esperar(8).then(resolvido);
    await vi.advanceTimersByTimeAsync(7999);
    expect(resolvido).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(resolvido).toHaveBeenCalledOnce();
  });
});
