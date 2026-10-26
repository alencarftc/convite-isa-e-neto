import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarBarramento } from '@/application/barramento-eventos';
import { config as configReal } from '@/config/config';
import { content } from '@/config/content';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { criarCenaBosque } from '@/presentation/bosque/cena-bosque';
import { criarCenaHistoria } from '@/presentation/historia/cena-historia';

import { criarCarregamentoFalso } from './suporte/carregamento-falso';
import { configRapida } from './suporte/config-rapida';
import { criarEstadoFalso, type OpcoesDoEstadoFalso } from './suporte/estado-falso';
import { montarIndexHtml } from './suporte/index-html';

const rapida = configRapida(configReal);
/** A dica fica visível por mais tempo, para dar para amostrá-la sem depender de milissegundos. */
const config: ConfigConvite = {
  ...rapida,
  historia: { ...rapida.historia, dica: { aparece: 0.01, some: 0.3 } },
};

function montar(opcoes: OpcoesDoEstadoFalso = {}) {
  montarIndexHtml();
  const raiz = document.querySelector<HTMLElement>('#app');
  if (!raiz) throw new Error('index.html sem #app');

  const { estado } = criarEstadoFalso(opcoes);
  const { carregamento } = criarCarregamentoFalso(config, { instantaneo: true });
  const eventos = criarBarramento<EventosConvite>();
  const registro: string[] = [];
  const frases: string[] = [];
  eventos.on('historia:inicio', ({ duracao }) => registro.push(`inicio:${String(duracao)}`));
  eventos.on('historia:balao', ({ indice, frase }) => {
    registro.push(`balao:${String(indice)}`);
    frases.push(frase);
  });
  eventos.on('historia:fim', () => registro.push('fim'));

  // O bosque cria as camadas do pôr do sol que a história anima (tlLuz).
  criarCenaBosque({ raiz, config, estado, eventos, carregamento }).init();
  const cena = criarCenaHistoria({ raiz, conteudo: content, config, estado, eventos });
  cena.init();

  const el = (seletor: string) => {
    const elemento = document.querySelector<HTMLElement>(seletor);
    if (!elemento) throw new Error(`sem ${seletor}`);
    return elemento;
  };
  const botao = () => {
    const elemento = document.querySelector<HTMLButtonElement>('.historia__avancar');
    if (!elemento) throw new Error('sem botão');
    return elemento;
  };
  const opacidade = (seletor: string) => Number(gsap.getProperty(el(seletor), 'opacity'));
  /** A linha do tempo da história é a única do GSAP que tem o rótulo "fim". */
  const linha = () => {
    const encontrada = gsap.globalTimeline
      .getChildren(false, false, true)
      .filter((t): t is gsap.core.Timeline => 'labels' in t && 'fim' in t.labels)
      .at(-1);
    if (!encontrada) throw new Error('linha do tempo da história não encontrada');
    return encontrada;
  };

  return { cena, estado, eventos, registro, frases, el, botao, opacidade, linha };
}

