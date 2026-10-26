import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarObterInformacoes } from '@/application/use-cases/obter-informacoes';
import { config } from '@/config/config';
import { content } from '@/config/content';
import { URL_BASE_DO_GOOGLE_AGENDA } from '@/domain/agenda/evento-de-agenda';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import { criarRelogio } from '@/infrastructure/relogio/relogio';
import { montarInformacoes } from '@/presentation/informacoes/informacoes';

/** Camadas reais (config, caso de uso, relógio, DOM), com a data simulada por `?data=`. */
function montarEm(
  dataSimulada: string,
  animar = false,
  conteudo: ConteudoConvite = content,
  baixaArquivos = false,
) {
  const raiz = document.createElement('div');
  document.body.append(raiz);
  const relogio = criarRelogio({ desenvolvimento: true, busca: `?data=${dataSimulada}` });
  const montadas = montarInformacoes({
    raiz,
    conteudo,
    config,
    relogio,
    obterInformacoes: criarObterInformacoes({ relogio, config, conteudo }),
    animar,
    baixaArquivos,
  });
  return { raiz, montadas };
}

const visivel = (raiz: HTMLElement, seletor: string): boolean => {
  const elemento = raiz.querySelector<HTMLElement>(seletor);
  if (!elemento) throw new Error(`Elemento não encontrado: ${seletor}`);
  return !elemento.hidden;
};

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('bloco de informações (SPEC-07)', () => {
  it('antes do prazo: mostra a contagem, o botão de confirmar e o aviso do prazo', () => {
    const { raiz } = montarEm('2026-11-15T10:00');

    expect(raiz.querySelector('.cartao--contagem')?.textContent).toBe(
      'Faltam 68 dias, 7 horas e 0 minutos para o nosso sim',
    );
    expect(visivel(raiz, '.botao--principal')).toBe(true);
    expect(visivel(raiz, '.acoes__prazo')).toBe(true);
    expect(visivel(raiz, '.acoes__encerrado')).toBe(false);
    expect(visivel(raiz, '.botao--secundario')).toBe(true);
  });

  it('os botões abrem o formulário e o mapa em outra aba, sem expor window.opener', () => {
    const { raiz } = montarEm('2026-11-15T10:00');

    const confirmar = raiz.querySelector<HTMLAnchorElement>('.botao--principal');
    const comoChegar = raiz.querySelector<HTMLAnchorElement>('.botao--secundario');

    expect(confirmar?.href).toBe(config.links.formulario);
    expect(comoChegar?.href).toBe(config.links.mapa);
    for (const link of [confirmar, comoChegar]) {
      expect(link?.target).toBe('_blank');
      expect(link?.rel).toBe('noopener');
    }
  });

  it('a contagem não é anunciada a cada minuto ao leitor de tela', () => {
    const { raiz } = montarEm('2026-11-15T10:00');
    expect(raiz.querySelector('.cartao--contagem p')?.getAttribute('aria-live')).toBe('off');
  });

  it('depois do prazo: troca o botão pelo aviso de encerramento', () => {
    const { raiz } = montarEm('2027-01-01T00:00');

    expect(visivel(raiz, '.botao--principal')).toBe(false);
    expect(visivel(raiz, '.acoes__prazo')).toBe(false);
    expect(raiz.querySelector('.acoes__encerrado')?.textContent).toBe(
      'As confirmações foram encerradas em 31 de dezembro de 2026.',
    );
    expect(visivel(raiz, '.acoes__encerrado')).toBe(true);
  });

  it('no dia: "É hoje!" no lugar da contagem', () => {
    const { raiz } = montarEm('2027-01-22T20:00');
    expect(raiz.querySelector('.cartao--contagem')?.textContent).toBe('É hoje! Nos vemos às 17h.');
  });

  it('depois do casamento: só o agradecimento, sem contagem nem ações', () => {
    const { raiz } = montarEm('2027-01-23T00:00');

    expect(visivel(raiz, '.cartao--contagem')).toBe(false);
    expect(raiz.querySelector('.cartao--agradecimento')?.textContent).toBe(
      'Obrigado por fazer parte da nossa história. Com amor, Isabella & David',
    );
    expect(visivel(raiz, '.cartao--agradecimento')).toBe(true);
    expect(visivel(raiz, '.cartao--acoes')).toBe(false);
  });

  it('destruir remove o bloco do DOM', () => {
    const { raiz, montadas } = montarEm('2026-11-15T10:00');

    montadas.destruir();

    expect(raiz.querySelector('.informacoes')).toBeNull();
  });
});

