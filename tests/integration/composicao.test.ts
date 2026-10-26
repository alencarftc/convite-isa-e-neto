import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Fumaça da raiz de composição: o main.ts liga config, orquestrador, adaptadores e apresentação. */
describe('src/main.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
    document.body.removeAttribute('data-fase');
    window.history.replaceState({}, '', '/?data=2026-11-15T10:00');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('monta o bloco de informações em #app usando a data simulada', async () => {
    await import('@/main');

    const contagem = document.querySelector('#app .cartao--contagem');
    expect(contagem?.textContent).toBe('Faltam 68 dias, 7 horas e 0 minutos para o nosso sim');
  });

  it('percorre o orquestrador até o final e reflete a fase no <body> (CA-01.4.1)', async () => {
    await import('@/main');

    await vi.waitFor(() => {
      expect(document.body.getAttribute('data-fase')).toBe('informacoes');
    });
  });

  it('?erro=<cena> faz a cena falhar: registra o erro e ainda mostra as informações (CT-01.7)', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.history.replaceState({}, '', '/?data=2026-11-15T10:00&erro=informacoes');

    await import('@/main');

    await vi.waitFor(() => {
      expect(erro).toHaveBeenCalled();
    });
    // O final é a própria cena que falhou: o orquestrador a mostra de novo, sem animação.
    expect(document.querySelector('#app .cartao--contagem')).not.toBeNull();
    expect(document.body.getAttribute('data-fase')).toBe('informacoes');
    expect(erro).toHaveBeenCalledWith(
      '[convite] modo de segurança',
      expect.objectContaining({ message: expect.stringContaining('informacoes') as string }),
    );
  });

  it('um erro não tratado do próprio site depois do final só é registrado', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await import('@/main');
    await vi.waitFor(() => {
      expect(document.body.getAttribute('data-fase')).toBe('informacoes');
    });

    window.dispatchEvent(
      Object.assign(new Event('error'), {
        filename: `${window.location.origin}/assets/index.js`,
        error: new Error('tardio'),
        message: 'tardio',
      }),
    );

    expect(document.body.getAttribute('data-fase')).toBe('informacoes');
    expect(erro).toHaveBeenCalledWith('[convite] modo de segurança', new Error('tardio'));
  });

  it('falha com mensagem clara se o index.html não tiver #app', async () => {
    document.body.innerHTML = '';

    await expect(import('@/main')).rejects.toThrow('#app');
  });
});
