import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/config/config';
import { content } from '@/config/content';
import { montarCarrossel } from '@/presentation/informacoes/carrossel';

import { criarRelogioManual } from './suporte/relogio-gsap';

const { carrossel: parametros } = config;
const total = content.galeria.length;

let relogio: ReturnType<typeof criarRelogioManual>;
/** Observadores falsos: o teste decide quando o carrossel está na tela. */
let observadores: { chamar: (visivel: boolean) => void }[];

function stubDoObservador(): void {
  observadores = [];
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(aoObservar: (entradas: { isIntersecting: boolean }[]) => void) {
        observadores.push({
          chamar: (visivel) => {
            aoObservar([{ isIntersecting: visivel }]);
          },
        });
      }
      observe() {
        /* o teste chama à mão */
      }
      disconnect() {
        /* nada */
      }
    },
  );
}

function montar(extra: { reduzido?: boolean; fotos?: typeof content.galeria } = {}) {
  document.body.innerHTML = '';
  const carrossel = montarCarrossel({
    fotos: extra.fotos ?? content.galeria,
    rotulo: content.rotulos.galeria,
    rotuloDaFoto: content.rotulos.fotoDaGaleria,
    config,
    reduzido: extra.reduzido ?? false,
  });
  document.body.append(carrossel.elemento);
  const slides = () => [...carrossel.elemento.querySelectorAll<HTMLElement>('.carrossel__slide')];
  const pontos = () => [
    ...carrossel.elemento.querySelectorAll<HTMLButtonElement>('.carrossel__ponto'),
  ];
  const quadro = () => {
    const elemento = carrossel.elemento.querySelector<HTMLElement>('.carrossel__quadro');
    if (!elemento) throw new Error('sem quadro');
    return elemento;
  };
  const slide = (indice: number) => {
    const elemento = slides()[indice];
    if (!elemento) throw new Error(`sem slide ${String(indice)}`);
    return elemento;
  };
  const foto = (indice: number) => {
    const elemento = slide(indice).querySelector('.carrossel__foto');
    if (!elemento) throw new Error(`sem foto ${String(indice)}`);
    return elemento;
  };
  const opacidade = (indice: number) => Number(gsap.getProperty(slide(indice), 'opacity'));
  /** Qual foto está à vista: a única com o ponto marcado. */
  const atual = () => pontos().findIndex((ponto) => ponto.getAttribute('aria-current') === 'true');
  const arrastar = (de: number, para: number) => {
    quadro().dispatchEvent(new MouseEvent('pointerdown', { clientX: de }));
    quadro().dispatchEvent(new MouseEvent('pointerup', { clientX: para }));
  };
  return { carrossel, slides, slide, foto, pontos, quadro, opacidade, atual, arrastar };
}