describe('atualização do bloco (SPEC-07, RF-07.3)', () => {
  function montarComRelogioMutavel(inicio: string) {
    let agora = Date.parse(inicio);
    const relogio = { agora: () => agora };
    const raiz = document.createElement('div');
    document.body.append(raiz);
    montarInformacoes({
      raiz,
      conteudo: content,
      config,
      relogio,
      obterInformacoes: criarObterInformacoes({ relogio, config, conteudo: content }),
    });
    return {
      raiz,
      avancarPara(iso: string) {
        agora = Date.parse(iso);
      },
    };
  }

  it('recalcula na virada de cada minuto, sem recarregar', () => {
    vi.useFakeTimers();
    const { raiz, avancarPara } = montarComRelogioMutavel('2026-11-15T10:00:00-03:00');
    expect(raiz.querySelector('.cartao--contagem')?.textContent).toContain(
      '68 dias, 7 horas e 0 minutos',
    );

    avancarPara('2026-11-15T10:01:00-03:00');
    vi.advanceTimersByTime(60_000);

    expect(raiz.querySelector('.cartao--contagem')?.textContent).toContain(
      '68 dias, 6 horas e 59 minutos',
    );
  });

  it('troca o botão pelo aviso quando o prazo vira com o convite aberto', () => {
    vi.useFakeTimers();
    const { raiz, avancarPara } = montarComRelogioMutavel('2026-12-31T23:59:30-03:00');
    expect(visivel(raiz, '.botao--principal')).toBe(true);

    avancarPara('2027-01-01T00:00:00-03:00');
    vi.advanceTimersByTime(30_000);

    expect(visivel(raiz, '.botao--principal')).toBe(false);
    expect(visivel(raiz, '.acoes__encerrado')).toBe(true);
  });

  it('recalcula quando o convidado volta ao aplicativo', () => {
    const { raiz, avancarPara } = montarComRelogioMutavel('2026-12-31T23:59:00-03:00');
    expect(visivel(raiz, '.botao--principal')).toBe(true);

    avancarPara('2027-01-05T09:00:00-03:00');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(visivel(raiz, '.botao--principal')).toBe(false);
  });
});

