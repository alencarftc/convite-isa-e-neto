import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarBarramento } from '@/application/barramento-eventos';
import { config as configReal } from '@/config/config';
import { content } from '@/config/content';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { criarCenaBau } from '@/presentation/bau/cena-bau';
import { criarCenaBosque } from '@/presentation/bosque/cena-bosque';

import { criarCarregamentoFalso } from './suporte/carregamento-falso';
import { configRapida } from './suporte/config-rapida';
import { criarEstadoFalso, type OpcoesDoEstadoFalso } from './suporte/estado-falso';
import { montarIndexHtml } from './suporte/index-html';

const config = configRapida(configReal);

/** Monta o bosque (que cria o espaço `.bau`) e o baú, já com o bosque pronto. */
function montar(opcoes: OpcoesDoEstadoFalso = {}) {
  montarIndexHtml();
  const raiz = document.querySelector<HTMLElement>('#app');
  if (!raiz) throw new Error('index.html sem #app');

  const { estado } = criarEstadoFalso(opcoes);
  const { carregamento } = criarCarregamentoFalso(config, { instantaneo: true });
  const eventos = criarBarramento<EventosConvite>();
  const ordem: string[] = [];
  eventos.on('bau:girou', () => ordem.push('girou'));
  eventos.on('bau:abriu', () => ordem.push('abriu'));

  const bosque = criarCenaBosque({ raiz, config, estado, eventos, carregamento });
  const cena = criarCenaBau({ raiz, conteudo: content, config, estado, eventos });
  bosque.init();
  cena.init();

  const el = (seletor: string) => {
    const elemento = document.querySelector<HTMLElement>(seletor);
    if (!elemento) throw new Error(`sem ${seletor}`);
    return elemento;
  };
  const botao = () => {
    const elemento = document.querySelector<HTMLButtonElement>('.bau__botao');
    if (!elemento) throw new Error('sem botão');
    return elemento;
  };
  const opacidade = (seletor: string) => Number(gsap.getProperty(el(seletor), 'opacity'));

  return { cena, bosque, estado, eventos, ordem, el, botao, opacidade };
}

