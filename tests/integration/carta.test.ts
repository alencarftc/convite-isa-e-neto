import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarBarramento } from '@/application/barramento-eventos';
import { registrarVisita } from '@/application/use-cases/registrar-visita';
import { config as configReal } from '@/config/config';
import { content } from '@/config/content';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';
import { criarCenaBosque } from '@/presentation/bosque/cena-bosque';
import { criarCartaEConvite } from '@/presentation/carta/cena-carta';
import { montarCarta } from '@/presentation/carta/montar-carta';

import { criarCarregamentoFalso } from './suporte/carregamento-falso';
import { configRapida } from './suporte/config-rapida';
import { criarEstadoFalso, type OpcoesDoEstadoFalso } from './suporte/estado-falso';
import { montarIndexHtml } from './suporte/index-html';
import { criarRelogioManual } from './suporte/relogio-gsap';

const config = configRapida(configReal);

/** As cartas criadas em cada teste: a trava de rolagem escuta a janela, então precisam ser desfeitas ao fim dele. */
const criadas: { destroy(): void }[] = [];

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
  criadas.push(carta, convite);
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

  /** Percorre a etapa do envelope e a da abertura com um toque no selo, devolvendo a promessa das duas. */
  function abrirTudo() {
    const aEtapaDaCarta = carta.run();
    void vi
      .waitFor(() => {
        expect(botao().disabled).toBe(false);
      })
      .then(() => {
        botao().click();
      });
    return aEtapaDaCarta.then(() => convite.run());
  }

  return { carta, convite, estado, eventos, registro, raiz, el, botao, opacidade, abrirTudo };
}

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  for (const cena of criadas.splice(0)) cena.destroy();
  vi.restoreAllMocks();
  document.body.removeAttribute('style');
});

