import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarBarramento } from '@/application/barramento-eventos';
import { config } from '@/config/config';
import { content } from '@/config/content';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { criarCenaViva } from '@/presentation/vida/cena-viva';
import type { ElementoDeVida } from '@/presentation/vida/elemento-de-vida';

import { criarEstadoFalso, type OpcoesDoEstadoFalso } from './suporte/estado-falso';
import { criarTickerFalso } from './suporte/ticker-falso';

/** Um elemento de vida que só registra o que a cena viva lhe pede. */
function criarElementoFalso(aoIniciar?: () => void) {
  return {
    iniciar: vi.fn(aoIniciar),
    aoMudarNivel: vi.fn(),
    pausar: vi.fn(),
    retomar: vi.fn(),
    parar: vi.fn(),
  } satisfies ElementoDeVida;
}

interface OpcoesDaMontagem extends OpcoesDoEstadoFalso {
  readonly modesto?: boolean;
  readonly elementos?: readonly ElementoDeVida[];
  /** Cria o botão de som antes, como o `main.ts` faz. */
  readonly comBotaoDeSom?: boolean;
}

function montar(opcoes: OpcoesDaMontagem = {}) {
  document.body.innerHTML = '';
  if (opcoes.comBotaoDeSom) {
    const som = document.createElement('button');
    som.className = 'botao-som';
    document.body.append(som);
  }
  const raiz = document.createElement('div');
  raiz.id = 'app';
  const cena = document.createElement('div');
  cena.className = 'cena';
  const espacos = ['ceu', 'fundo', 'chao'].map((nome) => {
    const espaco = document.createElement('div');
    espaco.className = `vida vida--${nome}`;
    return espaco;
  });
  cena.append(...espacos);
  const conteudo = document.createElement('main');
  conteudo.className = 'conteudo';
  const carta = document.createElement('article');
  carta.className = 'carta';
  conteudo.append(carta);
  raiz.append(cena, conteudo);
  document.body.append(raiz);

  const { estado, gravar } = criarEstadoFalso({ toque: true, ...opcoes });
  const eventos = criarBarramento<EventosConvite>();
  const ticker = criarTickerFalso();
  const avisar = vi.fn();
  const elementos = opcoes.elementos ?? [criarElementoFalso()];
  const viva = criarCenaViva({
    raiz,
    config,
    dicas: content.dicas,
    estado,
    eventos,
    capacidades: { aparelhoModesto: () => opcoes.modesto ?? false },
    elementos,
    ticker,
    avisar,
  });

  /** Põe a carta onde a rolagem a deixaria e avisa o ouvinte, como um `scroll` de verdade. */
  function rolarCartaPara(topo: number, largura: number, janela: { w: number; h: number }) {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: janela.h });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: janela.w });
    vi.spyOn(carta, 'getBoundingClientRect').mockReturnValue({
      top: topo,
      width: largura,
      height: 900,
      bottom: topo + 900,
      left: 0,
      right: largura,
      x: 0,
      y: topo,
      toJSON: () => ({}),
    });
    window.dispatchEvent(new Event('scroll'));
    ticker.quadro(16);
  }

  const botao = () => document.querySelector<HTMLButtonElement>('.botao-movimento');
  return {
    estado,
    eventos,
    ticker,
    avisar,
    elementos,
    viva,
    espacos,
    rolarCartaPara,
    botao,
    gravar,
  };
}

