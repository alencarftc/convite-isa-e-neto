import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarBarramento } from '@/application/barramento-eventos';
import { config as configReal } from '@/config/config';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { criarCenaBosque } from '@/presentation/bosque/cena-bosque';

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

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('cena do bosque (SPEC-03)', () => {
  describe('estrutura das camadas', () => {
    it('empilha céu, céu do pôr do sol, lago, árvores, baú, primeiro plano, luz e casal (RF-03.1)', () => {
      const { cena, cenaEl } = montar();

      cena.init();

      const classes = [...cenaEl().children].map((filho) => filho.className);
      expect(classes).toEqual([
        'camada camada--ceu',
        'camada camada--ceu-sol',
        'camada camada--lago',
        'camada camada--arvores',
        'bau',
        'camada camada--frente',
        'camada camada--luz',
        'casal',
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
      const { cena, camada } = montar();

      cena.init();

      for (const nome of ['ceu', 'ceu-sol', 'lago', 'arvores', 'frente']) {
        const quadro = camada(nome);
        expect(quadro.tagName).toBe('PICTURE');
        expect(quadro.querySelector('source')?.media).toBe('(orientation: portrait)');
        expect(quadro.querySelector('source')?.srcset).toMatch(/-9x16\.svg$/);
        expect(quadro.querySelector('img')?.getAttribute('src')).toMatch(/-16x9\.svg$/);
        expect(quadro.querySelector('img')?.alt).toBe('');
      }
    });

    it('as profundidades seguem a tabela: céu 0,15 · lago 0,3 · árvores 0,6 · baú 0,75 · frente 1', () => {
      const { cena, cenaEl } = montar();
      cena.init();

      const profundidades = [...cenaEl().querySelectorAll('[data-prof]')].map((e) =>
        e.getAttribute('data-prof'),
      );

      expect(profundidades).toEqual(['0.15', '0.15', '0.3', '0.6', '0.75', '1']);
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
      for (const camada of raiz.querySelectorAll('.nevoa > span')) {
        expect(Number(gsap.getProperty(camada, 'opacity'))).toBe(0);
        expect(Number(gsap.getProperty(camada, 'scale'))).toBeCloseTo(1.15);
      }
      expect(raiz.querySelector<HTMLElement>('.entrada')?.hidden).toBe(true);
    });

    it('a cena parte de escala 1,06 e a névoa de 1 (aproximação)', async () => {
      const { cena, cenaEl } = montar({ instantaneo: true });
      cena.init();

      const execucao = cena.run();
      await vi.waitFor(() => {
        expect(Number(gsap.getProperty(cenaEl(), 'scale'))).toBeLessThanOrEqual(1.06);
      });
      await execucao;
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
      const { cena, camada } = montar({ instantaneo: true, toque: false });
      cena.init();
      await cena.run();
      Object.assign(window, { innerWidth: 1000, innerHeight: 800 });

      moverMouse(0, 0); // canto superior esquerdo: as camadas vão para a direita e para baixo

      await vi.waitFor(() => {
        expect(Number(gsap.getProperty(camada('frente'), 'x'))).toBeCloseTo(24, 0);
      });
      expect(Number(gsap.getProperty(camada('frente'), 'y'))).toBeCloseTo(12, 0);
      expect(Number(gsap.getProperty(camada('ceu'), 'x'))).toBeCloseTo(24 * 0.15, 0);
      expect(Number(gsap.getProperty(camada('frente'), 'x'))).toBeGreaterThan(
        Number(gsap.getProperty(camada('arvores'), 'x')),
      );
    });

    it('quando o mouse sai da janela, as camadas voltam ao centro', async () => {
      const { cena, camada } = montar({ instantaneo: true, toque: false });
      cena.init();
      await cena.run();
      Object.assign(window, { innerWidth: 1000, innerHeight: 800 });
      moverMouse(0, 0);
      await vi.waitFor(() => {
        expect(Number(gsap.getProperty(camada('frente'), 'x'))).toBeGreaterThan(20);
      });

      window.dispatchEvent(Object.assign(new Event('pointerout'), { relatedTarget: null }));

      await vi.waitFor(() => {
        expect(Number(gsap.getProperty(camada('frente'), 'x'))).toBeCloseTo(0, 0);
      });
    });

    it('no celular, em vez do mouse, cada camada faz uma deriva automática (CA-03.2.2, CT-03.3)', async () => {
      const { cena, camada } = montar({ instantaneo: true, toque: true });
      cena.init();
      await cena.run();

      expect(gsap.getTweensOf(camada('frente')).length).toBeGreaterThan(0);
      moverMouse(0, 0);
      await new Promise((resolver) => setTimeout(resolver, 60));

      // o mouse é ignorado: o x vem só da deriva (no máximo 6 px × profundidade)
      expect(Math.abs(Number(gsap.getProperty(camada('frente'), 'x')))).toBeLessThanOrEqual(6);
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
