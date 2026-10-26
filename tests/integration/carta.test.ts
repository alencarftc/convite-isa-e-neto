import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarBarramento } from '@/application/barramento-eventos';
import { registrarVisita } from '@/application/use-cases/registrar-visita';
import { config as configReal } from '@/config/config';
import { content } from '@/config/content';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { criarCenaBosque } from '@/presentation/bosque/cena-bosque';
import { criarCartaEConvite } from '@/presentation/carta/cena-carta';
import { montarCarta } from '@/presentation/carta/montar-carta';

import { criarCarregamentoFalso } from './suporte/carregamento-falso';
import { configRapida } from './suporte/config-rapida';
import { criarEstadoFalso, type OpcoesDoEstadoFalso } from './suporte/estado-falso';
import { montarIndexHtml } from './suporte/index-html';

const config = configRapida(configReal);

/** Monta o bosque (cena, baú, casal, luzes) e a carta, como na raiz de composição. */
function montar(opcoes: OpcoesDoEstadoFalso = {}) {
  montarIndexHtml();
  document.body.removeAttribute('style');
  const raiz = document.querySelector<HTMLElement>('#app');
  if (!raiz) throw new Error('index.html sem #app');

  const { estado } = criarEstadoFalso(opcoes);
  const { carregamento } = criarCarregamentoFalso(config, { instantaneo: true });
  const eventos = criarBarramento<EventosConvite>();
  const registro: string[] = [];
  eventos.on('carta:pousou', () => registro.push('pousou'));
  eventos.on('carta:abrindo', ({ origem }) => registro.push(`abrindo:${origem}`));
  eventos.on('convite:aberto', () => registro.push('aberto'));
  registrarVisita({ estado, eventos });

  criarCenaBosque({ raiz, config, estado, eventos, carregamento }).init();
  const { carta, convite } = criarCartaEConvite({
    raiz,
    conteudo: content,
    config,
    estado,
    eventos,
  });
  carta.init();
  convite.init();

  const el = (seletor: string) => {
    const elemento = document.querySelector<HTMLElement>(seletor);
    if (!elemento) throw new Error(`sem ${seletor}`);
    return elemento;
  };
  const botao = () => {
    const elemento = document.querySelector<HTMLButtonElement>('.carta__abrir');
    if (!elemento) throw new Error('sem botão do envelope');
    return elemento;
  };
  const opacidade = (seletor: string) => Number(gsap.getProperty(el(seletor), 'opacity'));

  /** Percorre a etapa do envelope e a da abertura, devolvendo as duas promessas. */
  function abrirTudo(como: 'toque' | 'tempo') {
    const aEtapaDaCarta = carta.run();
    if (como === 'toque') {
      void vi
        .waitFor(() => {
          expect(botao().disabled).toBe(false);
        })
        .then(() => {
          botao().click();
        });
    }
    return aEtapaDaCarta.then(() => convite.run());
  }

  return { carta, convite, estado, eventos, registro, raiz, el, botao, opacidade, abrirTudo };
}

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.removeAttribute('style');
});

