import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { config as configReal } from '@/config/config';
import type { ConfigConvite } from '@/domain/config/config-convite';
import { criarAgua } from '@/presentation/vida/agua';

import { criarEstadoFalso } from './suporte/estado-falso';
import { criarRelogioManual } from './suporte/relogio-gsap';
import { criarTickerFalso } from './suporte/ticker-falso';
import { instalarWebGLFalso, type WebGLFalso } from './suporte/webgl-falso';

/** Um quadro de 40 ms: a água a 30 por segundo (ADR-0050) sempre desenha nele. */
const QUADRO_QUE_DESENHA = 40;

/** Largura da imagem do lago (o happy-dom não decodifica imagens). */
const LARGURA_DA_IMAGEM = 1536;

let webgl: WebGLFalso | undefined;
let relogio: ReturnType<typeof criarRelogioManual> | undefined;

function montar(
  opcoes: {
    webgl?: boolean;
    carregada?: boolean;
    config?: ConfigConvite;
    modo?: 'vertical' | 'horizontal';
    toque?: boolean;
  } = {},
) {
  document.body.innerHTML = '';
  const raiz = document.createElement('div');
  const lago = document.createElement('picture');
  lago.className = 'camada camada--lago';
  const imagem = document.createElement('img');
  Object.defineProperty(imagem, 'naturalWidth', {
    configurable: true,
    value: opcoes.carregada === false ? 0 : LARGURA_DA_IMAGEM,
  });
  Object.defineProperty(imagem, 'naturalHeight', { configurable: true, value: 563 });
  lago.append(imagem);
  const sol = document.createElement('picture');
  sol.className = 'camada camada--ceu-sol';
  raiz.append(lago, sol);
  document.body.append(raiz);

  const { estado, girar } = criarEstadoFalso({
    orientacao: opcoes.modo ?? 'vertical',
    ...(opcoes.toque === undefined ? {} : { toque: opcoes.toque }),
  });
  const ticker = criarTickerFalso();
  const configuracao = opcoes.config ?? configReal;
  const agua = criarAgua({
    raiz,
    config: configuracao,
    estado,
    capacidades: { suportaWebGL: () => opcoes.webgl ?? true },
    ticker,
  });
  const canvas = () => lago.querySelector<HTMLCanvasElement>('canvas.ondulacao');
  return { agua, ticker, lago, imagem, sol, canvas, estado, girar, config: configuracao };
}

beforeEach(() => {
  webgl = instalarWebGLFalso();
  relogio = criarRelogioManual();
});
afterEach(() => {
  webgl?.desinstalar();
  relogio?.restaurar();
  vi.restoreAllMocks();
});

