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
import { criarRelogioManual } from './suporte/relogio-gsap';

const config: ConfigConvite = configRapida(configReal);

/**
 * O conteúdo com as fotos dos balões preenchidas: as do casal ainda não chegaram (as provisórias saíram em
 * 31/10/2026), e estes testes cobrem o tratamento da foto para quando chegarem.
 */
const comFotos = {
  ...content,
  baloes: content.baloes.map((balao, indice) => ({
    ...balao,
    foto: `photos/foto-${String(indice + 1)}.jpg`,
    alt: `Descrição da foto ${String(indice + 1)}`,
    foco: '50% 35%',
  })),
};

function montar(opcoes: OpcoesDoEstadoFalso = {}, conteudo: typeof content = content) {
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
  const cena = criarCenaHistoria({ raiz, conteudo, config, estado, eventos });
  cena.init();

  const el = (seletor: string) => {
    const elemento = document.querySelector<HTMLElement>(seletor);
    if (!elemento) throw new Error(`sem ${seletor}`);
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

  return { cena, estado, eventos, registro, frases, el, opacidade, linha };
}

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** Os balões saem em cascata: um começa `balao` depois do anterior e o último ainda faz o seu ciclo todo. */
const totalDaHistoria =
  config.duracoes.balao * (content.baloes.length - 1) +
  (config.historia.subidaFinalEm + config.historia.subidaFinal);

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
      montar({}, comFotos);

      const baloes = [...document.querySelectorAll<HTMLElement>('.balao')];
      baloes.forEach((balao, indice) => {
        const esperado = comFotos.baloes[indice];
        expect(balao.querySelector('.balao__frase')?.textContent).toBe(esperado?.frase);
        const foto = balao.querySelector<HTMLImageElement>('.balao__foto img');
        expect(foto?.alt).toBe(esperado?.alt);
        expect(foto?.style.objectPosition).toBe(esperado?.foco);
      });
    });

    it('sem as fotos do casal (31/10/2026), a frase vive dentro da nuvem e não sobra círculo vazio', () => {
      montar();

      const baloes = [...document.querySelectorAll<HTMLElement>('.balao')];
      expect(baloes).toHaveLength(content.baloes.length);
      baloes.forEach((balao, indice) => {
        expect(balao.classList.contains('balao--sem-foto')).toBe(true);
        expect(balao.querySelector('.balao__foto')).toBeNull();
        const frase = balao.querySelector('.balao__frase');
        expect(frase?.textContent).toBe(content.baloes[indice]?.frase);
        expect(frase?.parentElement).toBe(balao.querySelector('.balao__corpo'));
      });
    });

    it('foto que falha some e o balão fica só com a frase (RF-05.9, CT-05.7)', () => {
      montar({}, comFotos);
      const primeiro = document.querySelector('.balao');

      primeiro?.querySelector('.balao__foto img')?.dispatchEvent(new Event('error'));

      expect(primeiro?.querySelector('.balao__foto')).toBeNull();
      expect(primeiro?.querySelector('.balao__frase')?.textContent).toBe(content.baloes[0]?.frase);
    });

    it('as imagens das nuvens vêm do manifesto', () => {
      montar();

      const nuvens = [...document.querySelectorAll('.balao__nuvem')].map((i) =>
        i.getAttribute('data-src'),
      );

      expect(nuvens.slice(0, 3)).toEqual([
        config.imagens.balaoA,
        config.imagens.balaoB,
        config.imagens.balaoC,
      ]);
    });

    it('nuvens e fotos NÃO são pedidas no init, antes do toque de entrada: só quando a história começa (SPEC-02, RF-02.7)', () => {
      const { cena } = montar({}, comFotos);
      const imagens = () => [...document.querySelectorAll<HTMLImageElement>('.historia img')];

      expect(imagens()).toHaveLength(comFotos.baloes.length * 2);
      expect(imagens().every((imagem) => !imagem.hasAttribute('src'))).toBe(true);

      void cena.run();

      expect(imagens().every((imagem) => imagem.hasAttribute('src'))).toBe(true);
      const fotos = [...document.querySelectorAll('.balao__foto img')].map((i) =>
        i.getAttribute('src'),
      );
      expect(fotos).toEqual(comFotos.baloes.map((balao) => balao.foto));
    });

    it('um balão que nunca chega a rodar (Pular) não pede nenhuma imagem', () => {
      const { cena } = montar();

      cena.skip();

      expect(document.querySelectorAll('.historia img[src]')).toHaveLength(0);
    });
  });

  describe('execução (tlHistoria)', () => {
    it('emite inicio, cinco balões na ordem, e fim; o run resolve (CA-05.1.1)', async () => {
      const { cena, registro, frases } = montar();

      await cena.run();

      expect(registro).toEqual([
        `inicio:${String(totalDaHistoria)}`,
        'balao:0',
        'balao:1',
        'balao:2',
        'balao:3',
        'balao:4',
        'fim',
      ]);
      expect(frases).toEqual(content.baloes.map((b) => b.frase));
    });

    it('os balões saem em cascata: o segundo é anunciado antes de o primeiro ir embora (31/10/2026)', () => {
      const relogio = criarRelogioManual();
      try {
        const { cena, registro } = montar();
        void cena.run();

        for (let i = 0; i < 2000 && !registro.includes('balao:1'); i += 1) {
          relogio.avancar(0.002, 0.002);
        }

        expect(registro).toContain('balao:0');
        expect(registro).toContain('balao:1');
        expect(registro).not.toContain('fim');
        cena.skip();
      } finally {
        relogio.restaurar();
      }
    });

    it('a região aria-live recebe cada frase uma vez, só em texto (RF-05.8, CT-05.6)', async () => {
      const { cena, el } = montar();
      const anunciadas: string[] = [];
      // Uma entrada por mutação, não por chamada: com a máquina ocupada dois balões podem cair no mesmo
      // quadro e o navegador entrega os dois registros juntos, numa chamada só.
      new MutationObserver((registros) => {
        for (const registro of registros) {
          for (const no of registro.addedNodes) anunciadas.push(no.textContent ?? '');
        }
      }).observe(el('.historia [aria-live]'), { childList: true });

      await cena.run();

      // O MutationObserver avisa depois; com a máquina ocupada (o conjunto todo roda junto) pode demorar.
      await vi.waitFor(
        () => {
          expect(anunciadas).toEqual(content.baloes.map((b) => b.frase));
        },
        { timeout: 4000 },
      );
    });

    it('mostra a região durante a história e não cria nenhum controle para acelerá-la (ADR-0012)', () => {
      const { cena, el } = montar();

      void cena.run();

      expect(el('.historia').hidden).toBe(false);
      expect(document.querySelector('.historia button')).toBeNull();
    });

    it('ao terminar, esconde a região: ela não cobre a tela durante o envelope e a carta (SPEC-05, SPEC-09)', async () => {
      const { cena, el } = montar();

      await cena.run();

      expect(el('.historia').hidden).toBe(true);
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

    it('na horizontal o balão para mais alto, para a legenda não cair sobre o baú (ADR-0012)', () => {
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200); // o happy-dom não mede
      // Relógio manual: com o relógio real, uma máquina ocupada lia a altura já na subida da leitura.
      const relogio = criarRelogioManual();
      const alturaDeParada = (largura: number) => {
        document.body.innerHTML = '';
        Object.assign(window, { innerWidth: largura, innerHeight: 800 });
        const { cena } = montar();
        void cena.run();
        const primeiro = document.querySelector('.balao');
        // Anda até o balão terminar de sair da boca do baú, que é onde ele "para".
        for (let i = 0; i < 2000 && Number(gsap.getProperty(primeiro, 'opacity')) < 1; i += 1) {
          relogio.avancar(0.005, 0.005);
        }
        const y = Number(gsap.getProperty(primeiro, 'y'));
        cena.skip();
        return y;
      };

      try {
        const vertical = alturaDeParada(400);
        const horizontal = alturaDeParada(1200);

        expect(horizontal).toBeLessThan(vertical); // y menor = mais perto do alto da tela
      } finally {
        relogio.restaurar();
      }
    });

    it('cada balão sai da boca do baú com desvio horizontal próprio (SPEC-05, desvios)', async () => {
      const { cena } = montar();
      Object.assign(window, { innerWidth: 1000, innerHeight: 800 });

      await cena.run();

      const xs = [...document.querySelectorAll<HTMLElement>('.balao')].map((b) =>
        Math.round(Number(gsap.getProperty(b, 'x'))),
      );
      expect(xs).toEqual([280, 700, 300, 720, 500]); // 1000 × (0,5 + desvio)
    });
  });

  describe('nada na tela acelera nem pula a história (ADR-0012)', () => {
    it('tocar na região ou na tela não muda a velocidade da linha do tempo', () => {
      // Relógio manual: a história inteira dura uma fração de segundo nos testes, curta demais para o relógio real.
      const relogio = criarRelogioManual();
      try {
        const { cena, el, linha } = montar();
        void cena.run();
        relogio.avancar(0.01, 0.005);
        expect(linha().time()).toBeGreaterThan(0);

        el('.historia').click();
        document.body.click();
        document.dispatchEvent(new Event('pointerdown'));

        expect(linha().timeScale()).toBe(1);
        cena.skip();
      } finally {
        relogio.restaurar();
      }
    });

    it('as cinco frases são anunciadas, na ordem, sem pular nenhuma', async () => {
      const { cena, frases } = montar();

      await cena.run();

      expect(frases).toEqual(content.baloes.map((b) => b.frase));
    });

    it('a história inteira dura cerca de 5 s: cinco balões em cascata, não um depois do outro (31/10/2026)', () => {
      const { balao } = configReal.duracoes;
      const { subidaFinalEm, subidaFinal, alturas, desvios } = configReal.historia;

      const total = balao * (content.baloes.length - 1) + subidaFinalEm + subidaFinal;

      expect(total).toBeLessThanOrEqual(5);
      expect(total).toBeGreaterThan(4);
      expect(alturas).toHaveLength(content.baloes.length);
      expect(desvios).toHaveLength(content.baloes.length);
    });

    it('a configuração não tem mais velocidade de aceleração nem dica de toque', () => {
      expect(config.historia).not.toHaveProperty('aceleracao');
      expect(config.historia).not.toHaveProperty('dica');
      expect(content.dicas).not.toHaveProperty('avancar');
    });
  });

  describe('legenda do balão', () => {
    it('com foto, a frase fica fora do corpo que balança, para não girar junto com a nuvem', () => {
      montar({}, comFotos);

      for (const balao of document.querySelectorAll('.balao')) {
        const frase = balao.querySelector('.balao__frase');
        expect(frase?.parentElement).toBe(balao);
        expect(balao.querySelector('.balao__corpo .balao__nuvem')).not.toBeNull();
        expect(balao.querySelector('.balao__corpo .balao__frase')).toBeNull();
      }
    });

    it('o desvio do balão é cancelado na legenda: ela fica no centro da tela (--desvio-x)', async () => {
      const { cena } = montar();
      Object.assign(window, { innerWidth: 1000, innerHeight: 800 });

      await cena.run();

      const recuos = [...document.querySelectorAll<HTMLElement>('.balao')].map((b) =>
        Math.round(Number.parseFloat(b.style.getPropertyValue('--desvio-x'))),
      );
      expect(recuos).toEqual([220, -200, 200, -220, 0]); // -(desvio × 1000)
    });

    it('a frase some antes de o balão partir', async () => {
      const { cena } = montar();

      await cena.run();

      for (const frase of document.querySelectorAll<HTMLElement>('.balao__frase')) {
        expect(Number(gsap.getProperty(frase, 'opacity'))).toBe(0);
      }
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

    it('skip interrompe a história: nenhum evento depois dele', () => {
      // Relógio manual: a história inteira dura uma fração de segundo nos testes, curta demais para o skip cair no meio.
      const relogio = criarRelogioManual();
      try {
        const { cena, registro } = montar();
        void cena.run();
        for (let i = 0; i < 2000 && !registro.includes('balao:0'); i += 1) {
          relogio.avancar(0.002, 0.002);
        }
        expect(registro).toContain('balao:0');

        cena.skip();
        const depois = [...registro];
        relogio.avancar(2, 0.05);

        expect(registro).toEqual(depois);
        expect(registro).not.toContain('fim');
      } finally {
        relogio.restaurar();
      }
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