describe('montarCarta (SPEC-06, "Layout da carta")', () => {
  const artigo = () => montarCarta(content.carta, 'papel.svg');

  it('tem os quatorze blocos, na ordem aprovada, com o texto de content.carta (CT-06.5)', () => {
    const blocos = [...artigo().querySelectorAll('.carta__bloco')];
    const c = content.carta;

    expect(blocos).toHaveLength(14);
    expect(blocos.map((b) => b.textContent.replace(/\s+/g, ' ').trim())).toEqual([
      c.versiculo,
      c.referencia,
      '', // filete (SVG)
      c.bencao,
      `${c.paisNoiva.join('')}${c.paisNoivo.join('')}`,
      `${c.nomes.noiva} ${c.nomes.e} ${c.nomes.noivo}`,
      c.convite,
      c.data,
      `${c.cerimonia}${c.local}${c.endereco}`,
      '', // filete (SVG)
      c.fecho,
      c.referenciaFecho,
      c.despedida,
      c.assinatura,
    ]);
  });

  it('o título é o foco da abertura e o "&" é dourado (RF-06.10)', () => {
    const titulo = artigo().querySelector<HTMLElement>('#carta-titulo');

    expect(titulo?.tagName).toBe('H2');
    expect(titulo?.getAttribute('tabindex')).toBe('-1');
    expect(titulo?.querySelector('.carta__e')?.textContent).toBe('&');
  });

  it('os pais da noiva vêm primeiro e depois os do noivo, um nome por linha (CT-06.6)', () => {
    const colunas = [...artigo().querySelectorAll('.carta__coluna')];

    expect(colunas).toHaveLength(2);
    expect([...(colunas[0]?.querySelectorAll('li') ?? [])].map((li) => li.textContent)).toEqual([
      ...content.carta.paisNoiva,
    ]);
    expect([...(colunas[1]?.querySelectorAll('li') ?? [])].map((li) => li.textContent)).toEqual([
      ...content.carta.paisNoivo,
    ]);
  });

  it('os filetes são decorativos e a carta é nomeada pelo título', () => {
    const a = artigo();

    expect(a.getAttribute('aria-labelledby')).toBe('carta-titulo');
    for (const filete of a.querySelectorAll('.carta__filete')) {
      expect(filete.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('usa a imagem do papel como fundo', () => {
    expect(artigo().style.backgroundImage).toContain('papel.svg');
  });
});

describe('envelope e carta (SPEC-06)', () => {
  describe('imagens só quando o envelope começa (SPEC-02, RF-02.7)', () => {
    /** Conta as imagens criadas por `new Image()` (as pétalas da chuva). */
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
    const imagensDoEnvelope = () => [
      ...document.querySelectorAll<HTMLImageElement>('.envelope img'),
    ];

    it('o envelope, o selo e as pétalas não são pedidos no init, antes do toque de entrada', () => {
      const criadas = espionarImagens();
      montar();

      expect(imagensDoEnvelope()).toHaveLength(4); // fechado, aberto e as duas metades do selo
      expect(imagensDoEnvelope().every((imagem) => !imagem.hasAttribute('src'))).toBe(true);
      expect(criadas).toHaveLength(0);
    });

    it('a carta e o casal, que o estado final também mostra, continuam sendo pedidos no init', () => {
      montar();

      expect(document.querySelector('.casal__imagem')?.getAttribute('src')).toBe(
        config.imagens.casal,
      );
      expect(document.querySelector<HTMLElement>('.carta')?.style.backgroundImage).toContain(
        config.imagens.papelCarta,
      );
    });

    it('o run da carta pede o envelope, o selo e as três variações de pétala', () => {
      const criadas = espionarImagens();
      const { carta } = montar();

      void carta.run();

      expect(imagensDoEnvelope().every((imagem) => imagem.hasAttribute('src'))).toBe(true);
      expect(criadas.map((imagem) => imagem.src)).toEqual([
        config.imagens.petalaA,
        config.imagens.petalaB,
        config.imagens.petalaC,
      ]);
    });

    it('quem pula nunca pede o envelope', () => {
      const criadas = espionarImagens();
      const { carta, convite } = montar();

      carta.skip();
      convite.skip();

      expect(imagensDoEnvelope().every((imagem) => !imagem.hasAttribute('src'))).toBe(true);
      expect(criadas).toHaveLength(0);
    });
  });

  describe('estrutura (init)', () => {
    it('monta o envelope com "para", o selo em duas metades com as iniciais em texto e o botão (RF-06.1 a 06.3)', () => {
      const { el, botao } = montar();

      expect(el('.envelope__para').textContent).toBe('Para você e sua família');
      expect(el('.selo__iniciais').textContent).toBe('I&D');
      expect(document.querySelectorAll('.selo__metade')).toHaveLength(2);
      expect(botao().getAttribute('aria-label')).toBe('Abrir o envelope');
      expect(botao().disabled).toBe(true);
    });

    it('a carta já existe no HTML, inerte, e a página não rola até a abertura (RF-06.9)', () => {
      const { el } = montar();

      expect(el('.conteudo').hasAttribute('inert')).toBe(true);
      expect(el('.conteudo .carta')).toBeTruthy();
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('"Role para ler" fica dentro do conteúdo, depois da carta, e é só um aviso visual (SPEC-14, RF-14.4)', () => {
      const { el, raiz } = montar();

      const dica = el('.conteudo > .convite__rolar');
      expect(dica.previousElementSibling?.className).toBe('carta');
      expect(dica.textContent).toBe(content.dicas.rolar);
      expect(dica.getAttribute('aria-hidden')).toBe('true');
      expect(raiz.querySelector(':scope > .convite__rolar')).toBeNull();
    });

    it('o casal vai para o espaço da cena do bosque, para subir junto com ela', () => {
      const { el } = montar();

      expect(el('.cena .casal .casal__imagem')).toBeTruthy();
    });
  });

  describe('o envelope (tlCarta)', () => {
    it('pousa, emite carta:pousou, muda a fase e habilita o selo com a dica (CA-06.1.1, CA-06.1.2)', async () => {
      const { carta, registro, estado, botao, el } = montar();
      void carta.run();

      await vi.waitFor(() => {
        expect(registro).toContain('pousou');
      });

      expect(estado.fase).toBe('aguardando-selo');
      expect(botao().disabled).toBe(false);
      expect(el('.carta__dica').textContent).toBe('Toque no selo');
    });

    it('o foco vai para o botão do envelope quando ele pousa (SPEC-09, RF-09.6)', async () => {
      const { carta, botao, registro } = montar();
      void carta.run();

      await vi.waitFor(() => {
        expect(registro).toContain('pousou');
      });

      expect(document.activeElement).toBe(botao());
    });

    it('um toque abre e o run resolve com origem "toque" (CA-06.2.1, CT-06.2)', async () => {
      const { carta, convite, registro, botao } = montar();
      const etapa = carta.run();
      await vi.waitFor(() => {
        expect(botao().disabled).toBe(false);
      });

      botao().click();
      await etapa;
      const abrindo = convite.run();
      await abrindo;

      expect(registro.filter((r) => r.startsWith('abrindo'))).toEqual(['abrindo:toque']);
    });

    it('sem toque, abre sozinho depois da espera do selo, com origem "tempo" (CA-06.3.1, CT-06.3)', async () => {
      const { registro, abrirTudo } = montar();

      await abrirTudo('tempo');

      expect(registro).toEqual(['pousou', 'abrindo:tempo', 'aberto']);
    });

    it('toque e fim da espera ao mesmo tempo: só a primeira origem vale (casos de borda)', async () => {
      const { carta, convite, registro, botao } = montar();
      const etapa = carta.run();
      await vi.waitFor(() => {
        expect(botao().disabled).toBe(false);
      });

      botao().click();
      botao().click();
      await etapa;
      await new Promise((resolver) => setTimeout(resolver, config.duracoes.esperaSelo * 1000 + 40));
      await convite.run();

      expect(registro.filter((r) => r.startsWith('abrindo'))).toEqual(['abrindo:toque']);
    });

    describe('deslizar o selo (SPEC-16)', () => {
      /** Pousa o dedo no selo (no happy-dom ele está em 0, 0) e o arrasta `dy` pixels para baixo. */
      const deslizar = (alvo: HTMLElement, dy: number) => {
        const ponteiro = (tipo: string, y: number) =>
          alvo.dispatchEvent(
            new PointerEvent(tipo, { pointerId: 1, clientX: 0, clientY: y, isPrimary: true }),
          );
        ponteiro('pointerdown', 0);
        ponteiro('pointermove', dy);
        ponteiro('pointerup', dy);
      };
      const esperarOSelo = async (botao: () => HTMLButtonElement) => {
        await vi.waitFor(() => {
          expect(botao().disabled).toBe(false);
        });
      };

      it('arrastar o selo além do limiar abre o envelope, com origem "gesto" (CT-16.1)', async () => {
        const { carta, convite, registro, botao } = montar();
        const etapa = carta.run();
        await esperarOSelo(botao);

        deslizar(botao(), config.carta.gesto.limiar + 20);
        await etapa;
        await convite.run();

        expect(registro.filter((r) => r.startsWith('abrindo'))).toEqual(['abrindo:gesto']);
      });

      it('arrastar menos que o limiar não abre, e o click que sobra do arrasto também não (CT-16.1)', async () => {
        const { carta, registro, botao } = montar();
        void carta.run();
        await esperarOSelo(botao);

        deslizar(botao(), config.carta.gesto.limiar - 20);
        botao().click(); // o navegador dispara um click depois de soltar o mouse

        expect(registro.filter((r) => r.startsWith('abrindo'))).toEqual([]);
        expect(botao().disabled).toBe(false);
      });

      it('depois de um arrasto curto, um toque de verdade ainda abre (CT-16.2)', async () => {
        const { carta, convite, registro, botao } = montar();
        const etapa = carta.run();
        await esperarOSelo(botao);
        deslizar(botao(), config.carta.gesto.limiar - 20);
        botao().click();

        botao().dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerId: 2,
            clientX: 400,
            clientY: 400,
            isPrimary: true,
          }),
        );
        botao().click();
        await etapa;
        await convite.run();

        expect(registro.filter((r) => r.startsWith('abrindo'))).toEqual(['abrindo:toque']);
      });

      it('toque, espera e arrasto levam à mesma abertura: só a primeira origem vale (CT-16.2)', async () => {
        const { carta, convite, registro, botao } = montar();
        const etapa = carta.run();
        await esperarOSelo(botao);

        botao().click();
        deslizar(botao(), config.carta.gesto.limiar + 20);
        await etapa;
        await new Promise((resolver) =>
          setTimeout(resolver, config.duracoes.esperaSelo * 1000 + 40),
        );
        await convite.run();

        expect(registro.filter((r) => r.startsWith('abrindo'))).toEqual(['abrindo:toque']);
      });

      it('a espera do selo continua abrindo sozinha quando ninguém desliza (CT-16.2)', async () => {
        const { registro, abrirTudo } = montar();

        await abrirTudo('tempo');

        expect(registro).toEqual(['pousou', 'abrindo:tempo', 'aberto']);
      });
    });

    it('o toque antes do pouso é ignorado (o botão só habilita ao pousar)', () => {
      const { carta, botao, registro } = montar();
      void carta.run();

      botao().click();

      expect(botao().disabled).toBe(true);
      expect(registro).toEqual([]);
    });
  });

  describe('a abertura (tlConvite)', () => {
    it('emite carta:abrindo e, no fim, convite:aberto, nessa ordem (CA-06.4.1)', async () => {
      const { registro, abrirTudo } = montar();

      await abrirTudo('toque');

      expect(registro).toEqual(['pousou', 'abrindo:toque', 'aberto']);
    });

    it('termina com a carta desdobrada, os blocos visíveis, o envelope fora e a cena no alto (CA-06.4.2)', async () => {
      const { abrirTudo, opacidade, el } = montar();
      Object.assign(window, { innerHeight: 800 });

      await abrirTudo('toque');

      expect(opacidade('.carta')).toBe(1);
      expect(Number(gsap.getProperty(el('.carta'), 'scaleY'))).toBe(1);
      for (const bloco of document.querySelectorAll<HTMLElement>('.carta__bloco')) {
        expect(Number(gsap.getProperty(bloco, 'opacity'))).toBe(1);
      }
      expect(opacidade('.envelope')).toBe(0);
      expect(opacidade('.bau')).toBe(0);
      expect(Number(gsap.getProperty(el('.cena'), 'y'))).toBeCloseTo(
        -800 * config.convite.cenaSobeFracao,
      );
      expect(opacidade('.casal__imagem')).toBe(1);
    });

    it('libera a rolagem, tira o inert e leva o foco ao título (RF-06.9, RF-06.10)', async () => {
      const { abrirTudo, el } = montar();

      await abrirTudo('toque');

      expect(document.body.style.overflow).toBe('');
      expect(el('.conteudo').hasAttribute('inert')).toBe(false);
      expect(document.activeElement).toBe(el('#carta-titulo'));
    });

    it('"Role para ler" aparece e some sozinha depois de rolarVisivel, sem precisar rolar (SPEC-14, RF-14.4)', async () => {
      const { abrirTudo, opacidade } = montar();

      await abrirTudo('toque');
      expect(opacidade('.convite__rolar')).toBe(1);

      await vi.waitFor(
        () => {
          expect(opacidade('.convite__rolar')).toBe(0);
        },
        { timeout: 2000 },
      );
    });

    it('"Role para ler" some na primeira rolagem, sem esperar os segundos de rolarVisivel (SPEC-14, RF-14.4)', async () => {
      const { abrirTudo, el } = montar();
      await abrirTudo('toque');
      const para = vi.spyOn(gsap, 'to');

      window.dispatchEvent(new Event('scroll'));

      const apagouADica = para.mock.calls.some(
        ([alvo, vars]) => alvo === el('.convite__rolar') && vars.opacity === 0,
      );
      expect(apagouADica).toBe(true);
      para.mockRestore();
    });

    it('a rolagem só conta uma vez: a segunda não refaz o desvanecimento', async () => {
      const { abrirTudo } = montar();
      await abrirTudo('toque');
      window.dispatchEvent(new Event('scroll'));
      const para = vi.spyOn(gsap, 'to');

      window.dispatchEvent(new Event('scroll'));

      expect(para).not.toHaveBeenCalled();
      para.mockRestore();
    });

    it('registra a visita no aparelho só ao terminar de abrir (RF-06.10)', async () => {
      const { abrirTudo, estado } = montar();

      const termino = abrirTudo('toque');
      expect(estado.visitado).toBe(false);
      await termino;

      expect(estado.visitado).toBe(true);
    });

    it('leva a luz ao pôr do sol antes de começar, mesmo com a história pulada (RF-06.7)', async () => {
      const { carta, convite, opacidade, botao } = montar();
      gsap.set('.camada--ceu-sol, .camada--luz', { opacity: 0 });
      const etapa = carta.run();
      await vi.waitFor(() => {
        expect(botao().disabled).toBe(false);
      });
      botao().click();
      await etapa;

      const abrindo = convite.run();

      expect(opacidade('.camada--ceu-sol')).toBe(1);
      expect(opacidade('.camada--luz')).toBe(1);
      await abrindo;
    });

    it('as pétalas da chuva não ficam no DOM depois (removidas ao terminar)', async () => {
      const { abrirTudo } = montar();

      await abrirTudo('toque');

      expect(document.querySelectorAll('.petala--chuva')).toHaveLength(0);
    });
  });

  describe('estado final sem animação (RF-06.11)', () => {
    it('skip deixa a carta aberta, sem envelope, com rolagem liberada e o baú escondido', () => {
      const { carta, el, opacidade } = montar();

      carta.skip();

      expect(el('.envelope').hidden).toBe(true);
      expect(opacidade('.carta')).toBe(1);
      expect(document.body.style.overflow).toBe('');
      expect(el('.conteudo').hasAttribute('inert')).toBe(false);
      expect(opacidade('.bau')).toBe(0);
      expect(opacidade('.casal__imagem')).toBe(1);
    });

    it('skip leva o foco ao título da carta, como quem viu a abertura (SPEC-09, RF-09.6)', () => {
      const { carta, el } = montar();

      carta.skip();

      expect(document.activeElement).toBe(el('#carta-titulo'));
    });

    it('skip no meio da chuva de pétalas tira as que ficaram no ar, em vez de deixá-las congeladas', () => {
      const { convite, el } = montar();
      for (let i = 0; i < 3; i += 1) {
        const petala = document.createElement('img');
        petala.className = 'petala petala--chuva';
        el('.conteudo').append(petala);
      }

      convite.skip();

      expect(document.querySelectorAll('.petala--chuva')).toHaveLength(0);
    });

    it('skip da etapa do convite faz o mesmo, mesmo sem init (modo de segurança)', () => {
      const { convite, el } = montar();

      expect(() => {
        convite.skip();
      }).not.toThrow();
      expect(el('.envelope').hidden).toBe(true);
    });

    it('skip no meio da abertura interrompe a animação: nenhum convite:aberto depois', async () => {
      const { carta, convite, registro, botao } = montar();
      const etapa = carta.run();
      await vi.waitFor(() => {
        expect(botao().disabled).toBe(false);
      });
      botao().click();
      await etapa;
      void convite.run();

      convite.skip();
      await new Promise((resolver) => setTimeout(resolver, config.duracoes.convite * 1000 + 100));

      expect(registro).not.toContain('aberto');
    });

    it('no modo de segurança, o foco vai ao título da carta (que já está sem inert) (RF-09.8)', () => {
      const { carta, eventos, el } = montar();
      carta.skip();

      eventos.emit('seguranca', { erro: new Error('x') });

      expect(document.activeElement).toBe(el('#carta-titulo'));
    });

    it('destroy remove envelope, carta e rolagem travada', () => {
      const { carta } = montar();

      carta.destroy();

      expect(document.querySelector('.envelope')).toBeNull();
      expect(document.querySelector('.conteudo')).toBeNull();
      expect(document.body.style.overflow).toBe('');
    });
  });
});
