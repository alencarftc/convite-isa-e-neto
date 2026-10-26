import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Fumaça da raiz de composição: o main.ts liga config, caso de uso, relógio e apresentação. */
describe('src/main.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState({}, '', '/?data=2026-11-15T10:00');
  });

  it('monta o bloco de informações em #app usando a data simulada', async () => {
    await import('@/main');

    const contagem = document.querySelector('#app .cartao--contagem');
    expect(contagem?.textContent).toBe('Faltam 68 dias, 7 horas e 0 minutos para o nosso sim');
  });

  it('falha com mensagem clara se o index.html não tiver #app', async () => {
    document.body.innerHTML = '';

    await expect(import('@/main')).rejects.toThrow('#app');
  });
});