const CELULAR = { w: 375, h: 800 };

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('cena viva: quando a vida começa (SPEC-18, RF-18.1)', () => {
  it('começa uma vez só em bosque:pronto, no nível completo; repetir ou pular depois não recomeça (CT-18.4)', () => {
    const { eventos, elementos } = montar();
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];

    eventos.emit('bosque:pronto');
    eventos.emit('bosque:pronto');
    eventos.emit('convite:pulado');

    expect(elemento.iniciar).toHaveBeenCalledTimes(1);
    expect(elemento.iniciar).toHaveBeenCalledWith('completo');
  });

  it('Pular, sem o bosque ter ficado pronto, também começa a vida (RF-18.1)', () => {
    const { eventos, elementos } = montar();
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];

    eventos.emit('convite:pulado');

    expect(elemento.iniciar).toHaveBeenCalledWith('completo');
  });

  it('antes do bosque, nada começa', () => {
    const { elementos, botao } = montar();
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];

    expect(elemento.iniciar).not.toHaveBeenCalled();
    expect(botao()).toBeNull();
  });

  it('com animação reduzida nada começa e nada é criado no DOM (CT-18.5)', () => {
    const { eventos, elementos, botao, ticker } = montar({ reduzido: true, comBotaoDeSom: true });
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];
    const antes = document.body.innerHTML;

    eventos.emit('bosque:pronto');
    eventos.emit('convite:pulado');

    expect(elemento.iniciar).not.toHaveBeenCalled();
    expect(botao()).toBeNull();
    expect(ticker.escutas()).toBe(0);
    expect(document.body.innerHTML).toBe(antes);
  });

  it('aparelho modesto começa no nível leve e não mede quadros (CT-18.1)', () => {
    const { eventos, elementos, ticker } = montar({ modesto: true });
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];

    eventos.emit('bosque:pronto');

    expect(elemento.iniciar).toHaveBeenCalledWith('leve');
    expect(ticker.escutas()).toBe(0);
  });
});

describe('cena viva: modo de segurança (SPEC-18, RF-18.5)', () => {
  it('para todos os elementos, esvazia os espaços da vida e tira o botão (CT-18.6)', () => {
    const { estado, eventos, elementos, espacos, botao } = montar({
      elementos: [criarElementoFalso(), criarElementoFalso()],
    });
    eventos.emit('bosque:pronto');
    espacos[2]?.append(document.createElement('img')); // algo que um elemento deixou na tela

    estado.definirFase('seguranca');

    for (const elemento of elementos) expect(elemento.parar).toHaveBeenCalledTimes(1);
    expect(espacos.every((espaco) => espaco.childElementCount === 0)).toBe(true);
    expect(botao()).toBeNull();
  });

  it('depois do modo de segurança, um bosque:pronto tardio não faz nada', () => {
    const { estado, eventos, elementos } = montar();
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];
    estado.definirFase('seguranca');

    eventos.emit('bosque:pronto');

    expect(elemento.iniciar).not.toHaveBeenCalled();
  });

  it('destruir (recarga a quente) solta tudo: ticker, rolagem e botão', () => {
    const { viva, eventos, estado, ticker, botao } = montar();
    eventos.emit('bosque:pronto');
    estado.definirFase('convite');
    expect(ticker.escutas()).toBeGreaterThan(0);

    viva.destruir();

    expect(ticker.escutas()).toBe(0);
    expect(botao()).toBeNull();
  });
});

describe('cena viva: pausa por cobertura (SPEC-18, RF-18.4)', () => {
  it('rolar até a cena aparecer em menos de 15% pausa; voltar a 40% retoma (CT-18.7)', () => {
    const { estado, eventos, elementos, rolarCartaPara } = montar();
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];
    eventos.emit('bosque:pronto');
    estado.definirFase('convite');

    rolarCartaPara(80, 345, CELULAR); // 10% da janela
    expect(elemento.pausar).toHaveBeenCalledTimes(1);

    rolarCartaPara(320, 345, CELULAR); // 40%
    expect(elemento.retomar).toHaveBeenCalledTimes(1);
  });

  it('pausar e retomar não se repetem enquanto a situação é a mesma', () => {
    const { estado, eventos, elementos, rolarCartaPara } = montar();
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];
    eventos.emit('bosque:pronto');
    estado.definirFase('convite');

    rolarCartaPara(40, 345, CELULAR);
    rolarCartaPara(20, 345, CELULAR);
    rolarCartaPara(-300, 345, CELULAR);

    expect(elemento.pausar).toHaveBeenCalledTimes(1);
    expect(elemento.retomar).not.toHaveBeenCalled();
  });

  it('mede o layout uma vez por quadro, por mais eventos de rolagem que cheguem', () => {
    const { estado, eventos, ticker } = montar();
    eventos.emit('bosque:pronto');
    estado.definirFase('convite');
    const carta = document.querySelector('.carta');
    if (!carta) throw new Error('sem .carta');
    const medir = vi.spyOn(carta, 'getBoundingClientRect');
    ticker.quadro(16); // esvazia a medida inicial

    for (let i = 0; i < 10; i += 1) window.dispatchEvent(new Event('scroll'));
    ticker.quadro(16);
    ticker.quadro(16);

    // Uma medida da entrada na fase e uma da rajada de rolagem.
    expect(medir.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('em tela larga a carta é uma coluna e o lago continua à vista: não pausa', () => {
    const { estado, eventos, elementos, rolarCartaPara } = montar({ toque: false });
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];
    eventos.emit('bosque:pronto');
    estado.definirFase('convite');

    rolarCartaPara(-200, 560, { w: 1366, h: 768 });

    expect(elemento.pausar).not.toHaveBeenCalled();
  });

  it('antes da fase convite, rolar não pausa nada (a página nem rola)', () => {
    const { eventos, elementos, rolarCartaPara } = montar();
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];
    eventos.emit('bosque:pronto');

    rolarCartaPara(20, 345, CELULAR);

    expect(elemento.pausar).not.toHaveBeenCalled();
  });
});

