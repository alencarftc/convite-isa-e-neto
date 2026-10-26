import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/config/config';
import { ligarGestoDoSelo } from '@/presentation/carta/gesto-do-selo';

const { gesto } = config.carta;

/** O selo fica em (100, 100) com 60 × 60 px, que é onde o dedo precisa pousar. */
const SELO = { left: 100, top: 100, right: 160, bottom: 160 };

function montar(reduzido = false) {
  document.body.innerHTML = '<button id="botao"></button><div id="selo"></div>';
  const botao = document.querySelector<HTMLElement>('#botao');
  const selo = document.querySelector<HTMLElement>('#selo');
  if (!botao || !selo) throw new Error('DOM de teste');
  vi.spyOn(selo, 'getBoundingClientRect').mockReturnValue({
    ...SELO,
    x: SELO.left,
    y: SELO.top,
    width: 60,
    height: 60,
    toJSON: () => ({}),
  });
  botao.setPointerCapture = vi.fn();
  botao.releasePointerCapture = vi.fn();
  botao.hasPointerCapture = vi.fn(() => true);

  const aoAbrir = vi.fn();
  const controle = new AbortController();
  const gestoDoSelo = ligarGestoDoSelo({
    botao,
    selo,
    gesto,
    mola: config.curvas.mola,
    reduzido,
    aoAbrir,
    signal: controle.signal,
  });

  const ponteiro = (tipo: string, x: number, y: number, id = 1) =>
    botao.dispatchEvent(
      new PointerEvent(tipo, {
        pointerId: id,
        clientX: x,
        clientY: y,
        isPrimary: true,
        bubbles: true,
      }),
    );
  /** O dedo pousa no meio do selo e anda `dx`, `dy` a partir dali. */
  const arrastar = (dx: number, dy: number, soltar = true) => {
    ponteiro('pointerdown', 130, 130);
    ponteiro('pointermove', 130 + dx, 130 + dy);
    if (soltar) ponteiro('pointerup', 130 + dx, 130 + dy);
  };
  const posicao = () => ({
    x: Number(gsap.getProperty(selo, 'x')),
    y: Number(gsap.getProperty(selo, 'y')),
  });

  return { botao, selo, aoAbrir, controle, gestoDoSelo, ponteiro, arrastar, posicao };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('gesto de deslizar o selo (SPEC-16)', () => {
  it('arrastar mais que o limiar abre o envelope (CT-16.1)', () => {
    const { aoAbrir, arrastar } = montar();

    arrastar(0, gesto.limiar + 1);

    expect(aoAbrir).toHaveBeenCalledTimes(1);
  });

  it('arrastar para o lado também abre', () => {
    const { aoAbrir, arrastar } = montar();

    arrastar(-(gesto.limiar + 5), 0);

    expect(aoAbrir).toHaveBeenCalledTimes(1);
  });

  it('arrastar menos que o limiar não abre: o selo volta ao lugar com a mola (CT-16.1)', () => {
    const { aoAbrir, arrastar, posicao } = montar();

    arrastar(0, gesto.limiar - 10);
    expect(aoAbrir).not.toHaveBeenCalled();

    gsap.globalTimeline.progress(1); // termina a mola
    vi.advanceTimersByTime(gesto.retorno * 1000 + 100);
    expect(posicao().y).toBeCloseTo(0, 1);
  });

  it('para cima não abre, por mais que o dedo ande', () => {
    const { aoAbrir, arrastar } = montar();

    arrastar(0, -300);

    expect(aoAbrir).not.toHaveBeenCalled();
  });

  it('o selo acompanha o dedo com resistência e nunca passa do limite (RF-16.3, RNF-16.2)', () => {
    const { arrastar, posicao } = montar();

    arrastar(0, 40, false);
    const emQuarenta = posicao().y;
    arrastar(0, 5000, false);
    const noExtremo = posicao().y;

    expect(emQuarenta).toBeGreaterThan(0);
    expect(emQuarenta).toBeLessThan(40); // resistência: o selo anda menos que o dedo
    expect(noExtremo).toBeLessThanOrEqual(gesto.limite);
    expect(noExtremo).toBeGreaterThan(emQuarenta);
  });

  it('com animação reduzida o selo não segue o dedo, mas o gesto ainda abre (CT-16.3)', () => {
    const { aoAbrir, arrastar, posicao } = montar(true);

    arrastar(0, 40, false);
    expect(posicao()).toEqual({ x: 0, y: 0 });

    arrastar(0, gesto.limiar + 20);
    expect(aoAbrir).toHaveBeenCalledTimes(1);
  });

  it('um toque comum (sem andar além da folga) não abre pelo gesto: o click cuida', () => {
    const { aoAbrir, arrastar, gestoDoSelo, posicao } = montar();

    arrastar(2, 3);

    expect(aoAbrir).not.toHaveBeenCalled();
    expect(posicao()).toEqual({ x: 0, y: 0 });
    expect(gestoDoSelo.cliqueFoiArrasto()).toBe(false);
  });

  it('depois de um arrasto, o click que o navegador dispara não conta como toque (uma vez só)', () => {
    const { arrastar, gestoDoSelo } = montar();

    arrastar(0, gesto.limiar - 20); // soltou antes do limiar: o selo voltou

    expect(gestoDoSelo.cliqueFoiArrasto()).toBe(true);
    expect(gestoDoSelo.cliqueFoiArrasto()).toBe(false);
  });

  it('a marca de arrasto não sobra para o toque seguinte (touch não dispara click depois de arrastar)', () => {
    const { arrastar, ponteiro, gestoDoSelo } = montar();
    arrastar(0, gesto.limiar - 20);

    ponteiro('pointerdown', 130, 130); // o próximo toque começa

    expect(gestoDoSelo.cliqueFoiArrasto()).toBe(false);
  });

  it('só começa se o dedo pousar sobre o selo: arrastar do resto do envelope não faz nada (RF-16.1)', () => {
    const { aoAbrir, ponteiro } = montar();

    ponteiro('pointerdown', 20, 20);
    ponteiro('pointermove', 20, 200);
    ponteiro('pointerup', 20, 200);

    expect(aoAbrir).not.toHaveBeenCalled();
  });

  it('um segundo dedo não atrapalha o arrasto em andamento', () => {
    const { aoAbrir, ponteiro } = montar();

    ponteiro('pointerdown', 130, 130, 1);
    ponteiro('pointerdown', 130, 130, 2);
    ponteiro('pointermove', 130, 300, 2);
    ponteiro('pointerup', 130, 300, 2);
    expect(aoAbrir).not.toHaveBeenCalled();

    ponteiro('pointermove', 130, 130 + gesto.limiar + 10, 1);
    ponteiro('pointerup', 130, 130 + gesto.limiar + 10, 1);
    expect(aoAbrir).toHaveBeenCalledTimes(1);
  });

  it('cancelar o gesto (o sistema tomou o toque) devolve o selo ao lugar sem abrir', () => {
    const { aoAbrir, ponteiro, posicao } = montar();

    ponteiro('pointerdown', 130, 130);
    ponteiro('pointermove', 130, 130 + gesto.limiar + 30);
    ponteiro('pointercancel', 130, 130 + gesto.limiar + 30);
    gsap.globalTimeline.progress(1);

    expect(aoAbrir).not.toHaveBeenCalled();
    expect(posicao().y).toBeCloseTo(0, 1);
  });

  it('se o navegador recusar a captura do ponteiro, o gesto segue funcionando e nada estoura', () => {
    const { botao, aoAbrir, arrastar } = montar();
    botao.setPointerCapture = vi.fn(() => {
      throw new DOMException('No active pointer with the given id is found.', 'NotFoundError');
    });
    botao.hasPointerCapture = vi.fn(() => {
      throw new DOMException('invalid', 'NotFoundError');
    });

    expect(() => {
      arrastar(0, gesto.limiar + 20);
    }).not.toThrow();

    expect(aoAbrir).toHaveBeenCalledTimes(1);
  });

  it('desligar o sinal remove os ouvintes', () => {
    const { aoAbrir, controle, arrastar } = montar();

    controle.abort();
    arrastar(0, gesto.limiar + 50);

    expect(aoAbrir).not.toHaveBeenCalled();
  });
});
