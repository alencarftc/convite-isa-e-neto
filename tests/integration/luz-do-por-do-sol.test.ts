import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  concluirLuzDoPorDoSol,
  iniciarLuzDoPorDoSol,
  opacidadeDoCeuDoPorDoSol,
  pararLuzDoPorDoSol,
} from '@/presentation/bosque/luz-do-por-do-sol';

import {
  type AnimacoesFalsas,
  instalarAnimacoesFalsas,
  semAnimate,
} from './suporte/animacoes-falsas';

let animacoes: AnimacoesFalsas;

/** A cena com os dois céus (baunilha e pôr do sol) e a luz; a arte do pôr do sol pode estar carregada ou não. */
function montar(artePronta = true) {
  document.body.innerHTML = '';
  const raiz = document.createElement('div');
  const criar = (classe: string, comImagem = false) => {
    const camada = document.createElement('picture');
    camada.className = `camada ${classe}`;
    if (comImagem) {
      const imagem = document.createElement('img');
      Object.defineProperty(imagem, 'complete', { configurable: true, value: artePronta });
      Object.defineProperty(imagem, 'naturalWidth', {
        configurable: true,
        value: artePronta ? 941 : 0,
      });
      camada.append(imagem);
    }
    return camada;
  };
  const ceu = criar('camada--ceu');
  const sol = criar('camada--ceu-sol', true);
  const luz = criar('camada--luz');
  raiz.append(ceu, sol, luz);
  document.body.append(raiz);
  return { raiz, ceu, sol, luz };
}

beforeEach(() => {
  animacoes = instalarAnimacoesFalsas();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('luz do pôr do sol pelo navegador (ADR-0050)', () => {
  it('anima o céu do pôr do sol e a luz, de onde estão até 1, e devolve true', () => {
    const { raiz, sol, luz } = montar();
    sol.style.opacity = '0.25';

    const rodou = iniciarLuzDoPorDoSol(raiz, 26, 'power1.out');

    expect(rodou).toBe(true);
    expect(animacoes.doElemento(sol)[0]?.quadros).toEqual([{ opacity: 0.25 }, { opacity: 1 }]);
    expect(animacoes.doElemento(luz)[0]?.quadros).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(animacoes.doElemento(sol)[0]?.opcoes).toMatchObject({
      duration: 26000,
      fill: 'forwards',
    });
  });

  it('sem Element.animate devolve false, para quem chamou usar o GSAP', () => {
    const restaurar = semAnimate();
    const { raiz } = montar();

    expect(iniciarLuzDoPorDoSol(raiz, 26, 'power1.out')).toBe(false);

    restaurar();
  });

  it('ao terminar deixa opacidade 1 no estilo, solta a animação e tira o céu de baunilha, que ficou coberto', () => {
    const { raiz, ceu, sol, luz } = montar();
    iniciarLuzDoPorDoSol(raiz, 26, 'power1.out');

    animacoes.terminarTodas();

    expect(sol.style.opacity).toBe('1');
    expect(luz.style.opacity).toBe('1');
    expect(animacoes.vivas()).toHaveLength(0);
    expect(ceu.style.visibility).toBe('hidden');
  });

  it('se a arte do pôr do sol não chegou, o céu de baunilha é o único céu e fica à vista', () => {
    const { raiz, ceu } = montar(false);

    concluirLuzDoPorDoSol(raiz);

    expect(ceu.style.visibility).toBe('');
  });

  it('parar cancela a animação sem tocar no céu de baunilha', () => {
    const { raiz, ceu } = montar();
    iniciarLuzDoPorDoSol(raiz, 26, 'power1.out');

    pararLuzDoPorDoSol(raiz);

    expect(animacoes.vivas()).toHaveLength(0);
    expect(ceu.style.visibility).toBe('');
  });

  it('a opacidade atual vem do estilo calculado enquanto a animação roda, e do estilo do elemento quando não há animação', () => {
    const { raiz, sol } = montar();
    sol.style.opacity = '0.4';
    expect(opacidadeDoCeuDoPorDoSol(raiz)).toBeCloseTo(0.4);

    iniciarLuzDoPorDoSol(raiz, 26, 'power1.out');
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ opacity: '0.8' } as CSSStyleDeclaration);

    expect(opacidadeDoCeuDoPorDoSol(raiz)).toBeCloseTo(0.8);
  });
});