describe('cartões da mensagem e do traje (SPEC-07)', () => {
  it('vêm na ordem: contagem, agradecimento, mensagem, traje e ações', () => {
    const { raiz } = montarEm('2026-11-15T10:00');

    const ordem = [...raiz.querySelectorAll('.cartao')].map((c) =>
      [...c.classList].find((classe) => classe.startsWith('cartao--')),
    );

    expect(ordem).toEqual([
      'cartao--contagem',
      'cartao--agradecimento',
      'cartao--mensagem',
      'cartao--traje',
      'cartao--acoes',
    ]);
  });

  it('a mensagem traz os três parágrafos aprovados, o verso e a assinatura (CA-07.2.1, CT-07.4)', () => {
    const { raiz } = montarEm('2026-11-15T10:00');

    const paragrafos = [...raiz.querySelectorAll('.cartao--mensagem .mensagem__paragrafo')].map(
      (p) => p.textContent,
    );

    expect(paragrafos).toEqual(content.mensagem.paragrafos);
    expect(paragrafos).toHaveLength(3);
    expect(raiz.querySelector('.mensagem__verso')?.textContent).toBe(content.mensagem.versoLouvor);
    expect(raiz.querySelector('.mensagem__assinatura')?.textContent).toBe(
      'Com carinho, Isabella & David',
    );
  });

  it('verso do louvor vazio: o parágrafo não é criado e a mensagem termina na assinatura (CT-14.4)', () => {
    const { raiz } = montarEm('2026-11-15T10:00', false, {
      ...content,
      mensagem: { ...content.mensagem, versoLouvor: '' },
    });

    const filhos = [...(raiz.querySelector('.cartao--mensagem')?.children ?? [])].map(
      (filho) => filho.className,
    );

    expect(raiz.querySelector('.mensagem__verso')).toBeNull();
    expect(filhos.at(-1)).toBe('mensagem__assinatura');
    expect(filhos.filter((classe) => classe === 'mensagem__paragrafo')).toHaveLength(3);
  });

  describe('Salvar na agenda (SPEC-17)', () => {
    const ANTES = '2026-11-15T10:00';

    it('é o último botão do cartão de ações, secundário, com o texto de content.botoes.agenda (RF-17.4)', () => {
      const { raiz } = montarEm(ANTES);

      const botoes = [...raiz.querySelectorAll('.cartao--acoes .botao')];
      expect(botoes.at(-1)?.textContent).toBe(content.botoes.agenda);
      expect(botoes.at(-1)?.classList.contains('botao--secundario')).toBe(true);
      expect(botoes.at(-2)?.textContent).toBe(content.botoes.comoChegar); // abaixo de "Como chegar"
    });

    it('aparece antes do prazo, depois do prazo e no dia; some depois do casamento (CT-17.4, RF-17.5)', () => {
      const botao = (data: string) =>
        montarEm(data).raiz.querySelector<HTMLElement>('.cartao--acoes a:last-of-type');

      expect(botao(ANTES)?.hidden).toBe(false);
      expect(botao('2027-01-10T12:00')?.hidden).toBe(false);
      expect(botao('2027-01-22T09:00')?.hidden).toBe(false);
      expect(botao('2027-01-23T00:00')?.hidden).toBe(true);
    });

    it('depois do casamento, o cartão de ações some por inteiro (sem botões)', () => {
      const { raiz } = montarEm('2027-01-23T00:00');

      expect(raiz.querySelector<HTMLElement>('.cartao--acoes')?.hidden).toBe(true);
    });

    it('onde o navegador não baixa arquivos (iPhone, WhatsApp), abre o Google Agenda em outra aba (CT-17.2, RF-17.3)', () => {
      const { raiz } = montarEm(ANTES, false, content, false);

      const link = raiz.querySelector<HTMLAnchorElement>('.cartao--acoes a:last-of-type');
      expect(link?.href.startsWith(URL_BASE_DO_GOOGLE_AGENDA)).toBe(true);
      expect(link?.target).toBe('_blank');
      expect(link?.rel).toBe('noopener');
      expect(link?.hasAttribute('download')).toBe(false);
    });

    it('onde o navegador baixa (computador, Android), baixa o .ics com o evento certo (CT-17.1, RF-17.3)', () => {
      const { raiz } = montarEm(ANTES, false, content, true);

      const link = raiz.querySelector<HTMLAnchorElement>('.cartao--acoes a:last-of-type');
      expect(link?.getAttribute('download')).toBe(config.agenda.nomeDoArquivo);
      expect(link?.hasAttribute('target')).toBe(false);
      const href = link?.getAttribute('href') ?? '';
      expect(href.startsWith('data:text/calendar')).toBe(true);
      const ics = decodeURIComponent(href.slice(href.indexOf(',') + 1));
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('DTSTART:20270122T200000Z');
      expect(ics).toContain('TRIGGER:-P1D');
      expect(ics).toContain('Sítio Olinda');
    });
  });

  it('o traje mostra "Esporte fino" sob o título (CA-07.2.2)', () => {
    const { raiz } = montarEm('2026-11-15T10:00');

    expect(raiz.querySelector('.cartao--traje h3')?.textContent).toBe('Traje');
    expect(raiz.querySelector('.traje__texto')?.textContent).toBe('Esporte fino');
  });

  it('os cartões têm título (h3) para navegação por leitor de tela', () => {
    const { raiz } = montarEm('2026-11-15T10:00');

    expect([...raiz.querySelectorAll('.cartao__titulo')].map((t) => t.tagName)).toEqual([
      'H3',
      'H3',
    ]);
  });

  it('depois do casamento: mensagem e traje continuam, o agradecimento abre e "Como chegar" some (CA-07.5.4)', () => {
    const { raiz } = montarEm('2027-01-23T00:00');

    expect(visivel(raiz, '.cartao--agradecimento')).toBe(true);
    expect(visivel(raiz, '.cartao--mensagem')).toBe(true);
    expect(visivel(raiz, '.cartao--traje')).toBe(true);
    expect(visivel(raiz, '.cartao--contagem')).toBe(false);
    expect(visivel(raiz, '.cartao--acoes')).toBe(false);
  });
});