const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('história em balões (SPEC-05)', () => {
  describe('estrutura', () => {
    it('monta uma região nomeada, oculta, com um balão por item de content.baloes (RF-05.1)', () => {
      const { el } = montar();

      expect(el('.historia').getAttribute('aria-label')).toBe('História do casal');
      expect(el('.historia').hidden).toBe(true);
      expect(document.querySelectorAll('.historia .balao')).toHaveLength(content.baloes.length);
    });

    it('as nuvens se alternam a, b, c, a, b e nunca repetem em seguida (RF-05.2, CA-05.1.3)', () => {
      montar();

      const variacoes = [...document.querySelectorAll('.balao')].map((b) =>
        [...b.classList].find((c) => c.startsWith('balao--')),
      );

      expect(variacoes).toEqual(['balao--a', 'balao--b', 'balao--c', 'balao--a', 'balao--b']);
    });

    it('cada balão tem a frase aprovada, a foto com alt e o ponto de foco do conteúdo (RF-05.3)', () => {
      montar();

      const baloes = [...document.querySelectorAll<HTMLElement>('.balao')];
      baloes.forEach((balao, indice) => {
        const esperado = content.baloes[indice];
        expect(balao.querySelector('.balao__frase')?.textContent).toBe(esperado?.frase);
        const foto = balao.querySelector<HTMLImageElement>('.balao__foto img');
        expect(foto?.alt).toBe(esperado?.alt);
        expect(foto?.style.objectPosition).toBe(esperado?.foco);
      });
    });

    it('foto que falha some e o balão fica só com a frase (RF-05.9, CT-05.7)', () => {
      montar();
      const primeiro = document.querySelector('.balao');

      primeiro?.querySelector('.balao__foto img')?.dispatchEvent(new Event('error'));

      expect(primeiro?.querySelector('.balao__foto')).toBeNull();
      expect(primeiro?.querySelector('.balao__frase')?.textContent).toBe(content.baloes[0]?.frase);
    });

    it('as imagens das nuvens vêm do manifesto', () => {
      montar();

      const nuvens = [...document.querySelectorAll('.balao__nuvem')].map((i) =>
        i.getAttribute('src'),
      );

      expect(nuvens.slice(0, 3)).toEqual([
        config.imagens.balaoA,
        config.imagens.balaoB,
        config.imagens.balaoC,
      ]);
    });
  });

  describe('execução (tlHistoria)', () => {
    it('emite inicio, cinco balões na ordem, e fim; o run resolve (CA-05.1.1)', async () => {
      const { cena, registro, frases } = montar();

      await cena.run();

      expect(registro).toEqual([
        `inicio:${String(config.duracoes.balao * content.baloes.length)}`,
        'balao:0',
        'balao:1',
        'balao:2',
        'balao:3',
        'balao:4',
        'fim',
      ]);
      expect(frases).toEqual(content.baloes.map((b) => b.frase));
    });

    it('a região aria-live recebe cada frase uma vez, só em texto (RF-05.8, CT-05.6)', async () => {
      const { cena, el } = montar();
      const anunciadas: string[] = [];
      new MutationObserver(() => anunciadas.push(el('.historia [aria-live]').textContent)).observe(
        el('.historia [aria-live]'),
        { childList: true },
      );

      await cena.run();
      await esperar(10);

      expect(anunciadas).toEqual(content.baloes.map((b) => b.frase));
    });

    it('o foco fica no botão de avançar durante a história (SPEC-09, RF-09.6)', () => {
      const { cena, botao } = montar();

      void cena.run();

      expect(document.activeElement).toBe(botao());
    });

    it('mostra a região e o botão de avançar durante a história', () => {
      const { cena, el, botao } = montar();

      void cena.run();

      expect(el('.historia').hidden).toBe(false);
      expect(botao().hidden).toBe(false);
      expect(botao().getAttribute('aria-label')).toBe('Avançar a história');
    });

    it('a luz caminha ao pôr do sol dentro da própria história e termina nele (CA-03.3.1, CA-03.3.2)', async () => {
      const { cena, opacidade } = montar();
      // Sem o CSS (que começa em 0), as camadas partem invisíveis por aqui.
      gsap.set('.camada--ceu-sol, .camada--luz', { opacity: 0 });
      expect(opacidade('.camada--ceu-sol')).toBe(0);

      await cena.run();

      expect(opacidade('.camada--ceu-sol')).toBe(1);
      expect(opacidade('.camada--luz')).toBe(1);
    });

    it('cada balão fica visível e termina fora da tela, subindo pelo alto', async () => {
      const { cena } = montar();
      Object.assign(window, { innerWidth: 400, innerHeight: 800 });

      await cena.run();

      for (const balao of document.querySelectorAll<HTMLElement>('.balao')) {
        expect(Number(gsap.getProperty(balao, 'y'))).toBeLessThanOrEqual(0);
      }
    });

    it('cada balão sai da boca do baú com desvio horizontal próprio (SPEC-05, desvios)', async () => {
      const { cena } = montar();
      Object.assign(window, { innerWidth: 1000, innerHeight: 800 });

      await cena.run();

      const xs = [...document.querySelectorAll<HTMLElement>('.balao')].map((b) =>
        Math.round(Number(gsap.getProperty(b, 'x'))),
      );
      expect(xs).toEqual([380, 600, 440, 620, 500]); // 1000 × (0,5 + desvio)
    });
  });

  describe('dica "Toque para avançar" (RF-05.7)', () => {
    it('aparece na primeira vez que a história toca neste aparelho', async () => {
      const { cena, opacidade } = montar({ visitado: false });
      void cena.run();

      await vi.waitFor(() => {
        expect(opacidade('.historia__dica')).toBe(1);
      });
    });

    it('não aparece a partir da segunda visita (CT-05.4)', async () => {
      const { cena, opacidade } = montar({ visitado: true });
      let maxima = 0;
      const amostrar = setInterval(() => {
        maxima = Math.max(maxima, opacidade('.historia__dica'));
      }, 5);

      await cena.run();
      clearInterval(amostrar);

      expect(maxima).toBe(0);
    });
  });

  describe('acelerar (CA-05.3.1, CT-05.3)', () => {
    it('um toque triplica a velocidade e volta a 1× ao chegar no próximo balão', async () => {
      const { cena, botao, linha } = montar();
      const execucao = cena.run();
      await vi.waitFor(() => {
        expect(linha().time()).toBeGreaterThan(0);
      });

      botao().click();
      expect(linha().timeScale()).toBe(config.historia.aceleracao);

      await vi.waitFor(() => {
        expect(linha().timeScale()).toBe(1);
      });
      await execucao;
    });

    it('toques em sequência rápida nunca passam de 3×', async () => {
      const { cena, botao, linha } = montar();
      void cena.run();
      await vi.waitFor(() => {
        expect(linha().time()).toBeGreaterThan(0);
      });

      botao().click();
      botao().click();
      botao().click();

      expect(linha().timeScale()).toBe(config.historia.aceleracao);
    });

    it('acelerar não pula nenhuma frase', async () => {
      const { cena, botao, frases } = montar();
      const execucao = cena.run();

      const tocar = setInterval(() => {
        botao().click();
      }, 4);
      await execucao;
      clearInterval(tocar);

      expect(frases).toEqual(content.baloes.map((b) => b.frase));
    });

    it('um toque no último balão acelera até o fim e a velocidade volta ao normal', async () => {
      const { cena, botao, linha } = montar();
      const execucao = cena.run();
      await vi.waitFor(() => {
        expect(linha().time()).toBeGreaterThan(config.duracoes.balao * 4);
      });
      const historia = linha(); // some do GSAP ao terminar; guardamos a referência

      botao().click();
      await execucao;

      expect(historia.timeScale()).toBe(1);
    });
  });

  describe('estado final e limpeza (RF-05.10)', () => {
    it('skip esconde os balões e deixa a luz no pôr do sol', () => {
      const { cena, el, opacidade } = montar();
      void cena.run();

      cena.skip();

      expect(el('.historia').hidden).toBe(true);
      expect(opacidade('.camada--ceu-sol')).toBe(1);
      expect(opacidade('.camada--luz')).toBe(1);
    });

    it('skip interrompe a história: nenhum evento depois dele', async () => {
      const { cena, registro } = montar();
      void cena.run();
      await vi.waitFor(() => {
        expect(registro).toContain('balao:0');
      });

      cena.skip();
      const depois = [...registro];
      await esperar(150);

      expect(registro).toEqual(depois);
      expect(registro).not.toContain('fim');
    });

    it('skip funciona sem run e destroy remove a história', () => {
      const { cena } = montar();

      expect(() => {
        cena.skip();
      }).not.toThrow();
      cena.destroy();

      expect(document.querySelector('.historia')).toBeNull();
    });
  });
});
