import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarBarramento } from '@/application/barramento-eventos';
import { config as configReal } from '@/config/config';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { curvaCss } from '@/presentation/animacao/curva-css';
import { criarCenaBosque } from '@/presentation/bosque/cena-bosque';

import {
  type AnimacoesFalsas,
  instalarAnimacoesFalsas,
  semAnimate,
} from './suporte/animacoes-falsas';
import { criarCarregamentoFalso } from './suporte/carregamento-falso';
import { criarEstadoFalso, type OpcoesDoEstadoFalso } from './suporte/estado-falso';
import { montarIndexHtml } from './suporte/index-html';

/** Tempos curtos: o que se confere é o resultado de cada animação, não a duração dela. */
const config: ConfigConvite = {
  ...configReal,
  duracoes: { ...configReal.duracoes, nevoa: 0.06, esmaecimentoReduzido: 0.02 },
  movimento: {
    ...configReal.movimento,
    profundidade: { ...configReal.movimento.profundidade, suavizacao: 0.02, periodoDaDeriva: 0.2 },
  },
};

function montar(opcoes: OpcoesDoEstadoFalso & { instantaneo?: boolean } = {}) {
  montarIndexHtml();
  const raiz = document.querySelector<HTMLElement>('#app');
  if (!raiz) throw new Error('index.html sem #app');

  const { estado } = criarEstadoFalso({ toque: false, ...opcoes });
  const falso = criarCarregamentoFalso(config, { instantaneo: opcoes.instantaneo ?? false });
  const eventos = criarBarramento<EventosConvite>();
  const aoFicarPronto = vi.fn();
  eventos.on('bosque:pronto', aoFicarPronto);
  const cena = criarCenaBosque({
    raiz,
    config,
    estado,
    eventos,
    carregamento: falso.carregamento,
  });

  const camada = (nome: string) => {
    const elemento = document.querySelector<HTMLElement>(`.cena .camada--${nome}`);
    if (!elemento) throw new Error(`sem camada ${nome}`);
    return elemento;
  };
  const cenaEl = () => {
    const elemento = document.querySelector<HTMLElement>('.cena');
    if (!elemento) throw new Error('sem .cena');
    return elemento;
  };

  return { cena, estado, aoFicarPronto, camada, cenaEl, raiz, ...falso };
}

function moverMouse(x: number, y: number): void {
  window.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: x, clientY: y }));
}

/** As animações do navegador que a cena pediu neste teste (falsas: o happy-dom não as roda). */
let animacoes: AnimacoesFalsas;
/** Devolve o `animate` de um teste que simulou um navegador sem ele. */
let restaurarAnimate: (() => void) | undefined;

/** As animações em curso (rodando ou pausadas) nas camadas da cena que têm profundidade: a deriva do celular. */
function derivasVivas() {
  return animacoes.vivas().filter((animacao) => animacao.elemento.hasAttribute('data-prof'));
}

beforeEach(() => {
  document.body.innerHTML = '';
  animacoes = instalarAnimacoesFalsas();
});
afterEach(() => {
  restaurarAnimate?.();
  restaurarAnimate = undefined;
  vi.restoreAllMocks();
});