beforeEach(() => {
  // Sem observador: o carrossel se considera sempre na tela (navegador antigo), a não ser que o teste ponha o seu.
  vi.stubGlobal('IntersectionObserver', undefined);
  relogio = criarRelogioManual();
});
afterEach(() => {
  relogio.restaurar();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('o carrossel de fotos do casal (08/11/2026)', () => {
  describe('estrutura e acessibilidade', () => {
    it('é um grupo nomeado de carrossel, com um slide e um ponto por foto', () => {
      const { carrossel, slides, pontos } = montar();

      expect(carrossel.elemento.getAttribute('role')).toBe('group');
      expect(carrossel.elemento.getAttribute('aria-roledescription')).toBe('carrossel');
      expect(carrossel.elemento.getAttribute('aria-label')).toBe(content.rotulos.galeria);
      expect(slides()).toHaveLength(total);
      expect(pontos()).toHaveLength(total);
      carrossel.destruir();
    });

    it('cada foto tem o texto alternativo, a própria legenda "Foto n de total" e carrega só perto da tela', () => {
      const { carrossel, slides } = montar();

      slides().forEach((slide, indice) => {
        const foto = slide.querySelector<HTMLImageElement>('.carrossel__foto');
        const fundo = slide.querySelector<HTMLImageElement>('.carrossel__fundo');
        expect(foto?.alt).toBe(content.galeria[indice]?.alt);
        expect(foto?.getAttribute('loading')).toBe('lazy');
        expect(foto?.getAttribute('src')).toBe(content.galeria[indice]?.foto);
        expect(fundo?.alt).toBe('');
        expect(fundo?.getAttribute('aria-hidden')).toBe('true');
        expect(slide.getAttribute('aria-roledescription')).toBe('slide');
        expect(slide.getAttribute('aria-label')).toBe(
          `Foto ${String(indice + 1)} de ${String(total)}`,
        );
      });
      carrossel.destruir();
    });

    it('só a foto à vista fica exposta ao leitor de tela, e o quadro não anuncia as trocas (aria-live desligado)', () => {
      const { carrossel, slides, quadro } = montar();

      expect(slides().map((s) => s.getAttribute('aria-hidden'))).toEqual(
        content.galeria.map((_, i) => (i === 0 ? 'false' : 'true')),
      );
      expect(quadro().getAttribute('aria-live')).toBe('off');
      carrossel.destruir();
    });

    it('cada ponto é um botão com nome e a primeira foto começa marcada; a primeira aparece, as outras não', () => {
      const { carrossel, pontos, atual, opacidade } = montar();

      for (const ponto of pontos()) {
        expect(ponto.tagName).toBe('BUTTON');
        expect(ponto.type).toBe('button');
        expect(ponto.getAttribute('aria-label')).toMatch(/^Foto \d de \d$/);
      }
      expect(atual()).toBe(0);
      expect(opacidade(0)).toBe(1);
      expect(opacidade(1)).toBe(0);
      carrossel.destruir();
    });
  });

  describe('a troca automática', () => {
    it('troca sozinha a cada `intervalo`, com uma passagem suave, e a próxima foto toma o lugar', () => {
      const { carrossel, atual, opacidade, slide } = montar();

      relogio.avancar(parametros.intervalo - 0.1, 0.01);
      expect(atual()).toBe(0);

      relogio.avancar(0.1 + parametros.transicao / 2, 0.01);
      expect(atual()).toBe(1);
      // No meio da troca: a que sai já esmaeceu um pouco e a que chega ainda está chegando.
      expect(opacidade(0)).toBeLessThan(1);
      expect(opacidade(1)).toBeGreaterThan(0);
      expect(opacidade(1)).toBeLessThan(1);
      expect(Number(gsap.getProperty(slide(1), 'xPercent'))).not.toBe(0);

      relogio.avancar(parametros.transicao, 0.01);
      expect(opacidade(0)).toBe(0);
      expect(opacidade(1)).toBe(1);
      expect(Number(gsap.getProperty(slide(1), 'xPercent'))).toBe(0);
      carrossel.destruir();
    });

    it('as fotos passam em ordem e, depois da última, voltam à primeira, para sempre', () => {
      const { carrossel, atual } = montar();
      const vistas: number[] = [];

      for (let volta = 0; volta < total * 2; volta += 1) {
        relogio.avancar(parametros.intervalo, 0.05);
        vistas.push(atual());
      }

      expect(vistas.slice(0, total)).toEqual([1, 2, 3, 4, 5, 0]);
      expect(vistas.slice(total)).toEqual([1, 2, 3, 4, 5, 0]);
      carrossel.destruir();
    });

    it('a foto à vista faz um zoom lento (só transform), e a que saiu volta ao tamanho normal', () => {
      const { carrossel, foto } = montar();
      const escala = (indice: number) => Number(gsap.getProperty(foto(indice), 'scale'));

      relogio.avancar(parametros.intervalo - 0.2, 0.01);
      expect(escala(0)).toBeGreaterThan(1);
      expect(escala(0)).toBeLessThanOrEqual(parametros.zoom);

      relogio.avancar(parametros.transicao + 0.3, 0.01);
      expect(escala(0)).toBe(1);
      carrossel.destruir();
    });

    it('só anda com o carrossel na tela: fora dela fica parado, e na tela volta a trocar', () => {
      stubDoObservador();
      const { carrossel, atual } = montar();

      relogio.avancar(parametros.intervalo * 3, 0.05);
      expect(atual()).toBe(0); // ninguém o está vendo

      observadores[0]?.chamar(true);
      relogio.avancar(parametros.intervalo + parametros.transicao, 0.05);
      expect(atual()).toBe(1);

      observadores[0]?.chamar(false);
      relogio.avancar(parametros.intervalo * 3, 0.05);
      expect(atual()).toBe(1); // saiu da tela: parou

      observadores[0]?.chamar(true);
      relogio.avancar(parametros.intervalo + 0.1, 0.05);
      expect(atual()).toBe(2);
      carrossel.destruir();
    });

    it('com uma só foto não troca nada, e sem nenhuma não quebra', () => {
      const umaSo = montar({ fotos: content.galeria.slice(0, 1) });
      relogio.avancar(parametros.intervalo * 3, 0.05);
      expect(umaSo.atual()).toBe(0);
      umaSo.carrossel.destruir();

      expect(() => {
        montar({ fotos: [] }).carrossel.destruir();
      }).not.toThrow();
    });
  });

  describe('o convidado no comando', () => {
    it('tocar num ponto vai direto à foto e a troca automática para de vez', () => {
      const { carrossel, pontos, atual } = montar();

      pontos()[3]?.click();
      expect(atual()).toBe(3);

      relogio.avancar(parametros.intervalo * 10, 0.05);
      expect(atual()).toBe(3);
      carrossel.destruir();
    });

    it('arrastar para a esquerda passa à próxima, para a direita volta, e um arrasto curto não faz nada', () => {
      const { carrossel, arrastar, atual } = montar();

      arrastar(300, 300 - parametros.limiteDoGesto - 5);
      expect(atual()).toBe(1);

      arrastar(100, 100 + parametros.limiteDoGesto + 5);
      expect(atual()).toBe(0);

      arrastar(100, 100 + parametros.limiteDoGesto - 5);
      expect(atual()).toBe(0);
      carrossel.destruir();
    });

    it('arrastar dá a volta: para a direita na primeira vai à última, e a troca automática para', () => {
      const { carrossel, arrastar, atual } = montar();

      arrastar(100, 100 + parametros.limiteDoGesto + 20);
      expect(atual()).toBe(total - 1);

      relogio.avancar(parametros.intervalo * 5, 0.05);
      expect(atual()).toBe(total - 1);
      carrossel.destruir();
    });

    it('as setas do teclado passam as fotos', () => {
      const { carrossel, atual } = montar();

      carrossel.elemento.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      expect(atual()).toBe(1);
      carrossel.elemento.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      expect(atual()).toBe(0);
      carrossel.elemento.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      expect(atual()).toBe(total - 1);
      carrossel.destruir();
    });

    it('troca a marca do ponto e a exposição ao leitor de tela junto com a foto', () => {
      const { carrossel, pontos, slides } = montar();

      pontos()[2]?.click();

      expect(pontos().map((p) => p.getAttribute('aria-current'))).toEqual(
        content.galeria.map((_, i) => (i === 2 ? 'true' : null)),
      );
      expect(slides().map((s) => s.getAttribute('aria-hidden'))).toEqual(
        content.galeria.map((_, i) => (i === 2 ? 'false' : 'true')),
      );
      carrossel.destruir();
    });
  });

  describe('animação reduzida e limpeza', () => {
    it('com animação reduzida nada troca sozinho, e a troca à mão é instantânea, sem deslize nem zoom', () => {
      const { carrossel, atual, opacidade, pontos, slide, foto } = montar({ reduzido: true });

      relogio.avancar(parametros.intervalo * 5, 0.05);
      expect(atual()).toBe(0);

      pontos()[2]?.click();
      expect(atual()).toBe(2);
      expect(opacidade(2)).toBe(1);
      expect(opacidade(0)).toBe(0);
      expect(Number(gsap.getProperty(slide(2), 'xPercent'))).toBe(0);
      expect(Number(gsap.getProperty(foto(2), 'scale'))).toBe(1);
      carrossel.destruir();
    });

    it('destruir para a troca e solta os ouvintes: nada mais muda', () => {
      const { carrossel, pontos, atual } = montar();

      carrossel.destruir();
      relogio.avancar(parametros.intervalo * 5, 0.05);
      pontos()[3]?.click();

      expect(atual()).toBe(0);
    });
  });
});
