import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ModuloDeConfig from '@/config/config';
import { content } from '@/config/content';
import { PLANO_B } from '@/domain/plano-b/plano-b';

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

/** Filhos do .conteudo, na ordem: a carta, a história estática (só para quem não viu os balões) e as informações. */
const blocosDoConteudo = () =>
  [...(document.querySelector('#app .conteudo')?.children ?? [])]
    .map((filho) => filho.className)
    .filter((classe) => classe !== 'convite__rolar'); // dica visual, ancorada acima da carta (SPEC-14)

const COM_HISTORIA_ESTATICA = ['carta', 'historia-estatica', 'informacoes'];

/**
 * Elementos que o teclado alcança (habilitados e não escondidos) mas que o leitor de tela não
 * enxerga, por estarem dentro de `aria-hidden`, ou que ficaram inertes: a combinação que deixa
 * alguém sem saber onde está o foco (WCAG 4.1.2).
 */
const focaveisInalcancaveis = () =>
  [...document.querySelectorAll<HTMLElement>('button, a[href], [tabindex]')]
    .filter((e) => !(e as HTMLButtonElement).disabled && !e.closest('[hidden]'))
    .filter((e) => e.closest('[aria-hidden="true"]') !== null)
    .map((e) => e.className);

/** Botões e links que o Tab alcança agora. */
const noTab = () =>
  [...document.querySelectorAll<HTMLElement>('button, a[href]')]
    .filter(
      (e) => !(e as HTMLButtonElement).disabled && !e.closest('[hidden]') && !e.closest('[inert]'),
    )
    .map((e) => e.className);

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
    localStorage.clear(); // a visita registrada num teste não pode valer para o seguinte
    for (const { alvo, tipo, escuta } of ouvintes.splice(0)) alvo.removeEventListener(tipo, escuta);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('abre na entrada: nomes do casal, botão de som e "Toque para entrar" (SPEC-02, SPEC-08)', async () => {
    await import('@/main');

    expect(document.querySelector('.entrada__nomes')?.textContent).toBe('Isabella & David');
    expect(document.querySelector('.botao-som')?.getAttribute('aria-pressed')).toBe('true');
    await vi.waitFor(() => {
      expect(document.querySelector<HTMLButtonElement>('.entrada__tocar')?.hidden).toBe(false);
    });
    expect(fase()).toBe('aguardando-entrada');
    expect(document.querySelector('.cartao--contagem')).toBeNull();
  });

  it('deixa a marca de que o pacote iniciou e desfaz o plano B (SPEC-15, RF-15.6)', async () => {
    document.documentElement.classList.add(PLANO_B.classe);

    await import('@/main');

    expect(Reflect.get(window, PLANO_B.variavel)).toBe(PLANO_B.marca);
    expect(document.documentElement.classList.contains(PLANO_B.classe)).toBe(false);
  });

  it('depois do toque e do baú, percorre o orquestrador até as informações (CA-01.4.1)', async () => {
    await ateAsInformacoes();

    const contagem = document.querySelector('#app .cartao--contagem');
    expect(contagem?.textContent).toBe('Faltam 68 dias, 7 horas e 0 minutos para o nosso sim');
    expect(document.querySelector<HTMLElement>('.entrada')?.hidden).toBe(true);
  });

  it('o fluxo completo não escreve nenhum erro no console (SPEC-12, "Metas")', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await ateAsInformacoes();

    expect(erro).not.toHaveBeenCalled();
  });

  it('a carta e as informações ficam no mesmo conteúdo, a carta primeiro, com a rolagem liberada', async () => {
    await ateAsInformacoes();

    const conteudo = document.querySelector('#app .conteudo');
    expect(conteudo?.querySelector('.carta')).not.toBeNull();
    expect(conteudo?.querySelector('.informacoes')).not.toBeNull();
    expect(conteudo?.firstElementChild?.className).toBe('carta');
    expect(conteudo?.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('em nenhuma etapa o teclado alcança algo que o leitor de tela não enxerga (WCAG 4.1.2)', async () => {
    await abrirEntrando();
    expect(focaveisInalcancaveis(), 'entrada').toEqual([]);

    // O baú só é conferido com o botão habilitado: depois do toque ele fica desabilitado e sai do Tab.
    await vi.waitFor(() => {
      expect(document.querySelector<HTMLButtonElement>('.bau__botao')?.disabled).toBe(false);
    });
    expect(focaveisInalcancaveis(), 'baú').toEqual([]);
    document.querySelector<HTMLButtonElement>('.bau__botao')?.click();

    await vi.waitFor(() => {
      expect(fase()).toBe('informacoes');
    });
    expect(focaveisInalcancaveis(), 'final').toEqual([]);
  });

  it('no estado final sobram no Tab só o som, o título, e os botões das informações: nada da abertura (SPEC-05, SPEC-09)', async () => {
    await ateAsInformacoes();

    const botoes = noTab();

    expect(botoes).not.toContain('historia__avancar');
    expect(botoes).not.toContain('visualmente-oculto atalho');
    expect(botoes).not.toContain('botao-pular');
    expect(botoes).not.toContain('carta__abrir');
    expect(botoes).toContain('botao-som');
  });

  it('no caminho completo, a história não é repetida abaixo da carta (CT-13.3)', async () => {
    await ateAsInformacoes();

    expect(blocosDoConteudo()).toEqual(['carta', 'informacoes']);
  });

  describe('caminhos alternativos (SPEC-09)', () => {
    const textoDaCarta = () => document.querySelector('#app .conteudo .carta')?.textContent ?? '';

    it('o primeiro elemento focável é "Ir direto ao convite", fora da vista até receber foco (RF-09.4)', async () => {
      await import('@/main');

      const primeiro = document.body.firstElementChild;
      expect(primeiro?.tagName).toBe('BUTTON');
      expect(primeiro?.textContent).toBe('Ir direto ao convite');
      expect(primeiro?.classList.contains('visualmente-oculto')).toBe(true);
    });

    it('o atalho leva direto à carta aberta e às informações, já na entrada (CA-09.3)', async () => {
      await import('@/main');

      document.querySelector<HTMLButtonElement>('button.atalho')?.click();

      await vi.waitFor(() => {
        expect(fase()).toBe('informacoes');
      });
      expect(textoDaCarta()).toContain(content.carta.assinatura);
      expect(document.querySelector('#app .informacoes')).not.toBeNull();
      expect(blocosDoConteudo()).toEqual(COM_HISTORIA_ESTATICA);
      expect(document.querySelector<HTMLElement>('.entrada')?.hidden).toBe(true);
      expect(document.body.style.overflow).toBe('');
      expect(document.activeElement?.id).toBe('carta-titulo'); // o foco segue o convidado até a carta
      expect(document.querySelector<HTMLElement>('button.atalho')?.hidden).toBe(true);
    });

    it('a segunda visita mostra "Pular para o convite" e ele leva ao final (CA-09.2.1, CA-09.2.2)', async () => {
      localStorage.setItem('convite:visitado', 'true');
      await import('@/main');
      await vi.waitFor(() => {
        expect(document.querySelector<HTMLButtonElement>('.entrada__tocar')?.hidden).toBe(false);
      });
      expect(document.querySelector<HTMLButtonElement>('.botao-pular')?.hidden).toBe(false);

      document.querySelector<HTMLButtonElement>('.botao-pular')?.click();

      await vi.waitFor(() => {
        expect(fase()).toBe('informacoes');
      });
      expect(textoDaCarta()).toContain(content.carta.assinatura);
      expect(blocosDoConteudo()).toEqual(COM_HISTORIA_ESTATICA);
      localStorage.removeItem('convite:visitado');
    });

    it('segunda visita: "Pular" continua à mão no baú e leva à carta com a história estática (CT-14.1)', async () => {
      localStorage.setItem('convite:visitado', 'true');
      await abrirEntrando();
      await vi.waitFor(() => {
        expect(document.querySelector<HTMLButtonElement>('.bau__botao')?.disabled).toBe(false);
      });
      expect(fase()).toBe('aguardando-bau');
      expect(document.querySelector<HTMLButtonElement>('.botao-pular')?.hidden).toBe(false);

      document.querySelector<HTMLButtonElement>('.botao-pular')?.click();

      await vi.waitFor(() => {
        expect(fase()).toBe('informacoes');
      });
      expect(blocosDoConteudo()).toEqual(COM_HISTORIA_ESTATICA);
      expect(document.querySelector('.botao-pular')?.hasAttribute('hidden')).toBe(true); // CT-14.2
    });

    it('a ordem do Tab é o atalho, "Pular", o som e só depois a etapa atual (CT-14.5, RF-14.3)', async () => {
      localStorage.setItem('convite:visitado', 'true');
      await import('@/main');

      // Só entram na ordem do Tab os botões habilitados e à vista: o do baú, que fica antes no DOM,
      // está desabilitado até o bosque ficar pronto.
      const tabulaveis = [...document.querySelectorAll('button')]
        .filter((botao) => !botao.disabled && !botao.hidden)
        .map((botao) => botao.className);

      expect(tabulaveis.slice(0, 3)).toEqual([
        'visualmente-oculto atalho',
        'botao-pular',
        'botao-som',
      ]);
      await vi.waitFor(() => {
        expect(document.querySelector<HTMLButtonElement>('.entrada__tocar')?.hidden).toBe(false);
      });
      const depoisDoSom = [...document.querySelectorAll('button')]
        .filter((botao) => !botao.disabled && !botao.hidden)
        .map((botao) => botao.className)
        .slice(3);
      expect(depoisDoSom[0]).toBe('entrada__tocar');
    });

    it('na primeira visita, "Pular para o convite" não aparece', async () => {
      await import('@/main');
      await vi.waitFor(() => {
        expect(document.querySelector<HTMLButtonElement>('.entrada__tocar')?.hidden).toBe(false);
      });

      expect(document.querySelector('.botao-pular')?.hasAttribute('hidden')).toBe(true);
    });

    it('com animação reduzida, o toque leva direto à carta aberta, sem balões nem envelope (CA-09.1.1, CA-09.1.2)', async () => {
      vi.stubGlobal('matchMedia', (consulta: string) => ({
        matches: consulta.includes('prefers-reduced-motion'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      await import('@/main');
      await vi.waitFor(() => {
        expect(document.querySelector<HTMLButtonElement>('.entrada__tocar')?.hidden).toBe(false);
      });

      document.querySelector<HTMLButtonElement>('.entrada__tocar')?.click();

      await vi.waitFor(() => {
        expect(fase()).toBe('informacoes');
      });
      expect(textoDaCarta()).toContain(content.carta.assinatura);
      expect(document.querySelector<HTMLElement>('.historia')?.hidden ?? true).toBe(true);
      expect(document.querySelector<HTMLElement>('.envelope')?.hidden).toBe(true);
      expect(document.querySelector('.bau__corpo')).not.toBeNull(); // montado, mas nunca tocado
      expect(blocosDoConteudo()).toEqual(COM_HISTORIA_ESTATICA);
      expect(document.querySelectorAll('.historia-estatica__cartao')).toHaveLength(
        content.baloes.length,
      );
    });

    it('com erro numa cena, mostra a carta e as informações e leva o foco ao título (CA-09.5.2, CT-09.7)', async () => {
      const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      window.history.replaceState({}, '', '/?data=2026-11-15T10:00&erro=historia');

      await abrirEntrando();
      await abrirOBau();

      await vi.waitFor(() => {
        expect(fase()).toBe('seguranca');
      });
      expect(erro).toHaveBeenCalled();
      expect(textoDaCarta()).toContain(content.carta.assinatura);
      expect(document.querySelector('#app .informacoes')).not.toBeNull();
      expect(blocosDoConteudo()).toEqual(COM_HISTORIA_ESTATICA);
      expect(document.querySelector('#app .conteudo')?.hasAttribute('inert')).toBe(false);
      expect(document.body.style.overflow).toBe('');
      expect(document.activeElement?.id).toBe('carta-titulo');
    });
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