const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
  document.body.setAttribute('data-fase', 'aguardando-bau');
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('baú e chave (SPEC-04)', () => {
  describe('estrutura', () => {
    it('monta aura, baú fechado e aberto, luz, chave, botão e dica dentro do espaço do bosque', () => {
      const { el } = montar();

      expect(el('.cena .bau .bau__corpo')).toBeTruthy();
      for (const seletor of [
        '.bau__aura',
        '.bau__fechado',
        '.bau__aberto',
        '.bau__luz',
        '.bau__chave .bau__chave-imagem',
        '.bau__botao',
        '.bau__dica',
      ]) {
        expect(el(`.bau ${seletor}`)).toBeTruthy();
      }
    });

    it('o botão tem nome acessível, nasce desabilitado e a dica é uma região anunciada (RF-04.4, CA-09.3)', () => {
      const { botao, el } = montar();

      expect(botao().getAttribute('aria-label')).toBe('Abrir o baú');
      expect(botao().disabled).toBe(true);
      expect(el('.bau__dica').getAttribute('aria-live')).toBe('polite');
    });

    it('sem o espaço .bau (bosque não montado), falha com mensagem clara', () => {
      montarIndexHtml();
      const raiz = document.querySelector<HTMLElement>('#app');
      if (!raiz) throw new Error('sem #app');
      const { estado } = criarEstadoFalso();
      const cena = criarCenaBau({
        raiz,
        conteudo: content,
        config,
        estado,
        eventos: criarBarramento<EventosConvite>(),
      });

      expect(() => {
        cena.init();
      }).toThrow('.bau');
    });
  });

  describe('espera pelo toque', () => {
    it('habilita o botão só quando o baú começa a esperar, e a chave flutua no celular (RF-04.3, CT-04.2)', async () => {
      const { cena, botao, opacidade } = montar({ toque: true });
      void cena.run();

      expect(botao().disabled).toBe(false);
      await vi.waitFor(() => {
        expect(opacidade('.bau__chave')).toBe(1);
      });
    });

    it('o foco vai para o botão do baú quando ele passa a aceitar o toque (SPEC-09, RF-09.6)', () => {
      const { cena, botao } = montar({ toque: true });

      void cena.run();

      expect(document.activeElement).toBe(botao());
    });

    it('no computador, a chave é o cursor: a imagem fica oculta e o cursor personalizado liga (RF-04.2)', () => {
      const { cena, opacidade } = montar({ toque: false });
      void cena.run();

      expect(opacidade('.bau__chave')).toBe(0);
      expect(document.body.style.getPropertyValue('--cursor-chave')).toContain('cursor-chave');
      expect(document.body.style.getPropertyValue('--cursor-chave')).toMatch(/pointer$/);
    });

    it('no celular não usa cursor de chave', () => {
      const { cena } = montar({ toque: true });
      void cena.run();

      expect(document.body.style.getPropertyValue('--cursor-chave')).toBe('');
    });

    it('notebook com tela de toque: cursor de chave e chave flutuante ao mesmo tempo (caso de borda)', async () => {
      const { cena, opacidade } = montar({ toque: false, algumToque: true });
      void cena.run();

      expect(document.body.style.getPropertyValue('--cursor-chave')).not.toBe('');
      await vi.waitFor(() => {
        expect(opacidade('.bau__chave')).toBe(1);
      });
    });

    it('a dica aparece depois de 1,5 s, com o texto do computador ou do celular (RF-04.5)', async () => {
      const celular = montar({ toque: true });
      void celular.cena.run();
      expect(celular.el('.bau__dica').textContent).toBe('');
      await vi.waitFor(() => {
        expect(celular.el('.bau__dica').textContent).toBe('Toque na chave');
      });

      const computador = montar({ toque: false });
      void computador.cena.run();
      await vi.waitFor(() => {
        expect(computador.el('.bau__dica').textContent).toBe('Use a chave para abrir');
      });
    });

    it('o reforço repete a dica no máximo 3 vezes e depois para (CT-04.5)', async () => {
      const { cena, el } = montar({ toque: true });
      let mudancas = 0;
      new MutationObserver(() => (mudancas += 1)).observe(el('.bau__dica'), { childList: true });
      void cena.run();

      await esperar(900); // dicaChave 0,05 + 3 × reforcoDica 0,15, com folga

      expect(mudancas).toBe(1 + config.bau.reforco.maximo);
      await esperar(400);
      expect(mudancas).toBe(1 + config.bau.reforco.maximo);
    });

    it('o toque fora do baú não abre: só pulsa (CA-04.2.3)', async () => {
      const { cena, estado, ordem } = montar({ toque: true });
      void cena.run();

      window.dispatchEvent(new Event('pointerdown'));
      await esperar(40);

      expect(ordem).toEqual([]);
      expect(estado.fase).not.toBe('bau');
    });

    it('o mouse sobre o botão acende a aura e, ao sair, apaga (CA-04.1.2)', async () => {
      const { cena, botao, opacidade } = montar({ toque: false });
      void cena.run();

      // A aura é um tween de verdade: com a máquina ocupada (o conjunto todo roda junto) ele atrasa.
      botao().dispatchEvent(new Event('pointerenter'));
      await vi.waitFor(
        () => {
          expect(opacidade('.bau__aura')).toBe(1);
        },
        { timeout: 4000 },
      );
      botao().dispatchEvent(new Event('pointerleave'));
      await vi.waitFor(
        () => {
          expect(opacidade('.bau__aura')).toBe(0);
        },
        { timeout: 4000 },
      );
    });
  });

  describe('abertura (tlBau)', () => {
    it('um toque abre: fase "bau", giro e depois tampa, e o run resolve (CA-04.3.1, CA-04.3.2)', async () => {
      const { cena, botao, estado, ordem } = montar({ toque: true });
      const execucao = cena.run();

      botao().click();
      expect(estado.fase).toBe('bau');
      expect(botao().disabled).toBe(true);
      await execucao;

      expect(ordem).toEqual(['girou', 'abriu']);
    });

    it('termina com a tampa aberta, a luz assentada em 0,6 e sem chave nem dica', async () => {
      const { cena, botao, opacidade } = montar({ toque: true });
      const execucao = cena.run();

      botao().click();
      await execucao;

      expect(opacidade('.bau__aberto')).toBe(1);
      expect(opacidade('.bau__luz')).toBeCloseTo(config.bau.opacidadeFinalDaLuz);
      expect(opacidade('.bau__chave')).toBe(0);
      expect(opacidade('.bau__dica')).toBe(0);
      expect(Number(gsap.getProperty(document.querySelector('.bau__chave'), 'rotation'))).toBe(
        config.bau.grausDoGiro,
      );
    });

    it('cinco toques seguidos fazem uma única abertura (CT-04.4)', async () => {
      const { cena, botao, ordem } = montar({ toque: true });
      const execucao = cena.run();

      for (let i = 0; i < 5; i += 1) botao().click();
      await execucao;

      expect(ordem).toEqual(['girou', 'abriu']);
    });

    it('no computador, a chave sai da ponta do cursor e o cursor volta ao normal', async () => {
      const { cena, botao } = montar({ toque: false });
      const execucao = cena.run();
      expect(document.body.style.getPropertyValue('--cursor-chave')).not.toBe('');

      botao().dispatchEvent(
        Object.assign(new MouseEvent('click', { bubbles: true }), {
          detail: 1,
          clientX: 200,
          clientY: 300,
        }),
      );
      await execucao;

      expect(document.body.style.getPropertyValue('--cursor-chave')).toBe('');
    });

    it('Enter ou Espaço (clique sem ponteiro) também abre (RF-04.4, CT-04.6)', async () => {
      const { cena, botao, ordem } = montar({ toque: false });
      const execucao = cena.run();

      botao().click(); // `detail` zero: ativação por teclado
      await execucao;

      expect(ordem).toEqual(['girou', 'abriu']);
    });

    it('depois de abrir, o reforço e a dica não voltam', async () => {
      const { cena, botao, el } = montar({ toque: true });
      const execucao = cena.run();
      botao().click();
      await execucao;
      const texto = el('.bau__dica').textContent;
      let mudancas = 0;
      new MutationObserver(() => (mudancas += 1)).observe(el('.bau__dica'), { childList: true });

      await esperar(500);

      expect(mudancas).toBe(0);
      expect(el('.bau__dica').textContent).toBe(texto);
    });
  });

  describe('estado final sem animação (RF-04.8)', () => {
    it('skip deixa o baú aberto, a luz em 0,6, sem chave nem dica e sem cursor', () => {
      const { cena, botao, opacidade } = montar({ toque: false });
      void cena.run();

      cena.skip();

      expect(opacidade('.bau__aberto')).toBe(1);
      expect(opacidade('.bau__luz')).toBeCloseTo(config.bau.opacidadeFinalDaLuz);
      expect(opacidade('.bau__chave')).toBe(0);
      expect(opacidade('.bau__dica')).toBe(0);
      expect(botao().disabled).toBe(true);
      expect(document.body.style.getPropertyValue('--cursor-chave')).toBe('');
    });

    it('skip no meio da abertura interrompe a animação e não deixa timers soltos', async () => {
      const { cena, botao, ordem } = montar({ toque: true });
      void cena.run();
      botao().click();

      cena.skip();
      await esperar(120);

      expect(ordem).not.toContain('abriu'); // a tampa só abriria em 1,0 × fator
    });

    it('skip no meio da abertura tira as pétalas que ficaram no ar, em vez de deixá-las congeladas', () => {
      const { cena, botao } = montar({ toque: true });
      void cena.run();
      botao().click();
      const corpo = document.querySelector('.bau__corpo');
      for (let i = 0; i < 3; i += 1) {
        const petala = document.createElement('img');
        petala.className = 'petala';
        corpo?.append(petala);
      }

      cena.skip();

      expect(document.querySelectorAll('.bau .petala')).toHaveLength(0);
    });

    it('skip funciona sem run (a segurança chama skip em tudo)', () => {
      const { cena } = montar();

      expect(() => {
        cena.skip();
      }).not.toThrow();
    });

    it('destroy remove o baú e o cursor', () => {
      const { cena } = montar({ toque: false });
      void cena.run();

      cena.destroy();

      expect(document.querySelector('.bau__corpo')).toBeNull();
      expect(document.body.style.getPropertyValue('--cursor-chave')).toBe('');
    });
  });
});
