import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ModuloDeConfig from '@/config/config';

import { montarIndexHtml } from './suporte/index-html';

// As animações duram segundos de verdade; aqui só importa que terminam e levam ao final.
vi.mock('@/config/config', async (importarOriginal) => {
  const original = await importarOriginal<typeof ModuloDeConfig>();
  const { configRapida } = await import('./suporte/config-rapida');
  return { config: configRapida(original.config) };
});

/** Imagem que decodifica na hora: o convite não espera por rede nos testes. */
class ImagemInstantanea {
  src = '';
  fetchPriority = 'auto';
  decode(): Promise<void> {
    return Promise.resolve();
  }
}

const fase = () => document.body.getAttribute('data-fase');

/**
 * Cada `import('@/main')` registra ouvintes em window e document que sobrevivem ao teste (o main
 * não tem como ser desmontado de fora). Guardamos para remover no fim, senão um convite de um teste
 * anterior reage aos eventos do teste seguinte.
 */
const ouvintes: { alvo: EventTarget; tipo: string; escuta: EventListenerOrEventListenerObject }[] =
  [];
function registrarOuvintes(alvo: EventTarget): void {
  const original = alvo.addEventListener.bind(alvo);
  vi.spyOn(alvo, 'addEventListener').mockImplementation((tipo, escuta, opcoes) => {
    if (escuta) ouvintes.push({ alvo, tipo, escuta });
    original(tipo, escuta, opcoes);
  });
}

/** Abre o convite e dá o toque de entrada, como o convidado. */
async function abrirEntrando(): Promise<void> {
  await import('@/main');
  await vi.waitFor(() => {
    expect(document.querySelector<HTMLButtonElement>('.entrada__tocar')?.hidden).toBe(false);
  });
  document.querySelector<HTMLButtonElement>('.entrada__tocar')?.click();
}

/** Espera o bosque ficar pronto e abre o baú com um toque. */
async function abrirOBau(): Promise<void> {
  await vi.waitFor(() => {
    expect(document.querySelector<HTMLButtonElement>('.bau__botao')?.disabled).toBe(false);
  });
  expect(fase()).toBe('aguardando-bau');
  document.querySelector<HTMLButtonElement>('.bau__botao')?.click();
}

/** Percorre a entrada e o baú, até as informações. */
async function ateAsInformacoes(): Promise<void> {
  await abrirEntrando();
  await abrirOBau();
  await vi.waitFor(() => {
    expect(fase()).toBe('informacoes');
  });
}

/** Fumaça da raiz de composição: o main.ts liga config, orquestrador, adaptadores e apresentação. */
describe('src/main.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('Image', ImagemInstantanea);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined); // sem MP3 de verdade, o Howler avisa
    registrarOuvintes(window);
    registrarOuvintes(document);
    montarIndexHtml();
    window.history.replaceState({}, '', '/?data=2026-11-15T10:00');
  });

  afterEach(() => {
    for (const { alvo, tipo, escuta } of ouvintes.splice(0)) alvo.removeEventListener(tipo, escuta);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('abre na entrada: nomes do casal, botão de som e "Toque para entrar" (SPEC-02, SPEC-08)', async () => {
    await import('@/main');

    expect(document.querySelector('.entrada__nomes')?.textContent).toBe('Isabella & David');
    expect(document.querySelector('#app .botao-som')?.getAttribute('aria-pressed')).toBe('true');
    await vi.waitFor(() => {
      expect(document.querySelector<HTMLButtonElement>('.entrada__tocar')?.hidden).toBe(false);
    });
    expect(fase()).toBe('aguardando-entrada');
    expect(document.querySelector('.cartao--contagem')).toBeNull();
  });

  it('depois do toque e do baú, percorre o orquestrador até as informações (CA-01.4.1)', async () => {
    await ateAsInformacoes();

    const contagem = document.querySelector('#app .cartao--contagem');
    expect(contagem?.textContent).toBe('Faltam 68 dias, 7 horas e 0 minutos para o nosso sim');
    expect(document.querySelector<HTMLElement>('.entrada')?.hidden).toBe(true);
  });

  it('?erro=<cena> faz a cena falhar: registra o erro e ainda mostra as informações (CT-01.7)', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.history.replaceState({}, '', '/?data=2026-11-15T10:00&erro=informacoes');

    await abrirEntrando();
    await abrirOBau();

    await vi.waitFor(() => {
      expect(erro).toHaveBeenCalled();
    });
    // O final é a própria cena que falhou: o orquestrador a mostra de novo, sem animação.
    expect(document.querySelector('#app .cartao--contagem')).not.toBeNull();
    expect(fase()).toBe('informacoes');
    expect(erro).toHaveBeenCalledWith(
      '[convite] modo de segurança',
      expect.objectContaining({ message: expect.stringContaining('informacoes') as string }),
    );
  });

  it('?erro=entrada leva ao modo de segurança com as informações à vista (SPEC-09)', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.history.replaceState({}, '', '/?data=2026-11-15T10:00&erro=entrada');

    await import('@/main');

    await vi.waitFor(() => {
      expect(fase()).toBe('seguranca');
    });
    expect(erro).toHaveBeenCalled();
    expect(document.querySelector('#app .cartao--contagem')).not.toBeNull();
    expect(document.querySelector<HTMLElement>('.entrada')?.hidden).toBe(true);
  });

  it('um erro não tratado do próprio site depois do final só é registrado', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await ateAsInformacoes();

    window.dispatchEvent(
      Object.assign(new Event('error'), {
        filename: `${window.location.origin}/assets/index.js`,
        error: new Error('tardio'),
        message: 'tardio',
      }),
    );

    expect(fase()).toBe('informacoes');
    expect(erro).toHaveBeenCalledWith('[convite] modo de segurança', new Error('tardio'));
  });

  it('falha com mensagem clara se o index.html não tiver #app', async () => {
    document.body.innerHTML = '';

    await expect(import('@/main')).rejects.toThrow('#app');
  });
});