describe('montarCarta (SPEC-06, "Layout da carta")', () => {
  const papel = {
    url: 'papel.svg',
    urlDoMiolo: 'miolo.svg',
    proporcao: 1.5,
    corte: { de: 0.4, ate: 0.6 },
  };
  const artigo = () => montarCarta(content.carta, papel);

  it('o papel vai para a CSS com a URL completa (contra a base do documento): a variável é resolvida pelo arquivo de estilos, e não pelo documento (09/11/2026)', () => {
    vi.spyOn(document, 'baseURI', 'get').mockReturnValue('https://isabellaeneto.com.br/');

    const carta = artigo();

    expect(carta.style.getPropertyValue('--papel')).toBe(
      "url('https://isabellaeneto.com.br/papel.svg')",
    );
    expect(carta.style.getPropertyValue('--papel-miolo')).toBe(
      "url('https://isabellaeneto.com.br/miolo.svg')",
    );
  });

  it('sem uma base válida a URL do papel fica como veio, sem quebrar a montagem', () => {
    vi.spyOn(document, 'baseURI', 'get').mockReturnValue('isto não é uma URL');

    expect(artigo().style.getPropertyValue('--papel')).toContain('papel.svg');
  });

  it('tem dezesseis blocos, na ordem aprovada, com o texto de content.carta; o título é um contêiner de três (CT-06.5)', () => {
    const blocos = [...artigo().querySelectorAll('.carta__bloco')];
    const c = content.carta;

    expect(blocos).toHaveLength(16);
    expect(blocos.map((b) => b.textContent.replace(/\s+/g, ' ').trim())).toEqual([
      c.versiculo,
      c.referencia,
      '', // filete (SVG)
      c.bencao,
      `${c.paisNoiva.join('')}${c.paisNoivo.join('')}`,
      c.nomes.noiva,
      c.nomes.e,
      c.nomes.noivo,
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

  it('o título não é um bloco: o "&" e os nomes são, para o "&" ficar dourado fora da mistura da tinta (02/11/2026)', () => {
    const titulo = artigo().querySelector<HTMLElement>('#carta-titulo');

    expect(titulo?.classList.contains('carta__bloco')).toBe(false);
    expect(
      [...(titulo?.children ?? [])].map((filho) => [filho.className, filho.textContent]),
    ).toEqual([
      ['carta__bloco carta__nome', content.carta.nomes.noiva],
      ['carta__bloco carta__e', content.carta.nomes.e],
      ['carta__bloco carta__nome', content.carta.nomes.noivo],
    ]);
  });

  it('a data e a hora são destaque: o dia numa linha, a hora noutra, e o texto segue o de content (10/11/2026)', () => {
    const data = artigo().querySelector<HTMLElement>('.carta__data');

    expect(data?.textContent).toBe(content.carta.data);
    expect(data?.querySelector('.carta__dia')?.textContent).toBe(
      'SEXTA-FEIRA · 22 DE JANEIRO DE 2027',
    );
    expect(data?.querySelector('.carta__hora')?.textContent).toBe(' · 17H');
    expect(data?.querySelector('.carta__hora .carta__ponto')?.textContent).toBe(' · ');
  });

  it('o título é o foco da abertura e o "&" é dourado (RF-06.10)', () => {
    const titulo = artigo().querySelector<HTMLElement>('#carta-titulo');

    expect(titulo?.tagName).toBe('H2');
    expect(titulo?.getAttribute('tabindex')).toBe('-1');
    expect(titulo?.querySelector('.carta__e')?.textContent).toBe('&');
  });

  it('o título mantém os espaços em volta do "&": a CSS o põe na própria linha e o nome acessível não muda (31/10/2026)', () => {
    const titulo = artigo().querySelector<HTMLElement>('#carta-titulo');
    const n = content.carta.nomes;

    expect(titulo?.textContent).toBe(`${n.noiva} ${n.e} ${n.noivo}`);
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

  it('entrega o papel à CSS por variáveis: a arte, o ladrilho do miolo, a proporção e a faixa do meio (ADR-0014)', () => {
    const a = artigo();

    expect(a.style.getPropertyValue('--papel')).toContain('papel.svg');
    expect(a.style.getPropertyValue('--papel-miolo')).toContain('miolo.svg');
    expect(a.style.getPropertyValue('--papel-proporcao')).toBe('1.5');
    expect(a.style.getPropertyValue('--papel-corte-de')).toBe('0.4');
    expect(a.style.getPropertyValue('--papel-corte-ate')).toBe('0.6');
    expect(a.style.getPropertyValue('--papel-margem')).toBe('');
  });

  it('o miolo do papel é um elemento decorativo, o primeiro da carta, e não é um bloco de texto (ADR-0014)', () => {
    const a = artigo();

    const miolo = a.firstElementChild;
    expect(miolo?.classList.contains('carta__miolo')).toBe(true);
    expect(miolo?.getAttribute('aria-hidden')).toBe('true');
    expect(miolo?.classList.contains('carta__bloco')).toBe(false);
    expect(miolo?.textContent).toBe('');
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

      expect(imagensDoEnvelope()).toHaveLength(3); // fechado, aberto e o selo inteiro
      expect(imagensDoEnvelope().every((imagem) => !imagem.hasAttribute('src'))).toBe(true);
      expect(criadas).toHaveLength(0);
    });

    it('a carta e o casal, que o estado final também mostra, continuam sendo pedidos no init', () => {
      montar();

      expect(document.querySelector('.casal__imagem')?.getAttribute('src')).toBe(
        config.imagens.casal,
      );
      const carta = document.querySelector<HTMLElement>('.carta');
      expect(carta?.style.getPropertyValue('--papel')).toContain(config.imagens.papelCarta);
      expect(carta?.style.getPropertyValue('--papel-miolo')).toContain(config.imagens.papelMiolo);
      expect(carta?.style.getPropertyValue('--papel-proporcao')).toBe(
        String(config.carta.papel.proporcao),
      );
    });

    it('o run da carta pede o envelope e o selo, e não cria imagem nenhuma por conta própria (as pétalas são de outro componente, 08/11/2026)', () => {
      const criadas = espionarImagens();
      const { carta } = montar();

      void carta.run();

      expect(imagensDoEnvelope().every((imagem) => imagem.hasAttribute('src'))).toBe(true);
      expect(criadas).toEqual([]);
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
    it('monta o envelope sem texto escrito, o selo inteiro (as siglas vêm na arte) e o botão (RF-06.1 a 06.3)', () => {
      const { el, botao } = montar();

      expect(document.querySelector('.envelope__para')).toBeNull();
      expect(el('.envelope').textContent.trim()).toBe('');
      expect(document.querySelector('.selo__iniciais')).toBeNull();
      expect(document.querySelectorAll('.envelope .selo__imagem')).toHaveLength(1);
      expect(document.querySelector('.selo__metade')).toBeNull(); // o selo não se parte (31/10/2026)
      expect(botao().getAttribute('aria-label')).toBe('Abrir o envelope');
      expect(botao().disabled).toBe(true);
    });

    it('a carta já existe no HTML, inerte, e a página não rola até a abertura (RF-06.9)', () => {
      const { el } = montar();

      expect(el('.conteudo').hasAttribute('inert')).toBe(true);
      expect(el('.conteudo .carta')).toBeTruthy();
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('"Role para ler" fica dentro da carta, na margem de cima do papel, e é só um aviso visual (SPEC-14, RF-14.4)', () => {
      const { el, raiz } = montar();

      const dica = el('.conteudo > .carta > .convite__rolar');
      expect(dica.textContent).toBe(content.dicas.rolar);
      expect(dica.getAttribute('aria-hidden')).toBe('true');
      expect(dica.querySelector('.convite__seta')).toBeTruthy();
      expect(raiz.querySelector(':scope > .convite__rolar')).toBeNull();
    });

    it('o chão sob a cena é uma faixa de imagem minúscula, escondida até a cena subir, e não um espelho do primeiro plano (31/10/2026)', () => {
      const { el } = montar();

      expect(document.querySelector('.convite__chao .camada--frente')).toBeNull(); // sem espelho duplicado
      const imagem = el('.convite__chao .convite__chao-imagem');
      expect(imagem.getAttribute('data-src')).toBe(urlDaImagem(config.imagens.chao, 'vertical'));
      expect(el('.convite__chao').getAttribute('aria-hidden')).toBe('true');
      expect(Number(gsap.getProperty(el('.convite__chao'), 'opacity'))).toBe(0);
    });

    it('no computador o chão é uma faixa de gramado da pintura (sem desfoque) e o envelope, o casal e o convite são maiores (09/11/2026)', () => {
      const { el } = montar({ toque: false, orientacao: 'horizontal' });

      expect(el('.convite__chao').classList.contains('convite__chao--computador')).toBe(true);
      const trecho = el('.convite__chao .convite__chao-faixa .convite__chao-trecho');
      expect(trecho.getAttribute('data-src')).toBe(
        urlDaImagem(config.imagens.chao, 'horizontal', true),
      );
      expect(trecho.getAttribute('data-src')).toMatch(/06-chao-computador\.webp$/);
      expect(el('.envelope').classList.contains('envelope--computador')).toBe(true);
      expect(el('.conteudo').classList.contains('conteudo--computador')).toBe(true);
    });

    it('com toque (celular e tablet) o chão e o envelope são os de antes, sem faixa de pintura', () => {
      const { el } = montar({ toque: true, orientacao: 'horizontal' });

      expect(el('.convite__chao').classList.contains('convite__chao--computador')).toBe(false);
      expect(document.querySelector('.convite__chao-faixa')).toBeNull();
      expect(el('.envelope').classList.contains('envelope--computador')).toBe(false);
      expect(el('.conteudo').classList.contains('conteudo--computador')).toBe(false);
    });

    it('a faixa de chão só é pedida quando a etapa começa, não no init', () => {
      const { el } = montar();

      expect(el('.convite__chao .convite__chao-imagem').hasAttribute('src')).toBe(false);
    });

    it('o chão sobe junto com a cena: o mesmo deslocamento no fim da abertura e no estado final', async () => {
      const { abrirTudo, el, carta } = montar();
      Object.assign(window, { innerHeight: 800 });

      await abrirTudo();

      const esperado = -800 * config.convite.cenaSobeFracao;
      expect(Number(gsap.getProperty(el('.convite__chao'), 'y'))).toBeCloseTo(esperado);
      expect(Number(gsap.getProperty(el('.cena'), 'y'))).toBeCloseTo(esperado);

      gsap.set(el('.convite__chao'), { y: 0 });
      carta.skip();
      expect(Number(gsap.getProperty(el('.convite__chao'), 'y'))).toBeCloseTo(esperado);
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

    it('o baú já saiu de cena quando o envelope pousa, antes do toque no selo (01/11/2026)', async () => {
      const { carta, registro, opacidade } = montar();
      void carta.run();

      await vi.waitFor(() => {
        expect(registro).toContain('pousou');
      });

      expect(registro).not.toContain('abrindo:toque');
      expect(opacidade('.bau')).toBe(0);
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

    it('não abre sozinho: sem toque nem arrasto o envelope fica esperando no selo (31/10/2026)', async () => {
      const { carta, registro, botao, estado, el } = montar();
      void carta.run();
      await vi.waitFor(() => {
        expect(botao().disabled).toBe(false);
      });

      // Bem mais que os 4 s de antes (a configuração dos testes encolhe os tempos).
      await new Promise((resolver) => setTimeout(resolver, 400));

      expect(registro).toEqual(['pousou']);
      expect(estado.fase).toBe('aguardando-selo');
      expect(botao().disabled).toBe(false);
      expect(Number(gsap.getProperty(el('.envelope'), 'opacity'))).toBeGreaterThan(0);
    });

    it('não há carta dobrada subindo por trás do envelope: o papel só aparece quando a carta se desdobra (02/11/2026)', async () => {
      const { carta, botao } = montar();
      void carta.run();
      await vi.waitFor(() => {
        expect(botao().disabled).toBe(false);
      });

      expect(document.querySelector('.envelope__dobrada')).toBeNull();
    });

    it('dois toques seguidos: só a primeira origem vale (casos de borda)', async () => {
      const { carta, convite, registro, botao } = montar();
      const etapa = carta.run();
      await vi.waitFor(() => {
        expect(botao().disabled).toBe(false);
      });

      botao().click();
      botao().click();
      await etapa;
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

      it('toque e arrasto levam à mesma abertura: só a primeira origem vale (CT-16.2)', async () => {
        const { carta, convite, registro, botao } = montar();
        const etapa = carta.run();
        await esperarOSelo(botao);

        botao().click();
        deslizar(botao(), config.carta.gesto.limiar + 20);
        await etapa;
        await convite.run();

        expect(registro.filter((r) => r.startsWith('abrindo'))).toEqual(['abrindo:toque']);
      });

      it('sem arrasto nem toque o envelope segue esperando, sem abrir sozinho (CT-16.2)', async () => {
        const { carta, registro, botao } = montar();
        void carta.run();
        await esperarOSelo(botao);

        await new Promise((resolver) => setTimeout(resolver, 300));

        expect(registro).toEqual(['pousou']);
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

      await abrirTudo();

      expect(registro).toEqual(['pousou', 'abrindo:toque', 'aberto']);
    });

    it('termina com a carta desdobrada, o envelope fora e a cena no alto; a leitura segue sozinha (CA-06.4.2)', async () => {
      const { abrirTudo, opacidade, el } = montar();
      Object.assign(window, { innerHeight: 800 });

      await abrirTudo();

      expect(opacidade('.carta')).toBe(1);
      expect(Number(gsap.getProperty(el('.carta'), 'scaleY'))).toBe(1);
      expect(opacidade('.envelope')).toBe(0);
      expect(opacidade('.bau')).toBe(0);
      expect(Number(gsap.getProperty(el('.cena'), 'y'))).toBeCloseTo(
        -800 * config.convite.cenaSobeFracao,
      );
      expect(opacidade('.casal__imagem')).toBe(1);
    });

    it('libera a rolagem, tira o inert e leva o foco ao título (RF-06.9, RF-06.10)', async () => {
      const { abrirTudo, el } = montar();

      await abrirTudo();

      expect(document.body.style.overflow).toBe('');
      expect(el('.conteudo').hasAttribute('inert')).toBe(false);
      expect(document.activeElement).toBe(el('#carta-titulo'));
    });

    describe('a carta se lê com calma, bloco a bloco (ADR-0012)', () => {
      /**
       * O happy-dom não calcula layout: cada bloco ganha uma caixa combinada, `PASSO` pixels abaixo do
       * anterior, e a "rolagem" é um deslocamento que o teste move.
       */
      const PASSO = 150;
      function combinarCaixas(alturaDaTela: number) {
        Object.assign(window, { innerHeight: alturaDaTela });
        const posicao = { rolagem: 0 };
        vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
          this: Element,
        ) {
          const indice = [...document.querySelectorAll('.carta__bloco')].indexOf(this);
          const topo = indice < 0 ? 0 : indice * PASSO - posicao.rolagem;
          return {
            top: topo,
            bottom: topo + 100,
            left: 0,
            right: 0,
            width: 0,
            height: 100,
            x: 0,
            y: topo,
          } as DOMRect;
        });
        return {
          rolar(para: number) {
            posicao.rolagem = para;
            window.dispatchEvent(new Event('scroll'));
          },
        };
      }
      const visivel = (bloco: Element) => Number(gsap.getProperty(bloco, 'opacity')) > 0;
      const blocos = () => [...document.querySelectorAll('.carta__bloco')];

      it('os blocos aparecem um de cada vez, na ordem, e todos aparecem se cabem na tela', async () => {
        const { abrirTudo } = montar();
        combinarCaixas(5000);
        const ordem: number[] = [];
        const olhar = setInterval(() => {
          blocos().forEach((bloco, indice) => {
            if (visivel(bloco) && !ordem.includes(indice)) ordem.push(indice);
          });
        }, 2);

        await abrirTudo();
        await vi.waitFor(() => {
          expect(blocos().every((bloco) => Number(gsap.getProperty(bloco, 'opacity')) === 1)).toBe(
            true,
          );
        });
        clearInterval(olhar);

        expect(ordem).toEqual(blocos().map((_, indice) => indice));
      });

      it('"Role para ler" é o primeiro texto a aparecer: surge antes de qualquer bloco da carta (08/11/2026)', () => {
        const relogio = criarRelogioManual();
        try {
          const { convite, opacidade, carta, botao } = montar();
          combinarCaixas(5000);
          void carta.run();
          relogio.avancar(config.carta.pousouEm + 0.05, 0.002); // o envelope pousa e o selo passa a aceitar o toque
          botao().click();
          void convite.run();

          const { desdobraEm, desdobra, blocosEm } = config.convite;
          const dica = desdobraEm + desdobra / 2;
          expect(dica).toBeLessThan(blocosEm);
          // Entre o instante da dica e o do primeiro bloco: a dica já começou a aparecer, e nenhum bloco ainda.
          relogio.avancar(dica + (blocosEm - dica) / 2, 0.0005);
          expect(opacidade('.convite__rolar')).toBeGreaterThan(0);
          expect(blocos().every((bloco) => !visivel(bloco))).toBe(true);
          convite.skip();
        } finally {
          relogio.restaurar();
        }
      });

      it('todos os blocos começam a aparecer no mesmo intervalo, seja um ornamento ou um parágrafo (09/11/2026)', async () => {
        const relogio = criarRelogioManual();
        try {
          const { convite, carta, botao } = montar();
          combinarCaixas(5000); // tudo cabe na tela: nenhum bloco espera rolagem
          void carta.run();
          relogio.avancar(config.carta.pousouEm + 0.05, 0.002);
          botao().click();
          void convite.run();

          const total = blocos().length;
          const tamanhos = new Set(blocos().map((bloco) => bloco.textContent.trim().length));
          expect(tamanhos.size).toBeGreaterThan(5); // o teste só vale com textos de tamanhos bem diferentes

          // O GSAP anda aos poucos; a cada passo, anota os blocos que acabaram de ficar visíveis.
          const passo = 0.0005;
          const comecou = new Map<number, number>();
          const limite = config.convite.blocosEm + (total + 2) * config.convite.intervaloDosBlocos;
          let tempo = 0;
          while (comecou.size < total && tempo < limite) {
            relogio.avancar(passo, passo);
            tempo += passo;
            await Promise.resolve(); // a revelação continua em promessas: deixa a próxima rodar
            await Promise.resolve();
            blocos().forEach((bloco, indice) => {
              if (!comecou.has(indice) && visivel(bloco)) comecou.set(indice, tempo);
            });
          }

          expect(comecou.size).toBe(total);
          for (let indice = 1; indice < total; indice += 1) {
            const intervalo = comecou.get(indice)! - comecou.get(indice - 1)!;
            expect(Math.abs(intervalo - config.convite.intervaloDosBlocos)).toBeLessThanOrEqual(
              2 * passo,
            );
          }
          convite.skip();
        } finally {
          relogio.restaurar();
        }
      });

      it('"Role para ler" aparece mesmo quando a carta toda cabe na tela, e fica', async () => {
        const { abrirTudo, opacidade } = montar();
        combinarCaixas(5000);

        await abrirTudo();
        await vi.waitFor(() => {
          expect(blocos().every((bloco) => Number(gsap.getProperty(bloco, 'opacity')) === 1)).toBe(
            true,
          );
        });

        expect(opacidade('.convite__rolar')).toBe(1);
      });

      it('o bloco abaixo da dobra espera a rolagem, e "Role para ler" aparece, com a seta em movimento', async () => {
        const { abrirTudo, opacidade, el } = montar();
        combinarCaixas(600); // dobra em 600 × (1 − folga): 528 px → só os blocos 0 a 3 cabem

        await abrirTudo();

        await vi.waitFor(() => {
          expect(visivel(blocos()[3]!)).toBe(true);
          expect(opacidade('.convite__rolar')).toBe(1);
        });
        expect(visivel(blocos()[4]!)).toBe(false);
        await vi.waitFor(() => {
          expect(Number(gsap.getProperty(el('.convite__seta'), 'y'))).toBeGreaterThan(0);
        });
        await new Promise((resolver) => setTimeout(resolver, 150));
        expect(visivel(blocos()[4]!)).toBe(false); // ninguém rolou: nada mais aparece
      });

      it('rolar faz a leitura andar e "Role para ler" continua à vista: nada a apaga (08/11/2026)', async () => {
        const { abrirTudo, opacidade } = montar();
        const pagina = combinarCaixas(600);
        await abrirTudo();
        await vi.waitFor(() => {
          expect(opacidade('.convite__rolar')).toBe(1);
        });

        pagina.rolar(300); // o bloco 4 (600 − 300 = 300) passa a caber

        await vi.waitFor(() => {
          expect(visivel(blocos()[4]!)).toBe(true);
        });
        pagina.rolar(0);
        pagina.rolar(5000);
        await new Promise((resolver) => setTimeout(resolver, 100));
        expect(opacidade('.convite__rolar')).toBe(1);
      });

      it('o bloco que o convidado já deixou acima da tela aparece de uma vez, sem esperar', async () => {
        const { abrirTudo } = montar();
        const pagina = combinarCaixas(600);
        await abrirTudo();
        await vi.waitFor(() => {
          expect(visivel(blocos()[3]!)).toBe(true);
        });

        pagina.rolar(5000); // rolou além de tudo: o resto fica acima da tela

        await vi.waitFor(() => {
          expect(blocos().every((bloco) => Number(gsap.getProperty(bloco, 'opacity')) === 1)).toBe(
            true,
          );
        });
      });

      it('tocar na tela não acelera nem pula a leitura (ADR-0012)', async () => {
        const { abrirTudo, el } = montar();
        combinarCaixas(600);
        await abrirTudo();
        await vi.waitFor(() => {
          expect(visivel(blocos()[3]!)).toBe(true);
        });

        el('.conteudo').click();
        document.body.click();
        window.dispatchEvent(new Event('pointerdown'));
        await new Promise((resolver) => setTimeout(resolver, 100));

        expect(visivel(blocos()[4]!)).toBe(false);
      });
    });

    it('registra a visita no aparelho só ao terminar de abrir (RF-06.10)', async () => {
      const { abrirTudo, estado } = montar();

      const termino = abrirTudo();
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

      await abrirTudo();

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

    it('enquanto a carta não abre a página fica no alto: a rolagem que o navegador restaura é desfeita na hora, sem o pulo de depois (08/11/2026)', () => {
      const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      Object.defineProperty(window, 'scrollY', { value: 480, configurable: true, writable: true });
      try {
        const { carta } = montar();
        expect(rolar).toHaveBeenCalledWith(0, 0); // já ao montar
        rolar.mockClear();

        window.dispatchEvent(new Event('scroll')); // o navegador restaurou a rolagem de uma visita anterior
        expect(rolar).toHaveBeenCalledWith(0, 0);

        carta.skip(); // a rolagem é liberada: a trava sai
        rolar.mockClear();
        window.dispatchEvent(new Event('scroll'));
        expect(rolar).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
      }
    });

    it('ao liberar a rolagem a carta aberta começa do alto: a página volta ao início (08/11/2026)', () => {
      const { carta } = montar();
      const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

      carta.skip();

      expect(rolar).toHaveBeenCalledWith(0, 0);
    });

    it('skip leva o foco ao título da carta, como quem viu a abertura (SPEC-09, RF-09.6)', () => {
      const { carta, el } = montar();

      carta.skip();

      expect(document.activeElement).toBe(el('#carta-titulo'));
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
