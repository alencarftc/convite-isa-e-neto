import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/config/config';
import { content } from '@/config/content';
import { curvaCss } from '@/presentation/animacao/curva-css';
import { montarCarrossel } from '@/presentation/informacoes/carrossel';

import {
  type AnimacoesFalsas,
  instalarAnimacoesFalsas,
  semAnimate,
} from './suporte/animacoes-falsas';
import { criarRelogioManual } from './suporte/relogio-gsap';

const { carrossel: parametros } = config;
const total = content.galeria.length;

let relogio: ReturnType<typeof criarRelogioManual>;
/** As animações do navegador que o carrossel pediu (falsas: o happy-dom não as roda). */
let animacoes: AnimacoesFalsas;
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
  const opacidade = (indice: number) => Number(slide(indice).style.opacity);
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
  animacoes = instalarAnimacoesFalsas();
});
afterEach(() => {
  relogio.restaurar();
  vi.restoreAllMocks();
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
    it('troca sozinha a cada `intervalo`, por animações do navegador (a que chega assenta, a que sai desliza e some), e a próxima foto toma o lugar', () => {
      const { carrossel, atual, opacidade, slide } = montar();
      const { deslocamento, transicao } = parametros;

      relogio.avancar(parametros.intervalo - 0.1, 0.01);
      expect(atual()).toBe(0);
      expect(animacoes.doElemento(slide(1))).toHaveLength(0);

      relogio.avancar(0.1 + 0.02, 0.01);
      expect(atual()).toBe(1);
      const [chega] = animacoes.doElemento(slide(1));
      const [sai] = animacoes.doElemento(slide(0));
      expect(chega?.quadros).toEqual([
        { opacity: 0, transform: `translate3d(${String(deslocamento)}%, 0, 0)` },
        { opacity: 1, transform: 'translate3d(0%, 0, 0)' },
      ]);
      expect(chega?.opcoes).toMatchObject({
        duration: transicao * 1000,
        easing: curvaCss(config.curvas.saida),
        fill: 'both',
      });
      expect(sai?.quadros).toEqual([
        { opacity: 1, transform: 'translate3d(0%, 0, 0)' },
        { opacity: 0, transform: `translate3d(${String(-deslocamento)}%, 0, 0)` },
      ]);
      expect(sai?.opcoes).toMatchObject({ easing: curvaCss(config.curvas.suave), fill: 'both' });
      // Durante a troca a que chega já está visível (ainda transparente) e a que sai segue visível.
      expect(slide(1).style.visibility).toBe('inherit');
      expect(slide(0).style.visibility).toBe('inherit');

      // Ao fim, o estado final vai para o estilo e as animações são canceladas.
      chega?.terminar();
      sai?.terminar();
      expect(opacidade(0)).toBe(0);
      expect(slide(0).style.visibility).toBe('hidden');
      expect(opacidade(1)).toBe(1);
      expect(slide(1).style.visibility).toBe('inherit');
      expect(slide(1).style.transform).toBe('');
      expect(chega?.estado).toBe('cancelled');
      expect(sai?.estado).toBe('cancelled');
      carrossel.destruir();
    });

    it('quando se volta atrás, a foto chega do outro lado (o deslocamento muda de sinal)', () => {
      const { carrossel, pontos, slide } = montar();

      pontos()[2]?.click(); // adiante
      expect(animacoes.doElemento(slide(2))[0]?.quadros[0]).toMatchObject({
        transform: `translate3d(${String(parametros.deslocamento)}%, 0, 0)`,
      });
      pontos()[1]?.click(); // atrás
      expect(animacoes.doElemento(slide(1))[0]?.quadros[0]).toMatchObject({
        transform: `translate3d(${String(-parametros.deslocamento)}%, 0, 0)`,
      });
      carrossel.destruir();
    });

    it('uma troca interrompida por outra vai direto ao fim: a que chegava fica à vista e a que saía some', () => {
      const { carrossel, pontos, slide, opacidade } = montar();

      pontos()[1]?.click(); // 0 → 1, ainda no meio
      pontos()[2]?.click(); // 1 → 2

      expect(opacidade(0)).toBe(0);
      expect(slide(0).style.visibility).toBe('hidden');
      expect(animacoes.doElemento(slide(1)).at(-1)?.estado).toBe('running'); // a 1 agora é a que sai
      expect(slide(2).style.visibility).toBe('inherit');
      carrossel.destruir();
    });

    it('as fotos passam em ordem e, depois da última, voltam à primeira, para sempre', () => {
      const { carrossel, atual } = montar();
      const vistas: number[] = [];

      for (let volta = 0; volta < total * 2; volta += 1) {
        relogio.avancar(parametros.intervalo, 0.05);
        vistas.push(atual());
      }

      // 1, 2, …, total − 1 e de volta ao 0, não importa quantas fotos o casal tenha mandado
      const umaVolta = [...Array.from({ length: total - 1 }, (_, i) => i + 1), 0];
      expect(vistas.slice(0, total)).toEqual(umaVolta);
      expect(vistas.slice(total)).toEqual(umaVolta);
      carrossel.destruir();
    });

    it('a foto à vista faz um zoom lento (só transform) por uma animação do navegador, e o da que saiu acaba quando ela termina de sair', () => {
      const { carrossel, foto, slide } = montar();

      const [zoom] = animacoes.doElemento(foto(0));
      expect(zoom?.quadros).toEqual([
        { transform: 'scale(1)' },
        { transform: `scale(${String(parametros.zoom)})` },
      ]);
      expect(zoom?.opcoes).toMatchObject({
        duration: (parametros.intervalo + parametros.transicao) * 1000,
        easing: 'linear',
        fill: 'both',
      });

      relogio.avancar(parametros.intervalo + 0.02, 0.01); // começa a troca
      expect(zoom?.estado).toBe('paused'); // a foto que sai fica como está
      expect(animacoes.doElemento(foto(1))).toHaveLength(1); // e a que chega começa o dela

      animacoes.terminarTodas(slide(0)); // a foto 0 acabou de sair
      expect(zoom?.estado).toBe('cancelled'); // volta ao tamanho normal
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
      const { carrossel, atual, opacidade, pontos, slide } = montar({ reduzido: true });

      relogio.avancar(parametros.intervalo * 5, 0.05);
      expect(atual()).toBe(0);

      pontos()[2]?.click();
      expect(atual()).toBe(2);
      expect(opacidade(2)).toBe(1);
      expect(opacidade(0)).toBe(0);
      expect(slide(2).style.transform).toBe('');
      expect(slide(0).style.visibility).toBe('hidden');
      expect(animacoes.todas).toHaveLength(0); // nenhuma animação: nem troca, nem zoom
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

  /**
   * O convite piscava, imagem por imagem, no Motorola Edge 70 Fusion+ (144 Hz), sobretudo no carrossel (10/11/2026): eram cinco
   * fotos com camada de GPU permanente, cada uma com um fundo desfocado por trás (ADR-0043), e depois a troca e o zoom por GSAP
   * piscavam de leve (ADR-0044). Agora a troca e o zoom são animações do navegador e as fotos fora de vista ficam
   * `visibility: hidden`.
   */
  describe('camadas de GPU só enquanto a peça se move (10/11/2026)', () => {
    const comWillChange = (carrossel: ReturnType<typeof montar>['carrossel']) =>
      [
        ...carrossel.elemento.querySelectorAll<HTMLElement>('.carrossel__slide, .carrossel__foto'),
      ].filter((el) => el.style.willChange !== '');

    it('só a foto à vista aparece; as outras ficam escondidas (visibility: hidden), não só transparentes', () => {
      const { carrossel, slides } = montar();

      expect(slides().map((s) => s.style.visibility)).toEqual(
        content.galeria.map((_, i) => (i === 0 ? 'inherit' : 'hidden')),
      );
      carrossel.destruir();
    });

    it('parada, só o zoom da foto à vista está rodando, e nenhuma peça fixa will-change no estilo', () => {
      const { carrossel, foto } = montar();

      expect(animacoes.vivas().map((a) => a.elemento)).toEqual([foto(0)]);
      expect(comWillChange(carrossel)).toEqual([]);
      carrossel.destruir();
    });

    it('depois de cada troca terminada, só o zoom da foto que chegou continua vivo', () => {
      const { carrossel, foto } = montar();

      relogio.avancar(parametros.intervalo + 0.02, 0.01);
      expect(animacoes.vivas().length).toBeGreaterThan(2); // a troca (duas) e os zooms
      for (const animacao of animacoes.todas) {
        if (animacao.elemento.classList.contains('carrossel__slide')) animacao.terminar();
      }

      expect(animacoes.vivas().map((a) => a.elemento)).toEqual([foto(1)]);
      carrossel.destruir();
    });

    it('por mais voltas que dê, nunca passam de quatro as animações vivas (duas da troca e dois zooms)', () => {
      const { carrossel } = montar();
      let maximo = 0;

      for (let volta = 0; volta < total * 3; volta += 1) {
        relogio.avancar(parametros.intervalo, 0.05);
        maximo = Math.max(maximo, animacoes.vivas().length);
        animacoes.terminarTodas();
        expect(animacoes.vivas()).toHaveLength(0);
      }

      expect(maximo).toBeLessThanOrEqual(4);
      carrossel.destruir();
    });

    it('com animação reduzida, nenhuma animação é pedida', () => {
      const { carrossel, pontos } = montar({ reduzido: true });

      pontos()[2]?.click();
      relogio.avancar(1, 0.05);

      expect(animacoes.todas).toHaveLength(0);
      carrossel.destruir();
    });

    it('sem Element.animate (navegador antigo), a troca é instantânea e nada quebra', () => {
      const restaurar = semAnimate();
      try {
        const { carrossel, pontos, atual, opacidade, slide } = montar();

        pontos()[2]?.click();

        expect(atual()).toBe(2);
        expect(opacidade(2)).toBe(1);
        expect(opacidade(0)).toBe(0);
        expect(slide(0).style.visibility).toBe('hidden');
        carrossel.destruir();
      } finally {
        restaurar();
      }
    });

    it('destruir termina as trocas em andamento e cancela os zooms: nada fica rodando', () => {
      const { carrossel } = montar();

      relogio.avancar(parametros.intervalo + 0.02, 0.01);
      expect(animacoes.vivas().length).toBeGreaterThan(0);
      carrossel.destruir();

      expect(animacoes.vivas()).toHaveLength(0);
    });

    it('fora da tela o zoom também para, e volta quando o carrossel reaparece; um zoom que já terminou não recomeça', () => {
      stubDoObservador();
      const { carrossel, foto } = montar();

      observadores[0]?.chamar(true);
      const [zoom] = animacoes.doElemento(foto(0));
      expect(zoom?.estado).toBe('running');

      observadores[0]?.chamar(false);
      expect(zoom?.estado).toBe('paused');
      observadores[0]?.chamar(true);
      expect(zoom?.estado).toBe('running');

      zoom?.terminar();
      observadores[0]?.chamar(false);
      observadores[0]?.chamar(true);
      expect(zoom?.estado).toBe('finished'); // `play()` o faria recomeçar do tamanho normal
      carrossel.destruir();
    });

    it('a CSS do carrossel não fixa `will-change` nas fotos: a camada é pedida só quando a peça se move', () => {
      const css = readFileSync(
        join(import.meta.dirname, '..', '..', 'src', 'styles', 'informacoes.css'),
        'utf8',
      );
      const bloco = (seletor: string) =>
        new RegExp(String.raw`(^|\n)${seletor}\s*\{[^}]*\}`).exec(css)?.[0] ?? '';

      expect(bloco(String.raw`\.carrossel__slide`)).not.toBe('');
      expect(bloco(String.raw`\.carrossel__slide`)).not.toContain('will-change');
      expect(bloco(String.raw`\.carrossel__foto`)).not.toBe('');
      expect(bloco(String.raw`\.carrossel__foto`)).not.toContain('will-change');
    });
  });
});
