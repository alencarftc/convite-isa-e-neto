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
import { criarRelogioManual } from './suporte/relogio-gsap';

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
  eventos.on('bau:tocado', () => ordem.push('tocou'));
  eventos.on('bau:girou', () => ordem.push('girou'));
  eventos.on('bau:abriu', () => ordem.push('abriu'));
  eventos.on('bau:aberto', () => ordem.push('aberto'));

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
    it('monta sombra, aura e realce, baú fechado e aberto, luz, botão e dica dentro do espaço do bosque, sem contorno, anel nem pontos de luz', () => {
      const { el } = montar();

      expect(el('.cena .bau .bau__corpo')).toBeTruthy();
      for (const seletor of [
        '.bau__sombra',
        '.bau__aura',
        '.bau__aura--realce',
        '.bau__fechado',
        '.bau__aberto',
        '.bau__luz',
        '.bau__botao',
        '.bau__dica',
      ]) {
        expect(el(`.bau ${seletor}`)).toBeTruthy();
      }
      // Só a aura amarela e o realce do mouse ficam em volta do baú (31/10/2026).
      for (const removido of [
        '.bau__contorno',
        '.bau__onda',
        '.bau__brilhantes',
        '.bau__brilhante',
      ]) {
        expect(document.querySelector(removido), removido).toBeNull();
      }
    });

    it('a chave mora no inventário, na raiz, fora da cena e do baú, escondido dos leitores de tela (ADR-0012)', () => {
      const { el } = montar();

      expect(el('#app > .inventario .inventario__moldura')).toBeTruthy();
      expect(el('.inventario .bau__chave .bau__chave-imagem')).toBeTruthy();
      expect(el('.inventario').getAttribute('aria-hidden')).toBe('true');
      expect(document.querySelector('.cena .bau__chave')).toBeNull();
      expect(document.querySelector('.inventario button, .inventario a')).toBeNull();
    });

    it('a chave não aparece antes do toque de entrada: o inventário nasce invisível', () => {
      const { opacidade } = montar();

      expect(opacidade('.inventario')).toBe(0);
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

  describe('imagens só quando o baú aceita o toque (SPEC-02, RF-02.7)', () => {
    /** Conta as imagens criadas por `new Image()` (as pétalas) e guarda o `src` de cada uma. */
    function espionarImagens() {
      const criadas: { src: string }[] = [];
      vi.stubGlobal(
        'Image',
        class {
          src = '';
          constructor() {
            criadas.push(this);
          }
        },
      );
      return criadas;
    }

    it('a tampa aberta e as pétalas não são pedidas no init, antes do toque de entrada', () => {
      const criadas = espionarImagens();
      const { el } = montar();

      expect(el('.bau__aberto').hasAttribute('src')).toBe(false);
      expect(el('.bau__aberto').getAttribute('data-src')).toBe(config.imagens.bauAberto);
      expect(criadas).toHaveLength(0);
    });

    it('o run pede a tampa aberta e as três variações de pétala', () => {
      const criadas = espionarImagens();
      const { cena, el } = montar();

      void cena.run();

      expect(el('.bau__aberto').getAttribute('src')).toBe(config.imagens.bauAberto);
      expect(criadas.map((imagem) => imagem.src)).toEqual([
        config.imagens.petalaA,
        config.imagens.petalaB,
        config.imagens.petalaC,
      ]);
    });

    it('quem pula nunca pede a tampa aberta nem as pétalas', () => {
      const criadas = espionarImagens();
      const { cena, el } = montar();

      cena.skip();

      expect(el('.bau__aberto').hasAttribute('src')).toBe(false);
      expect(criadas).toHaveLength(0);
    });
  });

  describe('espera pelo toque', () => {
    it('habilita o botão e o inventário sobe com a chave, no celular e no computador (RF-04.3, CT-04.2)', async () => {
      for (const toque of [true, false]) {
        document.body.innerHTML = '';
        const { cena, botao, opacidade } = montar({ toque });
        void cena.run();

        expect(botao().disabled).toBe(false);
        await vi.waitFor(() => {
          expect(opacidade('.inventario')).toBe(1);
        });
        expect(opacidade('.bau__chave')).toBe(1);
        cena.destroy();
      }
    });

    it('o foco vai para o botão do baú quando ele passa a aceitar o toque (SPEC-09, RF-09.6)', () => {
      const { cena, botao } = montar({ toque: true });

      void cena.run();

      expect(document.activeElement).toBe(botao());
    });

    it('não há mais chave como cursor no computador: o cursor continua o do sistema (ADR-0012)', () => {
      const { cena } = montar({ toque: false });
      void cena.run();

      expect(document.body.style.getPropertyValue('--cursor-chave')).toBe('');
      expect(config.imagens).not.toHaveProperty('cursorChave');
    });

    it('a aura amarela respira entre o mínimo e o máximo enquanto o baú espera', async () => {
      const { cena, opacidade } = montar({ toque: true });
      void cena.run();

      await vi.waitFor(() => {
        expect(opacidade('.bau__aura')).toBeGreaterThanOrEqual(config.bau.aura.minimo - 1e-6);
      });
      expect(opacidade('.bau__aura')).toBeLessThanOrEqual(config.bau.aura.maximo + 1e-6);
    });

    it('a dica diz para usar a chave no baú, com o texto do computador ou do celular (RF-04.5)', async () => {
      const celular = montar({ toque: true });
      void celular.cena.run();
      expect(celular.el('.bau__dica').textContent).toBe('');
      await vi.waitFor(() => {
        expect(celular.el('.bau__dica').textContent).toBe('Toque no baú para usar a chave');
      });

      const computador = montar({ toque: false });
      void computador.cena.run();
      await vi.waitFor(() => {
        expect(computador.el('.bau__dica').textContent).toBe('Clique no baú para usar a chave');
      });
    });

    it('a dica aparece por 3 s, some por 5 s e volta, e assim por diante, até o baú ser tocado (08/11/2026)', () => {
      // Relógio manual: o ciclo dura 8 s de relógio do GSAP, e a máquina ocupada estragaria uma medida em tempo real.
      const relogio = criarRelogioManual();
      try {
        const { cena, el, opacidade } = montar({ toque: true });
        const { dicaChave } = config.duracoes;
        const { visivel, oculta } = config.bau.dica;
        const { inventarioAparece } = config.bau;
        void cena.run();
        const ir = (segundo: number) => {
          relogio.avancar(segundo, 0.002);
        };

        ir(dicaChave + inventarioAparece + 0.01);
        expect(el('.bau__dica').textContent).toBe('Toque no baú para usar a chave');
        expect(opacidade('.bau__dica')).toBeCloseTo(1, 1); // à vista

        ir(visivel - inventarioAparece - 0.01 + 0.01);
        expect(opacidade('.bau__dica')).toBe(0); // passados os 3 s, apagada

        ir(oculta / 2);
        expect(opacidade('.bau__dica')).toBe(0); // e continua apagada durante os 5 s

        ir(oculta / 2 + inventarioAparece + 0.02);
        expect(opacidade('.bau__dica')).toBeCloseTo(1, 1); // e volta

        ir(visivel + oculta); // outra volta inteira: ela não para
        expect(opacidade('.bau__dica')).toBeCloseTo(1, 1);
        cena.skip();
      } finally {
        relogio.restaurar();
      }
    });

    it('o texto da dica só é escrito uma vez: a região aria-live não repete o anúncio a cada volta', () => {
      const relogio = criarRelogioManual();
      try {
        const { cena, el } = montar({ toque: true });
        let mudancas = 0;
        new MutationObserver(() => (mudancas += 1)).observe(el('.bau__dica'), { childList: true });
        void cena.run();

        relogio.avancar(3 * (config.bau.dica.visivel + config.bau.dica.oculta), 0.005);

        expect(el('.bau__dica').textContent).toBe('Toque no baú para usar a chave');
        cena.skip();
        expect(mudancas).toBeLessThanOrEqual(1);
      } finally {
        relogio.restaurar();
      }
    });

    it('o toque fora do baú não abre: só pulsa (CA-04.2.3)', async () => {
      const { cena, estado, ordem } = montar({ toque: true });
      void cena.run();

      window.dispatchEvent(new Event('pointerdown'));
      await esperar(40);

      expect(ordem).toEqual([]);
      expect(estado.fase).not.toBe('bau');
    });

    it('o mouse sobre o botão acende o realce da aura e, ao sair, apaga (CA-04.1.2)', async () => {
      const { cena, botao, opacidade } = montar({ toque: false });
      void cena.run();

      // O realce é um tween de verdade: com a máquina ocupada (o conjunto todo roda junto) ele atrasa.
      botao().dispatchEvent(new Event('pointerenter'));
      await vi.waitFor(
        () => {
          expect(opacidade('.bau__aura--realce')).toBe(1);
        },
        { timeout: 4000 },
      );
      botao().dispatchEvent(new Event('pointerleave'));
      await vi.waitFor(
        () => {
          expect(opacidade('.bau__aura--realce')).toBe(0);
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

      expect(ordem).toEqual(['tocou', 'girou', 'abriu', 'aberto']);
    });

    it('tocar na chave do inventário também usa a chave', async () => {
      const { cena, el, ordem } = montar({ toque: true });
      const execucao = cena.run();

      el('.inventario__moldura').click();
      await execucao;

      expect(ordem).toEqual(['tocou', 'girou', 'abriu', 'aberto']);
    });

    it('termina com a tampa aberta, a luz assentada em 0,6, sem chave nem dica, com a moldura vazia e a chave girada', async () => {
      const { cena, botao, opacidade } = montar({ toque: true });
      const execucao = cena.run();

      botao().click();
      await execucao;

      expect(opacidade('.bau__aberto')).toBe(1);
      // O baú fechado sai: senão as duas silhuetas pareciam dois baús, um atrás do outro (01/11/2026).
      expect(opacidade('.bau__fechado')).toBe(0);
      expect(opacidade('.bau__luz')).toBeCloseTo(config.bau.opacidadeFinalDaLuz);
      expect(opacidade('.bau__chave')).toBe(0);
      expect(opacidade('.bau__dica')).toBe(0);
      expect(opacidade('.inventario__moldura')).toBe(0);
      expect(opacidade('.bau__aura')).toBe(0);
      const chave = document.querySelector('.bau__chave');
      expect(Number(gsap.getProperty(chave, 'rotationX'))).toBe(config.bau.grausDoGiro);
      expect(Number(gsap.getProperty(chave, 'rotation'))).toBe(0); // na horizontal
    });

    it('a chave sai do inventário e a ponta dela termina exatamente na fechadura, na horizontal', async () => {
      const { cena, botao } = montar({ toque: true });
      const execucao = cena.run();
      // O happy-dom não calcula layout: as medidas vêm de caixas combinadas (baú 200 × 150, chave de 54 px).
      const bau = { left: 100, top: 400, width: 200, height: 150 };
      const chave = { left: 150, top: 740, width: 76, height: 76 };
      const caixa = (r: typeof bau) =>
        ({
          ...r,
          right: r.left + r.width,
          bottom: r.top + r.height,
          x: r.left,
          y: r.top,
        }) as DOMRect;
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: Element,
      ) {
        if (this.classList.contains('bau__corpo')) return caixa(bau);
        if (this.classList.contains('bau__chave')) return caixa(chave);
        return caixa({ left: 0, top: 0, width: 0, height: 0 });
      });
      for (const eixo of ['offsetWidth', 'offsetHeight'] as const) {
        vi.spyOn(HTMLElement.prototype, eixo, 'get').mockImplementation(function (
          this: HTMLElement,
        ) {
          return this.classList.contains('bau__chave') ? 54 : 0;
        });
      }

      botao().click();
      await execucao;

      const m = config.bau.chave;
      const fechadura = { x: bau.left + bau.width * 0.5, y: bau.top + bau.height * 0.58 }; // sem CSS: o padrão
      const escala = (m.comprimentoNoBau * bau.width) / (m.comprimento * 54);
      const partida = { x: chave.left + chave.width / 2, y: chave.top + chave.height / 2 };
      const el = document.querySelector('.bau__chave');
      const centro = {
        x: partida.x + Number(gsap.getProperty(el, 'x')),
        y: partida.y + Number(gsap.getProperty(el, 'y')),
      };
      // Ponta = centro + deslocamento da ponta dentro da caixa, na escala da chave.
      const ponta = {
        x: centro.x + (m.ponta.x - 0.5) * 54 * Number(gsap.getProperty(el, 'scaleX')),
        y: centro.y + (m.ponta.y - 0.5) * 54 * Number(gsap.getProperty(el, 'scaleY')),
      };
      expect(Number(gsap.getProperty(el, 'scaleX'))).toBeCloseTo(escala, 5);
      expect(ponta.x).toBeCloseTo(fechadura.x, 3);
      expect(ponta.y).toBeCloseTo(fechadura.y, 3);
    });

    it('cinco toques seguidos fazem uma única abertura (CT-04.4)', async () => {
      const { cena, botao, ordem } = montar({ toque: true });
      const execucao = cena.run();

      for (let i = 0; i < 5; i += 1) botao().click();
      await execucao;

      expect(ordem).toEqual(['tocou', 'girou', 'abriu', 'aberto']);
    });

    it('Enter ou Espaço (clique sem ponteiro) também abre (RF-04.4, CT-04.6)', async () => {
      const { cena, botao, ordem } = montar({ toque: false });
      const execucao = cena.run();

      botao().click(); // `detail` zero: ativação por teclado
      await execucao;

      expect(ordem).toEqual(['tocou', 'girou', 'abriu', 'aberto']);
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
    it('skip deixa o baú aberto, a luz em 0,6, sem chave, inventário, aura nem dica', () => {
      const { cena, botao, opacidade } = montar({ toque: false });
      void cena.run();

      cena.skip();

      expect(opacidade('.bau__aberto')).toBe(1);
      expect(opacidade('.bau__fechado')).toBe(0);
      expect(opacidade('.bau__luz')).toBeCloseTo(config.bau.opacidadeFinalDaLuz);
      expect(opacidade('.bau__chave')).toBe(0);
      expect(opacidade('.inventario')).toBe(0);
      expect(opacidade('.bau__aura')).toBe(0);
      expect(opacidade('.bau__dica')).toBe(0);
      expect(botao().disabled).toBe(true);
    });

    it('skip no meio da abertura interrompe a animação e não deixa timers soltos', async () => {
      const { cena, botao, ordem } = montar({ toque: true });
      void cena.run();
      botao().click();

      cena.skip();
      await esperar(120);

      expect(ordem).not.toContain('abriu'); // a tampa só abriria em 1,0 × fator
      expect(ordem).not.toContain('aberto');
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

    it('destroy remove o baú e o inventário', () => {
      const { cena } = montar({ toque: false });
      void cena.run();

      cena.destroy();

      expect(document.querySelector('.bau__corpo')).toBeNull();
      expect(document.querySelector('.inventario')).toBeNull();
    });
  });
});