describe('números da contagem em destaque (SPEC-07, "Estilo")', () => {
  it('cada número é um <strong> e o texto lido continua o mesmo', () => {
    const { raiz } = montarEm('2026-11-15T10:00');

    const numeros = [...raiz.querySelectorAll('.cartao--contagem strong')].map(
      (n) => n.textContent,
    );

    expect(numeros).toEqual(['68', '7', '0']);
    expect(raiz.querySelector('.cartao--contagem')?.textContent).toBe(
      'Faltam 68 dias, 7 horas e 0 minutos para o nosso sim',
    );
  });

  it('a contagem segue sem anúncio a cada minuto (aria-live="off", RNF-07.3)', () => {
    const { raiz } = montarEm('2026-11-15T10:00');

    expect(raiz.querySelector('.cartao--contagem p')?.getAttribute('aria-live')).toBe('off');
  });

  it('com 1 dia, 0 horas e 1 minuto: singular e plural corretos (CT-07.3)', () => {
    const { raiz } = montarEm('2027-01-21T16:59');

    expect(raiz.querySelector('.cartao--contagem')?.textContent).toBe(
      'Faltam 1 dia, 0 horas e 1 minuto para o nosso sim',
    );
  });
});

describe('cartões surgem ao entrar na tela (SPEC-07, "Estilo")', () => {
  type Retorno = (entradas: { isIntersecting: boolean; target: Element }[]) => void;
  let retorno: Retorno | undefined;
  const observados: Element[] = [];

  beforeEach(() => {
    observados.length = 0;
    retorno = undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(aoMudar: Retorno) {
          retorno = aoMudar;
        }
        observe(alvo: Element) {
          observados.push(alvo);
        }
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('com animação, os cartões partem invisíveis e deslocados 16 px', () => {
    const { raiz } = montarEm('2026-11-15T10:00', true);

    const contagem = raiz.querySelector<HTMLElement>('.cartao--contagem');
    expect(Number(gsap.getProperty(contagem, 'opacity'))).toBe(0);
    expect(Number(gsap.getProperty(contagem, 'y'))).toBe(config.movimento.deslocamentoDosCartoes);
    expect(observados).toHaveLength(5);
  });

  it('ao entrar na tela, o cartão sobe e aparece; os que ficam abaixo seguem escondidos', async () => {
    const { raiz } = montarEm('2026-11-15T10:00', true);
    const contagem = raiz.querySelector<HTMLElement>('.cartao--contagem');
    const mensagem = raiz.querySelector<HTMLElement>('.cartao--mensagem');
    if (!contagem || !mensagem) throw new Error('cartões ausentes');

    retorno?.([{ isIntersecting: true, target: contagem }]);

    await vi.waitFor(() => {
      expect(Number(gsap.getProperty(contagem, 'opacity'))).toBe(1);
    });
    await vi.waitFor(() => {
      expect(Number(gsap.getProperty(contagem, 'y'))).toBeCloseTo(0, 1);
    });
    expect(Number(gsap.getProperty(mensagem, 'opacity'))).toBe(0);
  });

  it('sem animação (pular, animação reduzida, segurança), tudo já nasce visível', () => {
    const { raiz } = montarEm('2026-11-15T10:00', false);

    expect(observados).toHaveLength(0);
    expect(Number(gsap.getProperty(raiz.querySelector('.cartao--mensagem'), 'opacity'))).toBe(1);
  });

  it('sem IntersectionObserver no navegador, os cartões já aparecem', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    const { raiz } = montarEm('2026-11-15T10:00', true);

    expect(Number(gsap.getProperty(raiz.querySelector('.cartao--mensagem'), 'opacity'))).toBe(1);
  });
});