describe('cena do bosque (SPEC-03)', () => {
  describe('estrutura das camadas', () => {
    it('empilha céu, céu do pôr do sol, lago, árvores, baú, primeiro plano, luz e casal, com os espaços da vida entre eles; no celular e no tablet nada mais (RF-03.1, RF-18.6)', () => {
      const { cena, cenaEl } = montar({ toque: true });

      cena.init();

      const classes = [...cenaEl().children].map((filho) => filho.className);
      expect(classes).toEqual([
        'camada camada--ceu',
        'camada camada--ceu-sol',
        'vida vida--ceu',
        'camada camada--lago',
        'camada camada--arvores',
        'vida vida--fundo',
        'bau',
        'camada camada--frente',
        'vida vida--chao',
        'camada camada--luz',
        'casal',
      ]);
    });

    it('os espaços da vida nascem vazios, decorativos e com a profundidade da camada ao lado (CT-18.10)', () => {
      const { cena, cenaEl } = montar();

      cena.init();

      const espacos = [...cenaEl().querySelectorAll<HTMLElement>('.vida')];
      expect(espacos.map((espaco) => espaco.className)).toEqual([
        'vida vida--ceu',
        'vida vida--fundo',
        'vida vida--chao',
      ]);
      for (const espaco of espacos) {
        expect(espaco.getAttribute('aria-hidden'), espaco.className).toBe('true');
        expect(espaco.childElementCount, espaco.className).toBe(0);
        expect(espaco.querySelector('button, a, [tabindex]')).toBeNull();
      }
      expect(espacos.map((espaco) => espaco.getAttribute('data-prof'))).toEqual([
        '0.15',
        '0.6',
        '1',
      ]);
    });

    it('a arte é decorativa para leitores de tela e a cena fica abaixo da névoa, como primeiro filho (RNF-03.3)', () => {
      const { cena, cenaEl, raiz } = montar();

      cena.init();

      for (const camada of cenaEl().querySelectorAll('.camada')) {
        expect(camada.getAttribute('aria-hidden'), camada.className).toBe('true');
      }
      expect(cenaEl().querySelector('.casal')?.getAttribute('aria-hidden')).toBe('true');
      expect(raiz.firstElementChild).toBe(cenaEl());
    });

    it('o contêiner da cena NÃO é aria-hidden: o espaço do baú, com o botão, precisa ser alcançável (SPEC-09, RF-09.6)', () => {
      const { cena, cenaEl } = montar();

      cena.init();

      expect(cenaEl().hasAttribute('aria-hidden')).toBe(false);
      expect(cenaEl().querySelector('.bau')?.hasAttribute('aria-hidden')).toBe(false);
    });

    it('cada camada de arte é um <picture> com a arte vertical em portrait e a horizontal no img (CA-03.4.1)', () => {
      const { cena, camada } = montar({ toque: true });

      cena.init();

      for (const nome of ['ceu', 'ceu-sol']) {
        const quadro = camada(nome);
        expect(quadro.tagName).toBe('PICTURE');
        expect(quadro.querySelector('source')?.media).toBe('(orientation: portrait)');
        expect(quadro.querySelector('source')?.srcset).toMatch(/-9x16\.webp$/);
        expect(quadro.querySelector('img')?.getAttribute('src')).toMatch(/-16x9\.webp$/);
        expect(quadro.querySelector('img')?.alt).toBe('');
      }
    });

    it('na vertical a camada do lago leva a cena mestre inteira, o primeiro plano os arbustos dela e as árvores ficam vazias (ADR-0015, ADR-0019)', () => {
      const { cena, camada } = montar({ toque: true });

      cena.init();

      const lago = camada('lago');
      expect(lago.querySelector('source')?.media).toBe('(orientation: portrait)');
      expect(lago.querySelector('source')?.srcset).toMatch(/01-cena-9x16\.webp$/);
      expect(lago.querySelector('img')?.getAttribute('src')).toMatch(/04-lago\.webp$/);
      const arvores = camada('arvores');
      expect(arvores.querySelector('source')?.media).toBe('(orientation: portrait)');
      expect(arvores.querySelector('source')?.srcset).toMatch(/vazio\.webp$/);
      expect(arvores.querySelector('img')?.getAttribute('src')).toMatch(/05-arvores-16x9\.webp$/);
      // O primeiro plano vertical é uma cópia exata dos arbustos de baixo da pintura, para taparem o baú e o esquilo.
      const frente = camada('frente');
      expect(frente.querySelector('source')?.media).toBe('(orientation: portrait)');
      expect(frente.querySelector('source')?.srcset).toMatch(/01-cena-9x16-frente\.webp$/);
      expect(frente.querySelector('img')?.getAttribute('src')).toMatch(/06-primeiro-plano\.webp$/);
      for (const nome of ['lago', 'arvores', 'frente']) {
        expect(camada(nome).querySelector('img')?.alt).toBe('');
      }
    });

    it.each([
      ['vertical', '0.3', '0.3'],
      ['horizontal', '1', '1'],
    ] as const)(
      'as profundidades seguem a tabela (céu 0,15 · lago 0,3 · árvores 0,6 · frente 1), e o baú e o casal acompanham o chão; na vertical os arbustos andam com a pintura: %s (chão %s, frente %s)',
      (orientacao, solo, frente) => {
        const { cena, cenaEl } = montar({ orientacao, toque: true });
        cena.init();

        const profundidades = [...cenaEl().querySelectorAll('[data-prof]')].map((e) =>
          e.getAttribute('data-prof'),
        );

        // Os espaços da vida (céu, fundo e chão) repetem a profundidade da camada ao lado (RF-18.6). O baú e o casal
        // pisam no chão e se movem com ele, e não por conta própria: antes flutuavam com o mouse (01/11/2026).
        expect(profundidades).toEqual([
          '0.15',
          '0.15',
          '0.15',
          '0.3',
          '0.6',
          '0.6',
          solo,
          frente,
          '1',
          solo,
        ]);
      },
    );

    describe('no computador (09/11/2026)', () => {
      const CAMADAS = [
        'camada camada--ceu',
        'camada camada--ceu-sol',
        'vida vida--ceu',
        'camada camada--lago',
        'camada camada--arvores',
        'vida vida--fundo',
        'bau',
        'camada camada--frente',
        'vida vida--chao',
        'camada camada--luz',
        'casal',
      ];

      it('com mouse a cena é a pintura mestre 16:9: lago, primeiro plano e árvores usam a variante do computador', () => {
        const { cena, cenaEl, camada } = montar({ toque: false, orientacao: 'horizontal' });

        cena.init();

        expect(cenaEl().classList.contains('cena--computador')).toBe(true);
        // As mesmas camadas do celular: o que muda é a arte de cada uma, não a pilha.
        expect([...cenaEl().children].map((filho) => filho.className)).toEqual(CAMADAS);
        expect(camada('lago').querySelector('img')?.getAttribute('src')).toMatch(
          /01-cena-16x9.webp$/,
        );
        expect(camada('frente').querySelector('img')?.getAttribute('src')).toMatch(
          /01-cena-16x9-frente.webp$/,
        );
        expect(camada('arvores').querySelector('img')?.getAttribute('src')).toMatch(/vazio.webp$/);
        // Sem troca por orientação: numa janela de pé (mais alta que larga) a pintura 16:9 segue cobrindo a janela, e o
        // desktop não vira a composição do celular.
        for (const nome of ['ceu', 'ceu-sol', 'lago', 'arvores', 'frente']) {
          expect(camada(nome).querySelector('source'), nome).toBeNull();
        }
      });

      it('a pintura é uma peça só: o primeiro plano, o baú e o casal andam com ela (profundidade 0,3)', () => {
        const { cena, cenaEl } = montar({ toque: false, orientacao: 'horizontal' });

        cena.init();

        const profundidades = [...cenaEl().querySelectorAll('[data-prof]')].map((e) =>
          e.getAttribute('data-prof'),
        );
        expect(profundidades).toEqual([
          '0.15',
          '0.15',
          '0.15',
          '0.3',
          '0.6',
          '0.6',
          '0.3', // baú
          '0.3', // primeiro plano, a cópia dos arbustos da pintura
          '1',
          '0.3', // casal
        ]);
      });

      it('com toque (celular e tablet) nada disso vale: sem a classe, e a horizontal segue nas camadas de antes', () => {
        for (const orientacao of ['vertical', 'horizontal'] as const) {
          document.body.innerHTML = '';
          const { cena, cenaEl, camada } = montar({ toque: true, orientacao });

          cena.init();

          expect(cenaEl().classList.contains('cena--computador')).toBe(false);
          expect(camada('lago').querySelector('img')?.getAttribute('src')).toMatch(/04-lago.webp$/);
          expect(camada('frente').querySelector('img')?.getAttribute('src')).toMatch(
            /06-primeiro-plano.webp$/,
          );
          expect(camada('arvores').querySelector('img')?.getAttribute('src')).toMatch(
            /05-arvores-16x9.webp$/,
          );
        }
      });
    });

    it('as imagens do pôr do sol têm prioridade baixa; as críticas, alta (RNF-02.3)', () => {
      const { cena, camada } = montar();
      cena.init();

      expect(camada('ceu-sol').querySelector('img')?.getAttribute('fetchpriority')).toBe('low');
      expect(camada('ceu').querySelector('img')?.getAttribute('fetchpriority')).toBe('high');
    });

    it('init duas vezes não duplica a cena', () => {
      const { cena } = montar();

      cena.init();
      cena.init();

      expect(document.querySelectorAll('.cena')).toHaveLength(1);
    });
  });

  describe('revelação (CA-03.1.1, CA-03.1.2)', () => {
    it('só começa quando as imagens críticas estão prontas (RF-03.2)', async () => {
      const { cena, cenaEl, concluirImagens, aoFicarPronto } = montar();
      cena.init();
      const execucao = cena.run();
      await new Promise((resolver) => setTimeout(resolver, 30));

      expect(cenaEl().style.opacity).toBe('0');
      expect(aoFicarPronto).not.toHaveBeenCalled();

      concluirImagens();
      await execucao;

      expect(aoFicarPronto).toHaveBeenCalledOnce();
    });

    it('termina com a cena em escala 1, a névoa dissipada e a entrada escondida', async () => {
      const { cena, cenaEl, raiz } = montar({ instantaneo: true });
      cena.init();

      await cena.run();

      expect(Number(gsap.getProperty(cenaEl(), 'scale'))).toBe(1);
      expect(cenaEl().style.opacity).toBe('1');
      // A névoa abriu por animações do navegador, que ficam no fim (opacidade 0) atrás da entrada escondida.
      const camadas = [...raiz.querySelectorAll<HTMLElement>('.nevoa > span')];
      expect(camadas).toHaveLength(2);
      for (const camada of camadas) {
        const [abertura] = animacoes.doElemento(camada);
        expect(abertura?.quadros[0]).toMatchObject({ opacity: 0 });
        expect(abertura?.estado).toBe('running');
      }
      expect(raiz.querySelector<HTMLElement>('.entrada')?.hidden).toBe(true);
    });

    it('a névoa se abre por animações do navegador: cada camada cresce e vai para um lado, em sentidos opostos, e some (ADR-0044)', async () => {
      const { cena, raiz } = montar({ instantaneo: true });
      cena.init();
      const { escalaFinalDaNevoa, deslocamentoDaNevoa, fracaoDaNevoa } = config.movimento;

      await cena.run();

      const [primeira, segunda] = [...raiz.querySelectorAll<HTMLElement>('.nevoa > span')];
      const abertura = (camada: HTMLElement | undefined) =>
        camada ? animacoes.doElemento(camada)[0] : undefined;
      expect(abertura(primeira)?.quadros).toEqual([
        {
          opacity: 0,
          transform: `translateX(${String(deslocamentoDaNevoa)}%) scale(${String(escalaFinalDaNevoa)})`,
        },
      ]);
      expect(abertura(segunda)?.quadros).toEqual([
        {
          opacity: 0,
          transform: `translateX(${String(-deslocamentoDaNevoa)}%) scale(${String(escalaFinalDaNevoa)})`,
        },
      ]);
      expect(abertura(primeira)?.opcoes).toMatchObject({
        duration: config.duracoes.nevoa * fracaoDaNevoa * 1000,
        easing: curvaCss(config.curvas.suave),
        fill: 'forwards',
      });
    });

    it('a respiração da entrada é congelada onde estava e cancelada antes de a névoa abrir, para a abertura partir dali', async () => {
      const { cena, raiz } = montar({ instantaneo: true });
      cena.init();
      const camada = raiz.querySelector<HTMLElement>('.nevoa > span');
      const respirando = { commitStyles: vi.fn(), cancel: vi.fn() };
      if (camada) {
        vi.spyOn(camada, 'getAnimations').mockReturnValue([respirando as unknown as Animation]);
      }

      await cena.run();

      expect(respirando.commitStyles).toHaveBeenCalledOnce();
      expect(respirando.cancel).toHaveBeenCalledOnce();
      expect(respirando.commitStyles.mock.invocationCallOrder[0]).toBeLessThan(
        respirando.cancel.mock.invocationCallOrder[0] ?? Infinity,
      );
    });

    it('destroy cancela a abertura da névoa e a aproximação da cena', async () => {
      const { cena } = montar({ instantaneo: true });
      cena.init();
      await cena.run();

      cena.destroy();

      expect(animacoes.todas.every((animacao) => animacao.estado === 'cancelled')).toBe(true);
    });

    it('a cena se aproxima por uma animação do navegador, de escalaInicialDoBosque a 1 na duração da névoa, e ela sai ao fim (ADR-0044)', async () => {
      const { cena, cenaEl } = montar({ instantaneo: true });
      cena.init();

      const execucao = cena.run();
      await vi.waitFor(() => {
        expect(animacoes.doElemento(cenaEl())).toHaveLength(1);
      });
      const [aproximacao] = animacoes.doElemento(cenaEl());
      expect(aproximacao?.quadros).toEqual([
        { transform: `scale(${String(config.movimento.escalaInicialDoBosque)})` },
        { transform: 'scale(1)' },
      ]);
      expect(aproximacao?.opcoes).toMatchObject({
        duration: config.duracoes.nevoa * 1000,
        easing: curvaCss(config.curvas.saida),
      });

      await execucao;

      expect(aproximacao?.estado).toBe('cancelled');
      expect(Number(gsap.getProperty(cenaEl(), 'scale'))).toBe(1);
    });

    it('sem Element.animate (navegador antigo), o GSAP faz a aproximação: a cena parte de escala 1,06 ou mais e termina em 1', async () => {
      restaurarAnimate = semAnimate();
      const { cena, cenaEl } = montar({ instantaneo: true });
      cena.init();

      const execucao = cena.run();
      await vi.waitFor(() => {
        expect(Number(gsap.getProperty(cenaEl(), 'scale'))).toBeLessThanOrEqual(1.06);
      });
      await execucao;

      expect(Number(gsap.getProperty(cenaEl(), 'scale'))).toBe(1);
      for (const camada of document.querySelectorAll('.nevoa > span')) {
        expect(Number(gsap.getProperty(camada, 'opacity'))).toBe(0);
        expect(Number(gsap.getProperty(camada, 'scale'))).toBeCloseTo(1.15);
      }
    });

    it('emite bosque:pronto só no fim da revelação', async () => {
      const { cena, aoFicarPronto, camada } = montar({ instantaneo: true });
      cena.init();

      await cena.run();

      expect(aoFicarPronto).toHaveBeenCalledOnce();
      expect(camada('ceu-sol').style.opacity).not.toBe('1'); // o pôr do sol é da história
    });
  });

  describe('profundidade', () => {
    it('no computador, as camadas acompanham o mouse e as mais próximas andam mais (CA-03.2.1, CT-03.2)', async () => {
      const { cena, camada } = montar({
        instantaneo: true,
        toque: false,
        orientacao: 'horizontal',
      });
      cena.init();
      await cena.run();
      Object.assign(window, { innerWidth: 1000, innerHeight: 800 });

      moverMouse(0, 0); // canto superior esquerdo: as camadas vão para a direita e para baixo

      // A pintura (lago e primeiro plano, 0,3) anda mais que o céu (0,15); as árvores (0,6), escondidas, mais que ela.
      await vi.waitFor(() => {
        expect(Number(gsap.getProperty(camada('lago'), 'x'))).toBeCloseTo(24 * 0.3, 0);
      });
      expect(Number(gsap.getProperty(camada('lago'), 'y'))).toBeCloseTo(12 * 0.3, 0);
      expect(Number(gsap.getProperty(camada('ceu'), 'x'))).toBeCloseTo(24 * 0.15, 0);
      expect(Number(gsap.getProperty(camada('lago'), 'x'))).toBeGreaterThan(
        Number(gsap.getProperty(camada('ceu'), 'x')),
      );
      expect(Number(gsap.getProperty(camada('arvores'), 'x'))).toBeGreaterThan(
        Number(gsap.getProperty(camada('lago'), 'x')),
      );
      expect(Number(gsap.getProperty(camada('frente'), 'x'))).toBeCloseTo(
        Number(gsap.getProperty(camada('lago'), 'x')),
        6,
      );
    });

    it('quando o mouse sai da janela, as camadas voltam ao centro', async () => {
      const { cena, camada } = montar({
        instantaneo: true,
        toque: false,
        orientacao: 'horizontal',
      });
      cena.init();
      await cena.run();
      Object.assign(window, { innerWidth: 1000, innerHeight: 800 });
      moverMouse(0, 0);
      await vi.waitFor(() => {
        expect(Number(gsap.getProperty(camada('lago'), 'x'))).toBeGreaterThan(5);
      });

      window.dispatchEvent(Object.assign(new Event('pointerout'), { relatedTarget: null }));

      await vi.waitFor(() => {
        expect(Number(gsap.getProperty(camada('lago'), 'x'))).toBeCloseTo(0, 0);
      });
    });

    it('na vertical os arbustos do primeiro plano andam junto com a pintura, senão apareceriam em dobro (ADR-0019)', async () => {
      const { cena, camada } = montar({ instantaneo: true, toque: false, orientacao: 'vertical' });
      cena.init();
      await cena.run();
      Object.assign(window, { innerWidth: 1000, innerHeight: 800 });

      moverMouse(0, 0);

      await vi.waitFor(() => {
        expect(Number(gsap.getProperty(camada('lago'), 'x'))).toBeCloseTo(24 * 0.3, 0);
      });
      expect(Number(gsap.getProperty(camada('frente'), 'x'))).toBeCloseTo(
        Number(gsap.getProperty(camada('lago'), 'x')),
        6,
      );
      expect(Number(gsap.getProperty(camada('frente'), 'y'))).toBeCloseTo(
        Number(gsap.getProperty(camada('lago'), 'y')),
        6,
      );
    });

    it('no celular, em vez do mouse, cada camada faz uma deriva automática, uma animação do navegador que vai e volta sem fim (CA-03.2.2, CT-03.3, ADR-0044)', async () => {
      const { cena, camada } = montar({ instantaneo: true, toque: true });
      cena.init();
      await cena.run();
      const { deriva, periodoDaDeriva, defasagemDaDeriva } = config.movimento.profundidade;

      const [animacao] = animacoes.doElemento(camada('frente'));
      const profundidade = Number(camada('frente').getAttribute('data-prof'));
      expect(animacao?.quadros).toEqual([
        { transform: 'translate3d(0px, 0px, 0px)' },
        { transform: `translate3d(${String(deriva * profundidade)}px, 0px, 0px)` },
      ]);
      expect(animacao?.opcoes).toMatchObject({
        duration: periodoDaDeriva * 1000,
        direction: 'alternate',
        iterations: Number.POSITIVE_INFINITY,
        easing: curvaCss(config.curvas.suave),
        fill: 'both',
      });
      // cada camada começa a seu tempo, defasada da anterior
      const atrasos = animacoes
        .doElemento(camada('frente'))
        .concat(animacoes.doElemento(camada('lago')))
        .map((a) => a.opcoes.delay);
      expect(new Set(atrasos).size).toBeGreaterThan(1);
      // (um múltiplo da defasagem, a menos do erro de ponto flutuante)
      const passos = (atraso: number | undefined) => (atraso ?? 0) / (defasagemDaDeriva * 1000);
      expect(
        atrasos.every((atraso) => Math.abs(passos(atraso) - Math.round(passos(atraso))) < 1e-6),
      ).toBe(true);
      // o GSAP não anima mais as camadas: nada de x pelo JavaScript
      expect(gsap.getTweensOf(camada('frente'))).toHaveLength(0);
      moverMouse(0, 0);
      expect(Number(gsap.getProperty(camada('frente'), 'x'))).toBe(0);
    });

    it('a camada que a deriva moveria menos de 1 px (o céu) não ganha animação: seria uma camada de GPU de tela cheia para um movimento invisível (ADR-0050)', async () => {
      const { cena, camada } = montar({ instantaneo: true, toque: true });
      cena.init();
      await cena.run();
      const { deriva } = config.movimento.profundidade;

      for (const nome of ['ceu', 'ceu-sol']) {
        const prof = Number(camada(nome).getAttribute('data-prof'));
        expect(deriva * prof, nome).toBeLessThan(1);
        expect(animacoes.doElemento(camada(nome)), nome).toHaveLength(0);
      }
      for (const nome of ['lago', 'frente']) {
        const prof = Number(camada(nome).getAttribute('data-prof'));
        expect(deriva * prof, nome).toBeGreaterThanOrEqual(1);
        expect(animacoes.doElemento(camada(nome)), nome).toHaveLength(1);
      }
    });

    it('"Pausar animação" congela a deriva do celular e retomar a devolve, no mesmo ponto (SPEC-18, RF-18.9)', async () => {
      const { cena, camada, estado } = montar({ instantaneo: true, toque: true });
      cena.init();
      await cena.run();
      const viva = () =>
        animacoes.doElemento(camada('frente')).filter((a) => a.estado !== 'cancelled');
      const [antes] = viva();
      if (antes) antes.currentTime = 3210; // a deriva já andou 3,2 s

      estado.definirMovimento(false);

      expect(viva()).toHaveLength(0);

      estado.definirMovimento(true);

      expect(viva().every((animacao) => animacao.estado === 'running')).toBe(true);
      expect(viva()).toHaveLength(1);
      expect(viva()[0]?.currentTime).toBe(3210);
    });

    it('pausar a deriva a CANCELA e deixa a camada parada no estilo, sem animação em curso: pausada, ela ainda a manteria na GPU, como um will-change (ADR-0049)', async () => {
      const { cena, camada, estado } = montar({ instantaneo: true, toque: true });
      cena.init();
      await cena.run();
      const camadas = ['lago', 'frente'].map((nome) => camada(nome));
      expect(derivasVivas().length).toBeGreaterThanOrEqual(camadas.length);

      estado.definirMovimento(false);

      expect(derivasVivas()).toHaveLength(0);
      for (const elemento of camadas) expect(elemento.style.transform).toMatch(/^translate\(/);
      expect(camadas.some((elemento) => elemento.style.transform.includes('3d'))).toBe(false);

      estado.definirMovimento(true);

      expect(derivasVivas().length).toBeGreaterThanOrEqual(camadas.length);
    });

    it('com o convite aberto a deriva do celular para de vez: a carta cobre a cena e a animação infinita esquentava o aparelho (10/11/2026)', async () => {
      const { cena, camada, estado } = montar({ instantaneo: true, toque: true });
      cena.init();
      await cena.run();
      const deriva = () => animacoes.doElemento(camada('frente'));
      expect(deriva().some((animacao) => animacao.estado === 'running')).toBe(true);

      estado.definirFase('convite');

      expect(deriva().every((animacao) => animacao.estado === 'cancelled')).toBe(true);
      expect(derivasVivas()).toHaveLength(0);
      estado.definirMovimento(true); // ligar o movimento não a religa com o convite aberto
      expect(deriva().every((animacao) => animacao.estado === 'cancelled')).toBe(true);
    });

    it('com a pausa gravada numa visita anterior, a deriva já nasce congelada', async () => {
      const { cena, camada } = montar({ instantaneo: true, toque: true, movimentoLigado: false });
      cena.init();
      await cena.run();

      expect(animacoes.doElemento(camada('frente')).length).toBeGreaterThan(0);
      expect(derivasVivas()).toHaveLength(0);
    });

    it('destruir a cena com a deriva congelada devolve o estilo que as camadas tinham', async () => {
      const { cena, camada, estado } = montar({ instantaneo: true, toque: true });
      cena.init();
      await cena.run();
      const frente = camada('frente');
      frente.style.transform = 'translate(1px, 2px)';
      estado.definirMovimento(false);
      expect(frente.style.transform).toBe('translate(0px, 0px)');

      cena.destroy();

      expect(derivasVivas()).toHaveLength(0);
      expect(frente.style.transform).toBe('translate(1px, 2px)');
    });

    it('destroy cancela a deriva do celular', async () => {
      const { cena } = montar({ instantaneo: true, toque: true });
      cena.init();
      await cena.run();
      expect(animacoes.todas.some((animacao) => animacao.estado === 'running')).toBe(true);

      cena.destroy();

      expect(animacoes.todas.every((animacao) => animacao.estado === 'cancelled')).toBe(true);
    });

    it('sem Element.animate (navegador antigo), o GSAP faz a deriva: congela, retoma e para como antes', async () => {
      restaurarAnimate = semAnimate();
      const { cena, camada, estado } = montar({ instantaneo: true, toque: true });
      cena.init();
      await cena.run();
      const deriva = () => gsap.getTweensOf(camada('frente'));

      expect(deriva().some((animacao) => !animacao.paused())).toBe(true);
      estado.definirMovimento(false);
      expect(deriva().every((animacao) => animacao.paused())).toBe(true);
      estado.definirMovimento(true);
      expect(deriva().some((animacao) => !animacao.paused())).toBe(true);
      estado.definirFase('convite');
      expect(deriva().every((animacao) => animacao.paused())).toBe(true);
    });

    it('destroy para a profundidade e remove a cena', async () => {
      const { cena, camada } = montar({ instantaneo: true, toque: false });
      cena.init();
      await cena.run();
      const frente = camada('frente');

      cena.destroy();
      Object.assign(window, { innerWidth: 1000, innerHeight: 800 });
      moverMouse(0, 0);
      await new Promise((resolver) => setTimeout(resolver, 60));

      expect(document.querySelector('.cena')).toBeNull();
      expect(Number(gsap.getProperty(frente, 'x'))).toBe(0);
    });
  });

  describe('estado final sem animação (RF-03.6)', () => {
    it('skip põe a cena no pôr do sol, sem aproximação, e esconde a entrada (CA-03.3.2)', async () => {
      const { cena, cenaEl, camada, raiz } = montar({ instantaneo: true });
      cena.init();

      cena.skip();

      await vi.waitFor(() => {
        expect(cenaEl().style.opacity).toBe('1');
      });
      expect(Number(gsap.getProperty(cenaEl(), 'scale'))).toBe(1);
      expect(camada('ceu-sol').style.opacity).toBe('1');
      expect(camada('luz').style.opacity).toBe('1');
      expect(raiz.querySelector<HTMLElement>('.entrada')?.hidden).toBe(true);
    });

    it('skip não anima profundidade nem emite bosque:pronto', async () => {
      const { cena, camada, aoFicarPronto } = montar({ instantaneo: true, toque: false });
      cena.init();

      cena.skip();
      Object.assign(window, { innerWidth: 1000, innerHeight: 800 });
      moverMouse(0, 0);
      await new Promise((resolver) => setTimeout(resolver, 60));

      expect(Number(gsap.getProperty(camada('frente'), 'x'))).toBe(0);
      expect(aoFicarPronto).not.toHaveBeenCalled();
    });

    it('sem as imagens críticas (modo de segurança), a cena não aparece: fica o fundo marfim', async () => {
      const { cena, cenaEl, concluirImagens } = montar();
      cena.init();
      cena.skip();

      concluirImagens(false);
      await new Promise((resolver) => setTimeout(resolver, 30));

      expect(cenaEl().style.opacity).toBe('0');
    });

    it('skip funciona sem init (a segurança chama skip em tudo)', () => {
      const { cena } = montar({ instantaneo: true });

      expect(() => {
        cena.skip();
      }).not.toThrow();
      expect(document.querySelectorAll('.cena')).toHaveLength(1);
    });
  });
});