describe('cena viva: níveis e medição de quadros (SPEC-18, "Níveis")', () => {
  /** Dispara quadros até passar a janela de medição (2 s). */
  function quadros(
    ticker: ReturnType<typeof criarTickerFalso>,
    intervaloEmMs: number,
    segundos = 2.2,
  ) {
    const total = Math.ceil((segundos * 1000) / intervaloEmMs);
    for (let i = 0; i < total; i += 1) ticker.quadro(intervaloEmMs);
  }

  it('quadros lentos medidos fazem o nível descer para leve, uma vez, e nunca subir (CT-18.8)', () => {
    const { eventos, elementos, ticker } = montar();
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];
    eventos.emit('bosque:pronto');

    quadros(ticker, 40);
    quadros(ticker, 16); // a cena melhora: o nível não volta

    expect(elemento.aoMudarNivel).toHaveBeenCalledTimes(1);
    expect(elemento.aoMudarNivel).toHaveBeenCalledWith('leve');
    expect(elemento.iniciar).toHaveBeenCalledTimes(1);
    expect(ticker.escutas()).toBe(0);
  });

  it('quadros rápidos mantêm o nível completo', () => {
    const { eventos, elementos, ticker } = montar();
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];
    eventos.emit('bosque:pronto');

    quadros(ticker, 16);

    expect(elemento.aoMudarNivel).not.toHaveBeenCalled();
  });

  it('a aba em segundo plano zera a medida: ela recomeça ao voltar', () => {
    const { eventos, elementos, ticker } = montar();
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];
    eventos.emit('bosque:pronto');
    quadros(ticker, 40, 1.5); // quase a janela inteira, com quadros lentos

    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    quadros(ticker, 40, 1); // só 1 s depois de voltar: ainda não há veredito

    expect(elemento.aoMudarNivel).not.toHaveBeenCalled();
  });

  it('o rebaixamento chega a todos os elementos vivos e ignora quem já falhou', () => {
    const falha = criarElementoFalso(() => {
      throw new Error('quebrou');
    });
    const saudavel = criarElementoFalso();
    const { eventos, ticker } = montar({ elementos: [falha, saudavel] });
    eventos.emit('bosque:pronto');

    quadros(ticker, 40);

    expect(saudavel.aoMudarNivel).toHaveBeenCalledWith('leve');
    expect(falha.aoMudarNivel).not.toHaveBeenCalled();
  });
});

