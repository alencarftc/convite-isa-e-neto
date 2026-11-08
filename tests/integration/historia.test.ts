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
  eventos.on('historia:ultimo', () => registro.push('ultimo'));
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
  /** A peça de uma memória (`.memoria__cartao`, `.memoria__estrela`…), pelo índice dela. */
  const peca = (seletor: string, indice: number) => {
    const elemento = document.querySelectorAll<HTMLElement>(seletor)[indice];
    if (!elemento) throw new Error(`sem ${seletor} ${String(indice)}`);
    return elemento;
  };
  const prop = (seletor: string, indice: number, propriedade: string) =>
    Number(gsap.getProperty(peca(seletor, indice), propriedade));
  /** A linha do tempo da história é a única do GSAP que tem o rótulo "fim". */
  const linha = () => {
    const encontrada = gsap.globalTimeline
      .getChildren(false, false, true)
      .filter((t): t is gsap.core.Timeline => 'labels' in t && 'fim' in t.labels)
      .at(-1);
    if (!encontrada) throw new Error('linha do tempo da história não encontrada');
    return encontrada;
  };

  return { cena, estado, eventos, registro, frases, el, opacidade, peca, prop, linha };
}

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
});

const { balao: duracaoDaMemoria } = config.duracoes;
const parametros = config.historia;
const quantidade = content.baloes.length;
/** As memórias vêm uma depois da outra, cada uma por `balao`; depois as estrelas se juntam (`convergencia`). */
const totalDaHistoria = duracaoDaMemoria * quantidade + parametros.convergencia;