describe('água viva (SPEC-19)', () => {
  it('sem WebGL a água não cria nada e a imagem do lago segue como está, sem erro (CT-19.3)', () => {
    const { agua, canvas, ticker, lago } = montar({ webgl: false });

    expect(() => {
      agua.iniciar('completo');
    }).not.toThrow();

    expect(canvas()).toBeNull();
    expect(ticker.escutas()).toBe(0);
    expect(lago.querySelector('img')).not.toBeNull();
    expect(webgl?.contar('drawArrays')).toBe(0);
  });

  it('um contexto que não sai (navegador recusa) também deixa o lago parado, sem erro', () => {
    webgl?.desinstalar();
    // Sem `getContext` falso, o happy-dom devolve `null`: o mesmo que um navegador sem WebGL de verdade.
    const { agua, canvas, ticker } = montar();

    expect(() => {
      agua.iniciar('completo');
    }).not.toThrow();

    expect(canvas()).toBeNull();
    expect(ticker.escutas()).toBe(0);
  });

  it('o canvas entra dentro da camada do lago, decorativo, e só aparece depois do primeiro quadro (RF-19.1, RF-19.6)', () => {
    const { agua, canvas, ticker } = montar();

    agua.iniciar('completo');

    expect(canvas()?.getAttribute('aria-hidden')).toBe('true');
    expect(canvas()?.parentElement?.className).toBe('camada camada--lago');
    expect(canvas()?.style.opacity).toBe('0');
    expect(webgl?.contar('drawArrays')).toBe(0);

    ticker.quadro(QUADRO_QUE_DESENHA);
    relogio?.avancar(config().vida.agua.aparece + 0.1);

    expect(webgl?.contar('drawArrays')).toBe(1);
    expect(canvas()?.style.opacity).toBe('1');
  });

  it('desenha uma única chamada por desenho no nível completo (CT-19.4)', () => {
    const { agua, ticker } = montar();
    agua.iniciar('completo');

    for (let i = 0; i < 10; i += 1) ticker.quadro(QUADRO_QUE_DESENHA);

    expect(webgl?.contar('drawArrays')).toBe(10);
  });

  it('também no nível completo a água desenha a 30 quadros por segundo: num aparelho de 144 Hz não é um canvas de tela cheia por quadro (ADR-0050)', () => {
    const { agua, ticker } = montar();
    agua.iniciar('completo');

    for (let i = 0; i < 144; i += 1) ticker.quadro(1000 / 144); // um segundo de um aparelho de 144 Hz

    const desenhos = webgl?.contar('drawArrays') ?? 0;
    expect(desenhos).toBeGreaterThanOrEqual(26);
    expect(desenhos).toBeLessThanOrEqual(32);
  });

  it('um erro ao desenhar para a água e o lago volta a ser a pintura parada: o erro não escapa do quadro (11/11/2026)', () => {
    // Antes o erro subia ao `error` da janela e levava o convite inteiro ao modo de segurança (caixa do lago sem tamanho).
    const base = document.createElement('canvas').getContext('webgl') as object;
    const quebrado = new Proxy(base, {
      get(alvo, nome) {
        if (nome === 'drawArrays') {
          return () => {
            throw new RangeError('A imagem e a caixa precisam ter largura e altura positivas');
          };
        }
        return Reflect.get(alvo, nome) as unknown;
      },
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => quebrado as never);
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { agua, ticker, canvas } = montar();
    agua.iniciar('completo');
    expect(canvas()).not.toBeNull();

    expect(() => {
      ticker.quadro(QUADRO_QUE_DESENHA);
    }).not.toThrow();

    expect(aviso).toHaveBeenCalledWith('[convite] água parada', expect.any(RangeError));
    expect(canvas()).toBeNull(); // a água parou e o canvas saiu
    expect(() => {
      ticker.quadro(QUADRO_QUE_DESENHA); // e nada mais é desenhado
    }).not.toThrow();
  });

  it('no nível leve desenha um quadro a cada dois de 60 Hz (CT-19.4)', () => {
    const { agua, ticker } = montar();
    agua.iniciar('leve');

    for (let i = 0; i < 10; i += 1) ticker.quadro(16.7);

    expect(webgl?.contar('drawArrays')).toBe(5);
  });

  it('descer para o nível leve no meio da vida passa a desenhar a 30 quadros por segundo e baixa a resolução', () => {
    const { agua, ticker } = montar();
    agua.iniciar('completo');
    for (let i = 0; i < 4; i += 1) ticker.quadro(16.7);
    const antes = webgl?.contar('drawArrays') ?? 0;

    agua.aoMudarNivel('leve');
    for (let i = 0; i < 10; i += 1) ticker.quadro(16.7);

    expect((webgl?.contar('drawArrays') ?? 0) - antes).toBe(5);
    expect(webgl?.contar('viewport')).toBeGreaterThanOrEqual(2); // montou e redimensionou ao mudar o nível
  });

  it('o brilho dos reflexos acompanha a opacidade do céu do pôr do sol, do mínimo ao máximo (CT-19.7, RF-19.5)', () => {
    const { agua, ticker, sol } = montar();
    const { brilhoMinimo, brilhoMaximo } = config().vida.agua.reflexos;
    agua.iniciar('completo');

    ticker.quadro(QUADRO_QUE_DESENHA);
    expect(webgl?.valorDoUniforme('u_brilho')?.[0]).toBeCloseTo(brilhoMinimo);

    sol.style.opacity = '0.5';
    ticker.quadro(QUADRO_QUE_DESENHA);
    expect(webgl?.valorDoUniforme('u_brilho')?.[0]).toBeCloseTo((brilhoMinimo + brilhoMaximo) / 2);

    sol.style.opacity = '1'; // com Pular a opacidade já é 1
    ticker.quadro(QUADRO_QUE_DESENHA);
    expect(webgl?.valorDoUniforme('u_brilho')?.[0]).toBeCloseTo(brilhoMaximo);
  });

  it('o tempo da água só anda quando ela desenha: pausar e retomar não dá salto', () => {
    const { agua, ticker } = montar();
    agua.iniciar('completo');
    ticker.quadro(1000);
    const antes = webgl?.valorDoUniforme('u_tempo')?.[0] as number;

    agua.pausar();
    ticker.quadro(5000); // o ticker nem a chama: está fora dele
    agua.retomar();
    ticker.quadro(1000);

    const depois = webgl?.valorDoUniforme('u_tempo')?.[0] as number;
    expect(depois - antes).toBeCloseTo(1);
  });

  it('pausar tira o desenho do ticker e retomar o devolve (RF-19.8)', () => {
    const { agua, ticker } = montar();
    agua.iniciar('completo');
    expect(ticker.escutas()).toBe(1);

    agua.pausar();
    expect(ticker.escutas()).toBe(0);

    agua.retomar();
    expect(ticker.escutas()).toBe(1);
  });

  it('parar apaga textura, buffer e programa, devolve o contexto e tira o canvas (RF-19.8, CT-19.4)', () => {
    const { agua, ticker, canvas } = montar();
    agua.iniciar('completo');
    ticker.quadro(QUADRO_QUE_DESENHA);

    agua.parar();

    expect(webgl?.contar('deleteTexture')).toBe(1);
    expect(webgl?.contar('deleteBuffer')).toBe(1);
    expect(webgl?.contar('deleteProgram')).toBe(1);
    expect(webgl?.contar('loseContext')).toBe(1);
    expect(canvas()).toBeNull();
    expect(ticker.escutas()).toBe(0);
  });

  it('parar duas vezes não apaga duas vezes', () => {
    const { agua } = montar();
    agua.iniciar('completo');

    agua.parar();
    agua.parar();

    expect(webgl?.contar('deleteProgram')).toBe(1);
  });

  it('perder o contexto tira o canvas e para de desenhar, sem mudar a fase (CT-19.5)', () => {
    const { agua, ticker, canvas, estado } = montar();
    agua.iniciar('completo');
    ticker.quadro(QUADRO_QUE_DESENHA);
    const fase = estado.fase;

    canvas()?.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));

    expect(canvas()).toBeNull();
    expect(ticker.escutas()).toBe(0);
    expect(estado.fase).toBe(fase);
    expect(estado.fase).not.toBe('seguranca');
  });

  it('se a imagem do lago ainda não carregou, espera o load antes de montar o canvas', () => {
    const { agua, canvas, imagem, ticker } = montar({ carregada: false });
    agua.iniciar('completo');
    expect(canvas()).toBeNull();

    Object.defineProperty(imagem, 'naturalWidth', { configurable: true, value: LARGURA_DA_IMAGEM });
    imagem.dispatchEvent(new Event('load'));

    expect(canvas()).not.toBeNull();
    expect(ticker.escutas()).toBe(1);
  });

  it('parar enquanto espera o load não monta nada depois', () => {
    const { agua, canvas, imagem } = montar({ carregada: false });
    agua.iniciar('completo');
    agua.parar();

    Object.defineProperty(imagem, 'naturalWidth', { configurable: true, value: LARGURA_DA_IMAGEM });
    imagem.dispatchEvent(new Event('load'));

    expect(canvas()).toBeNull();
  });

  it('o load da imagem (o navegador trocou a arte) envia a textura de novo (RF-19.2)', () => {
    const { agua, imagem } = montar();
    agua.iniciar('completo');
    const antes = webgl?.contar('texImage2D') ?? 0;

    imagem.dispatchEvent(new Event('load'));

    expect(webgl?.contar('texImage2D')).toBe(antes + 1);
  });

  it('a textura é enviada com alfa pré-multiplicado, sem halo nas bordas (RNF-19.3)', () => {
    const { agua } = montar();

    agua.iniciar('completo');

    const pre = webgl?.chamadas.find((c) => c.nome === 'pixelStorei');
    expect(pre?.argumentos[1]).toBe(true);
  });

  it('girar o aparelho troca a região da água para a da outra orientação', () => {
    const horizontal = { tipo: 'faixa', inicio: 0.4, borda: 0.07 } as const;
    const personalizada: ConfigConvite = {
      ...configReal,
      vida: {
        ...configReal.vida,
        agua: { ...configReal.vida.agua, regiao: { ...configReal.vida.agua.regiao, horizontal } },
      },
    };
    const { agua, ticker, girar } = montar({ config: personalizada });
    agua.iniciar('completo');
    ticker.quadro(QUADRO_QUE_DESENHA);
    // Na vertical a água é uma elipse sobre o lago da cena mestre (ADR-0015); na horizontal, uma faixa.
    expect(config().vida.agua.regiao.vertical.tipo).toBe('elipse');
    expect(webgl?.valorDoUniforme('u_nElipses')).toEqual([1]);

    girar('horizontal');
    ticker.quadro(QUADRO_QUE_DESENHA);

    expect(webgl?.valorDoUniforme('u_faixa')).toEqual([0.4, 0.07]);
    expect(webgl?.valorDoUniforme('u_nElipses')).toEqual([0]);
  });

  it('no computador (mouse, tela horizontal) a região é a elipse do lago da pintura mestre 16:9, não a faixa das camadas (09/11/2026)', () => {
    const computador = montar({ modo: 'horizontal', toque: false });
    computador.agua.iniciar('completo');
    computador.ticker.quadro(QUADRO_QUE_DESENHA);

    expect(config().vida.agua.regiao.computador.tipo).toBe('elipse');
    expect(webgl?.valorDoUniforme('u_nElipses')).toEqual([1]);
  });

  it('o celular deitado e o tablet (toque, horizontal) seguem na faixa das camadas', () => {
    const deitado = montar({ modo: 'horizontal', toque: true });
    deitado.agua.iniciar('completo');
    deitado.ticker.quadro(QUADRO_QUE_DESENHA);

    expect(webgl?.valorDoUniforme('u_nElipses')).toEqual([0]);
    expect(webgl?.valorDoUniforme('u_faixa')).toEqual([0.53, 0.05]);
  });

  it('a janela do computador que fica mais alta que larga continua na região do lago da pintura 16:9 (não vira a do celular)', () => {
    const { agua, ticker, girar } = montar({ modo: 'horizontal', toque: false });
    agua.iniciar('completo');
    ticker.quadro(QUADRO_QUE_DESENHA);
    const doComputador = webgl?.valorDoUniforme('u_elipses');

    girar('vertical');
    ticker.quadro(QUADRO_QUE_DESENHA);

    expect(webgl?.valorDoUniforme('u_nElipses')).toEqual([1]);
    expect(webgl?.valorDoUniforme('u_elipses')).toEqual(doComputador);
  });

  it('o celular que gira continua trocando a região da água pela da outra orientação', () => {
    const { agua, ticker, girar } = montar({ modo: 'vertical', toque: true });
    agua.iniciar('completo');
    ticker.quadro(QUADRO_QUE_DESENHA);
    expect(webgl?.valorDoUniforme('u_nElipses')).toEqual([1]);

    girar('horizontal');
    ticker.quadro(QUADRO_QUE_DESENHA);

    expect(webgl?.valorDoUniforme('u_nElipses')).toEqual([0]);
  });

  it('a faixa e as ondas vêm da configuração, com a amplitude convertida para a caixa', () => {
    const { agua, ticker } = montar();
    agua.iniciar('completo');

    ticker.quadro(QUADRO_QUE_DESENHA);

    expect(webgl?.valorDoUniforme('u_frequencia')).toEqual([config().vida.agua.onda.frequencia]);
    expect(webgl?.valorDoUniforme('u_perspectiva')).toEqual([config().vida.agua.onda.perspectiva]);
    expect(webgl?.valorDoUniforme('u_nElipses')).toEqual([1]); // a vertical é a orientação de partida
  });
});

function config(): ConfigConvite {
  return configReal;
}