describe('cena viva: erro num elemento (SPEC-18, "Casos de borda")', () => {
  it('o elemento que lança em iniciar é parado com aviso, os outros seguem e a fase não muda (CT-18.9)', () => {
    const falha = criarElementoFalso(() => {
      throw new Error('quebrou');
    });
    const saudavel = criarElementoFalso();
    const { eventos, estado, avisar } = montar({ elementos: [falha, saudavel] });
    const fase = estado.fase;

    eventos.emit('bosque:pronto');

    expect(falha.parar).toHaveBeenCalledTimes(1);
    expect(avisar).toHaveBeenCalledTimes(1);
    expect(saudavel.iniciar).toHaveBeenCalledWith('completo');
    expect(estado.fase).toBe(fase);
    expect(estado.fase).not.toBe('seguranca');
  });

  it('o elemento que lança ao pausar também é esquecido: não recebe mais nada', () => {
    const quebradico = criarElementoFalso();
    quebradico.pausar.mockImplementation(() => {
      throw new Error('quebrou');
    });
    const { eventos, estado, rolarCartaPara, avisar } = montar({ elementos: [quebradico] });
    eventos.emit('bosque:pronto');
    estado.definirFase('convite');

    rolarCartaPara(20, 345, CELULAR);
    rolarCartaPara(400, 345, CELULAR);

    expect(avisar).toHaveBeenCalledTimes(1);
    expect(quebradico.parar).toHaveBeenCalledTimes(1);
    expect(quebradico.retomar).not.toHaveBeenCalled();
  });

  it('se até o parar do elemento falha, a cena viva segue e só avisa uma vez', () => {
    const teimoso = criarElementoFalso(() => {
      throw new Error('quebrou ao iniciar');
    });
    teimoso.parar.mockImplementation(() => {
      throw new Error('quebrou ao parar');
    });
    const { eventos, avisar } = montar({ elementos: [teimoso] });

    expect(() => {
      eventos.emit('bosque:pronto');
    }).not.toThrow();
    expect(avisar).toHaveBeenCalledTimes(1);
  });
});

describe('cena viva: "Pausar animação" (SPEC-18, RF-18.9, US-13.6)', () => {
  it('o botão aparece ao lado do de som quando a cena aparece (CT-18.13)', () => {
    const { eventos, botao } = montar({ comBotaoDeSom: true });

    eventos.emit('bosque:pronto');

    const som = document.querySelector('.botao-som');
    expect(botao()).not.toBeNull();
    expect(som?.nextElementSibling).toBe(botao());
    expect(botao()?.getAttribute('aria-label')).toBe(content.dicas.pausarAnimacao);
  });

  it('tocar pausa todos os elementos, grava a escolha e troca o nome; tocar de novo retoma (CT-18.13)', () => {
    const { eventos, elementos, botao, estado, gravar } = montar();
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];
    eventos.emit('bosque:pronto');

    botao()?.click();

    expect(elemento.pausar).toHaveBeenCalledTimes(1);
    expect(estado.movimentoLigado).toBe(false);
    expect(gravar).toHaveBeenCalledWith('convite:movimento', false);
    expect(botao()?.getAttribute('aria-label')).toBe(content.dicas.retomarAnimacao);
    expect(botao()?.getAttribute('data-pausado')).toBe('true');

    botao()?.click();

    expect(elemento.retomar).toHaveBeenCalledTimes(1);
    expect(estado.movimentoLigado).toBe(true);
    expect(botao()?.getAttribute('aria-label')).toBe(content.dicas.pausarAnimacao);
  });

  it('com a pausa gravada numa visita anterior, a vida começa desligada, mas o botão permite retomar (CT-18.13)', () => {
    const { eventos, elementos, botao } = montar({ movimentoLigado: false });
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];

    eventos.emit('bosque:pronto');

    expect(elemento.iniciar).not.toHaveBeenCalled();
    expect(botao()?.getAttribute('aria-label')).toBe(content.dicas.retomarAnimacao);

    botao()?.click();

    expect(elemento.iniciar).toHaveBeenCalledWith('completo');
    expect(elemento.pausar).not.toHaveBeenCalled();
  });

  it('retomar depois de a carta cobrir a cena continua pausado até ela descobrir', () => {
    const { estado, eventos, elementos, botao, rolarCartaPara } = montar();
    const [elemento] = elementos as [ReturnType<typeof criarElementoFalso>];
    eventos.emit('bosque:pronto');
    estado.definirFase('convite');
    rolarCartaPara(20, 345, CELULAR); // coberta: pausa
    botao()?.click(); // convidado pausa também
    botao()?.click(); // e retoma, mas a carta ainda cobre

    expect(elemento.pausar).toHaveBeenCalledTimes(1);
    expect(elemento.retomar).not.toHaveBeenCalled();

    rolarCartaPara(400, 345, CELULAR);

    expect(elemento.retomar).toHaveBeenCalledTimes(1);
  });
});