describe('história em memórias de luz (SPEC-05, ADR-0026)', () => {
  describe('estrutura', () => {
    it('monta uma região nomeada, oculta, com uma memória por item de content.baloes (RF-05.1)', () => {
      const { el } = montar();

      expect(el('.historia').getAttribute('aria-label')).toBe('História do casal');
      expect(el('.historia').hidden).toBe(true);
      expect(document.querySelectorAll('.historia .memoria__cartao')).toHaveLength(quantidade);
    });

    it('cada memória tem a centelha, o cartão, a estrela e a sua poeira', () => {
      montar();

      expect(document.querySelectorAll('.memoria__centelha')).toHaveLength(quantidade);
      expect(document.querySelectorAll('.memoria__estrela')).toHaveLength(quantidade);
      expect(document.querySelectorAll('.memoria__po')).toHaveLength(
        quantidade * parametros.poeira.quantidade,
      );
      expect(document.querySelector('.historia__clarao')).not.toBeNull();
    });

    it('cada cartão traz a frase aprovada, em texto', () => {
      montar();

      const cartoes = [...document.querySelectorAll('.memoria__cartao')];
      cartoes.forEach((cartao, indice) => {
        expect(cartao.querySelector('.memoria__frase')?.textContent).toBe(
          content.baloes[indice]?.frase,
        );
      });
    });

    it('é só enfeite e texto: nada de balões nem de nuvens, e nenhuma imagem sem as fotos do casal (ADR-0026)', () => {
      montar();

      expect(document.querySelector('.balao, .balao__nuvem')).toBeNull();
      expect(document.querySelectorAll('.historia img')).toHaveLength(0);
    });

    it('com foto, o cartão ganha o medalhão com alt e o ponto de foco do conteúdo (RF-05.3)', () => {
      montar({}, comFotos);

      const cartoes = [...document.querySelectorAll<HTMLElement>('.memoria__cartao')];
      cartoes.forEach((cartao, indice) => {
        const esperado = comFotos.baloes[indice];
        const foto = cartao.querySelector<HTMLImageElement>('.memoria__foto img');
        expect(foto?.alt).toBe(esperado?.alt);
        expect(foto?.style.objectPosition).toBe(esperado?.foco);
        expect(cartao.querySelector('.memoria__frase')?.textContent).toBe(esperado?.frase);
      });
    });

    it('sem as fotos do casal (31/10/2026), não sobra círculo vazio', () => {
      montar();

      expect(document.querySelector('.memoria__foto')).toBeNull();
    });

    it('foto que falha some e o cartão fica só com a frase (RF-05.9, CT-05.7)', () => {
      montar({}, comFotos);
      const primeiro = document.querySelector('.memoria__cartao');

      primeiro?.querySelector('.memoria__foto img')?.dispatchEvent(new Event('error'));

      expect(primeiro?.querySelector('.memoria__foto')).toBeNull();
      expect(primeiro?.querySelector('.memoria__frase')?.textContent).toBe(
        content.baloes[0]?.frase,
      );
    });

    it('as fotos NÃO são pedidas no init, antes do toque de entrada: só quando a história começa (SPEC-02, RF-02.7)', () => {
      const { cena } = montar({}, comFotos);
      const imagens = () => [...document.querySelectorAll<HTMLImageElement>('.historia img')];

      expect(imagens()).toHaveLength(comFotos.baloes.length);
      expect(imagens().every((imagem) => !imagem.hasAttribute('src'))).toBe(true);

      void cena.run();

      expect(imagens().every((imagem) => imagem.hasAttribute('src'))).toBe(true);
      const fotos = imagens().map((i) => i.getAttribute('src'));
      expect(fotos).toEqual(comFotos.baloes.map((balao) => balao.foto));
    });

    it('uma memória que nunca chega a rodar (Pular) não pede nenhuma imagem', () => {
      const { cena } = montar({}, comFotos);

      cena.skip();

      expect(document.querySelectorAll('.historia img[src]')).toHaveLength(0);
    });
  });

  describe('execução (tlHistoria)', () => {
    it('emite inicio, cinco memórias na ordem, o aviso da última e fim; o run resolve (CA-05.1.1)', async () => {
      const { cena, registro, frases } = montar();

      await cena.run();

      expect(registro).toEqual([
        `inicio:${String(totalDaHistoria)}`,
        'balao:0',
        'balao:1',
        'balao:2',
        'balao:3',
        'balao:4',
        'ultimo', // a fada começa a se esvair com a última memória (02/11/2026)
        'fim',
      ]);
      expect(frases).toEqual(content.baloes.map((b) => b.frase));
    });

    it('cada memória é anunciada só quando a anterior terminou o seu tempo: uma a cada `duracoes.balao` (01/11/2026)', () => {
      const relogio = criarRelogioManual();
      try {
        const { cena, registro } = montar();
        void cena.run();

        relogio.avancar(duracaoDaMemoria - 0.02, 0.002);
        expect(registro).toContain('balao:0');
        expect(registro).not.toContain('balao:1'); // a primeira ainda está à vista

        relogio.avancar(0.04, 0.002);
        expect(registro).toContain('balao:1');
        expect(registro).not.toContain('balao:2');
        expect(registro).not.toContain('fim');
        cena.skip();
      } finally {
        relogio.restaurar();
      }
    });

    it('a história dura as cinco memórias mais a convergência das estrelas', () => {
      const { cena, linha } = montar();
      void cena.run();

      expect(linha().duration()).toBeCloseTo(totalDaHistoria);
      cena.skip();
    });

    it('a região aria-live recebe cada frase uma vez, só em texto (RF-05.8, CT-05.6)', async () => {
      const { cena, el } = montar();
      const anunciadas: string[] = [];
      // Uma entrada por mutação, não por chamada: com a máquina ocupada duas memórias podem cair no mesmo
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

    it('a luz caminha ao pôr do sol dentro da própria história e termina nele (CA-03.3.1, CA-03.3.2)', () => {
      const { cena, opacidade, linha } = montar();
      // Sem o CSS (que começa em 0), as camadas partem invisíveis por aqui.
      gsap.set('.camada--ceu-sol, .camada--luz', { opacity: 0 });
      void cena.run();

      linha().time(totalDaHistoria / 2);
      expect(opacidade('.camada--ceu-sol')).toBeGreaterThan(0);
      expect(opacidade('.camada--ceu-sol')).toBeLessThan(1);

      linha().time(totalDaHistoria);
      expect(opacidade('.camada--ceu-sol')).toBe(1);
      expect(opacidade('.camada--luz')).toBe(1);
      cena.skip();
    });
  });

  describe('o caminho de cada memória (ADR-0026)', () => {
    it('a centelha nasce e sobe, e ao chegar se abre no cartão, que respira enquanto é lido', () => {
      const { cena, linha, prop } = montar();
      void cena.run();

      linha().time(parametros.centelhaSobe * 0.5);
      expect(prop('.memoria__centelha', 0, 'opacity')).toBeGreaterThan(0);
      expect(prop('.memoria__cartao', 0, 'opacity')).toBe(0);

      linha().time(parametros.cartaoEm + parametros.cartaoAparece);
      expect(prop('.memoria__cartao', 0, 'opacity')).toBe(1);
      expect(prop('.memoria__centelha', 0, 'opacity')).toBeLessThan(1);

      linha().time(parametros.cartaoEm + parametros.cartaoAparece + parametros.respiro.duracao);
      expect(prop('.memoria__cartao', 0, 'scaleX')).toBeCloseTo(parametros.respiro.escala);
      cena.skip();
    });

    it('a frase só fica legível depois que o cartão se abre, e some com ele', () => {
      const { cena, linha, prop } = montar();
      void cena.run();

      linha().time(parametros.cartaoEm);
      expect(prop('.memoria__frase', 0, 'opacity')).toBe(0);

      linha().time(parametros.fraseEm + parametros.fraseAparece);
      expect(prop('.memoria__frase', 0, 'opacity')).toBe(1);

      linha().time(duracaoDaMemoria);
      expect(prop('.memoria__cartao', 0, 'opacity')).toBe(0);
      cena.skip();
    });

    it('cada cartão se abre no centro, com o seu desvio, e o seguinte só depois (nunca dois cartões juntos)', () => {
      const { cena, linha, prop } = montar();
      void cena.run();

      quantidadeDeMemorias().forEach((indice) => {
        linha().time(indice * duracaoDaMemoria + parametros.cartaoEm + parametros.cartaoAparece);
        const esperado = window.innerWidth * (0.5 + (parametros.desvios[indice] ?? 0));
        expect(prop('.memoria__cartao', indice, 'x')).toBeCloseTo(esperado);
        const visiveis = [...document.querySelectorAll<HTMLElement>('.memoria__cartao')].filter(
          (cartao) => Number(gsap.getProperty(cartao, 'opacity')) > 0.01,
        );
        expect(visiveis).toHaveLength(1);
      });
      cena.skip();
    });

    it('ao se desfazer, o cartão solta poeira dourada e deixa a sua estrela no arco', () => {
      const { cena, linha, prop } = montar();
      void cena.run();

      linha().time(parametros.cartaoSomeEm + parametros.poeira.aparece);
      const poeira = [...document.querySelectorAll<HTMLElement>('.memoria__po')].slice(
        0,
        parametros.poeira.quantidade,
      );
      expect(poeira.every((po) => Number(gsap.getProperty(po, 'opacity')) > 0)).toBe(true);

      linha().time(duracaoDaMemoria);
      expect(prop('.memoria__estrela', 0, 'opacity')).toBe(1);
      expect(poeira.every((po) => Number(gsap.getProperty(po, 'opacity')) < 0.05)).toBe(true);
      cena.skip();
    });

    it('as estrelas se acendem uma por memória: com três memórias, três estrelas', () => {
      const { cena, linha, prop } = montar();
      void cena.run();

      linha().time(3 * duracaoDaMemoria);

      [0, 1, 2].forEach((indice) => {
        expect(prop('.memoria__estrela', indice, 'opacity')).toBe(1);
      });
      [3, 4].forEach((indice) => {
        expect(prop('.memoria__estrela', indice, 'opacity')).toBe(0);
      });
      cena.skip();
    });

    it('o arco abre da esquerda para a direita, uma estrela ao lado da outra', () => {
      const { cena, linha, prop } = montar();
      void cena.run();

      linha().time(quantidade * duracaoDaMemoria);
      const xs = quantidadeDeMemorias().map((indice) => prop('.memoria__estrela', indice, 'x'));

      expect([...xs].sort((a, b) => a - b)).toEqual(xs);
      expect(new Set(xs).size).toBe(quantidade);
      cena.skip();
    });
  });

  describe('as estrelas viram o envelope (ADR-0026)', () => {
    it('depois da última memória as cinco estrelas descem juntas ao ponto onde o envelope pousa', () => {
      const { cena, linha, prop } = montar();
      void cena.run();

      linha().time(totalDaHistoria);

      const alvoX = window.innerWidth / 2;
      const alvoY = window.innerHeight * config.carta.alturaDoPouso;
      quantidadeDeMemorias().forEach((indice) => {
        expect(prop('.memoria__estrela', indice, 'x')).toBeCloseTo(alvoX);
        expect(prop('.memoria__estrela', indice, 'y')).toBeCloseTo(alvoY);
        expect(prop('.memoria__estrela', indice, 'opacity')).toBe(0);
      });
      cena.skip();
    });

    it('um clarão acende nesse ponto perto do fim, e se apaga quando o envelope nasce', () => {
      const { cena, linha, opacidade } = montar();
      void cena.run();

      linha().time(duracaoDaMemoria * quantidade + parametros.convergencia * 0.3);
      expect(opacidade('.historia__clarao')).toBe(0);

      linha().time(duracaoDaMemoria * quantidade + parametros.convergencia * 0.85);
      expect(opacidade('.historia__clarao')).toBeCloseTo(1);

      linha().time(totalDaHistoria);
      expect(opacidade('.historia__clarao')).toBe(0);
      cena.skip();
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

    it('cada memória fica 5 s, e a frase pelo menos 3 s à vista, para dar tempo de ler (01/11/2026)', () => {
      const { balao } = configReal.duracoes;
      const p = configReal.historia;

      const fraseLegivel = p.cartaoSomeEm - (p.fraseEm + p.fraseAparece);
      const respiroTermina = p.cartaoEm + p.cartaoAparece + 2 * p.respiro.duracao;

      expect(balao).toBe(5);
      expect(fraseLegivel).toBeGreaterThanOrEqual(3);
      expect(respiroTermina).toBeCloseTo(p.cartaoSomeEm); // o cartão respira até começar a se desfazer
      // A estrela e a poeira terminam dentro dos 5 s da memória: a seguinte já pode começar.
      expect(p.cartaoSomeEm + p.estrela.atraso + p.estrela.sobe).toBeLessThanOrEqual(balao + 1e-9);
      expect(p.cartaoSomeEm + p.poeira.aparece + p.poeira.duracao).toBeLessThanOrEqual(
        balao + 1e-9,
      );
      expect(p.desvios).toHaveLength(content.baloes.length);
      expect(p.inclinacoes).toHaveLength(content.baloes.length);
      expect(balao * content.baloes.length + p.convergencia).toBeCloseTo(26.1);
    });

    it('a configuração não tem mais velocidade de aceleração nem dica de toque', () => {
      expect('velocidade' in configReal.historia).toBe(false);
      expect('aceleracao' in configReal.historia).toBe(false);
      expect('toque' in content.dicas).toBe(false);
    });
  });

  describe('estado final e limpeza (RF-05.10)', () => {
    it('skip esconde a história e deixa a luz no pôr do sol', () => {
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

/** 0, 1, 2, 3, 4: os índices das memórias. */
function quantidadeDeMemorias(): number[] {
  return content.baloes.map((_, indice) => indice);
}
