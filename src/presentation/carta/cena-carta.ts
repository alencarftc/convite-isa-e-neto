import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import type { EstadoConvite } from '@/application/estado-convite';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';

import { chuvaDePetalas } from '../petalas/chuva-de-petalas';
import { ligarGestoDoSelo } from './gesto-do-selo';
import { montarCarta } from './montar-carta';

export interface DependenciasDaCarta {
  readonly raiz: HTMLElement;
  readonly conteudo: ConteudoConvite;
  readonly config: ConfigConvite;
  readonly estado: EstadoConvite;
  readonly eventos: BarramentoEventos<EventosConvite>;
}

type OrigemDaAbertura = 'toque' | 'tempo' | 'gesto';

interface Elementos {
  readonly envelope: HTMLElement;
  readonly sombra: HTMLElement;
  readonly dobrada: HTMLElement;
  readonly fechado: HTMLElement;
  readonly aberto: HTMLElement;
  readonly para: HTMLElement;
  readonly selo: HTMLElement;
  readonly metades: readonly HTMLElement[];
  readonly iniciais: HTMLElement;
  readonly botao: HTMLButtonElement;
  readonly dica: HTMLElement;
  readonly conteudo: HTMLElement;
  readonly carta: HTMLElement;
  readonly titulo: HTMLElement;
  readonly blocos: readonly HTMLElement[];
  readonly chao: HTMLElement;
  readonly rolar: HTMLElement;
  readonly casal: HTMLElement | null;
  readonly petalas: readonly HTMLImageElement[];
}

function criar(tag: string, classe: string, texto?: string): HTMLElement {
  const elemento = document.createElement(tag);
  elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function criarImagem(classe: string, url: string): HTMLImageElement {
  const imagem = document.createElement('img');
  imagem.className = classe;
  imagem.src = url;
  imagem.alt = '';
  imagem.draggable = false;
  return imagem;
}

/**
 * Envelope e carta (SPEC-06). Devolve as duas etapas do caminho, que dividem o mesmo DOM e estado:
 *
 * - `carta` (`tlCarta`, 3 s): o envelope pousa sobre o baú e espera o toque no selo, ou
 *   `duracoes.esperaSelo` depois do pouso, o que vier primeiro (`carta:pousou`).
 * - `convite` (`tlConvite`, 7 s): o selo se parte, a carta sai do envelope, a cena sobe, o casal
 *   surge, a carta se desdobra, os blocos entram, caem as pétalas e a rolagem é liberada
 *   (`carta:abrindo`, `convite:aberto`).
 *
 * A carta é HTML real, criada desde o início, inerte e invisível até abrir; no modo de segurança o
 * `skip()` a mostra pronta, com rolagem liberada.
 */
export function criarCartaEConvite(dependencias: DependenciasDaCarta): {
  carta: Cena;
  convite: Cena;
} {
  const { raiz, conteudo, config, estado, eventos } = dependencias;
  const { duracoes, curvas, carta: tempoDaCarta, convite: tempoDoConvite } = config;

  let elementos: Elementos | undefined;
  let linhaDaCarta: gsap.core.Timeline | undefined;
  let linhaDoConvite: gsap.core.Timeline | undefined;
  let espera: gsap.core.Tween | undefined;
  let pulso: gsap.core.Tween | undefined;
  let recolherDica: gsap.core.Tween | undefined;
  let ouvintes: AbortController | undefined;
  let ouvintesDoConvite: AbortController | undefined;
  let pararDeOuvirSeguranca: (() => void) | undefined;
  let origem: OrigemDaAbertura = 'toque';
  let aberta = false;

  function montar(): Elementos {
    if (elementos) return elementos;

    // Envelope: sombra, carta dobrada (atrás), as duas imagens, "para", selo, botão e dica.
    const envelope = criar('div', 'envelope');
    const sombra = criar('div', 'envelope__sombra');
    const dobrada = criar('div', 'envelope__dobrada');
    const fechado = criarImagem(
      'envelope__fechado',
      urlDaImagem(config.imagens.envelopeFechado, 'vertical'),
    );
    const aberto = criarImagem(
      'envelope__aberto',
      urlDaImagem(config.imagens.envelopeAberto, 'vertical'),
    );
    const para = criar('p', 'envelope__para', conteudo.envelope.para);
    const selo = criar('div', 'selo');
    const urlDoSelo = urlDaImagem(config.imagens.selo, 'vertical');
    // O selo se parte em duas metades recortadas da mesma imagem (RF-06.5).
    const metades = (['esquerda', 'direita'] as const).map((lado) => {
      const metade = criar('div', `selo__metade selo__metade--${lado}`);
      metade.append(criarImagem('selo__imagem', urlDoSelo));
      return metade;
    });
    const iniciais = criar('span', 'selo__iniciais', conteudo.envelope.iniciais);
    selo.append(...metades, iniciais);
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'carta__abrir';
    botao.setAttribute('aria-label', conteudo.rotulos.abrirEnvelope);
    botao.disabled = true;
    const dica = criar('p', 'carta__dica');
    dica.setAttribute('aria-live', 'polite');
    envelope.append(sombra, dobrada, fechado, aberto, para, selo, botao, dica);
    gsap.set(envelope, { opacity: 0, xPercent: -50, yPercent: -50 });
    gsap.set([sombra, aberto, dica], { opacity: 0 });

    // Carta e informações: já no DOM, inertes e invisíveis até a abertura terminar.
    const cartaEl = montarCarta(conteudo.carta, urlDaImagem(config.imagens.papelCarta, 'vertical'));
    const caixa = criar('main', 'conteudo');
    caixa.setAttribute('inert', '');
    caixa.append(cartaEl);
    const titulo = cartaEl.querySelector<HTMLElement>('#carta-titulo');
    if (!titulo) throw new Error('A carta precisa de um título (#carta-titulo)');
    const blocos = [...cartaEl.querySelectorAll<HTMLElement>('.carta__bloco')];
    gsap.set(cartaEl, {
      opacity: 0,
      scaleY: tempoDoConvite.escalaDobrada,
      transformOrigin: '50% 0%',
    });
    gsap.set(blocos, { opacity: 0 });

    const chao = criar('div', 'convite__chao');
    chao.setAttribute('aria-hidden', 'true');
    gsap.set(chao, { opacity: 0 });
    // "Role para ler" vive dentro do conteúdo, ancorada ao topo da carta, e rola junto com ela:
    // nunca cobre o texto (SPEC-14, RF-14.4). É só um aviso visual; quem usa leitor de tela já navega.
    const rolar = criar('p', 'convite__rolar', conteudo.dicas.rolar);
    rolar.setAttribute('aria-hidden', 'true');
    rolar.append(criarSeta());
    gsap.set(rolar, { opacity: 0 });
    caixa.append(rolar);

    // O casal vive no espaço `.casal` da cena do bosque: sobe junto com ela.
    const espacoDoCasal = raiz.querySelector<HTMLElement>('.casal');
    const casal = espacoDoCasal
      ? criarImagem('casal__imagem', urlDaImagem(config.imagens.casal, 'vertical'))
      : null;
    if (espacoDoCasal && casal) {
      espacoDoCasal.append(casal);
      gsap.set(casal, { opacity: 0 });
    }

    // Pede as pétalas já, para estarem prontas quando a chuva começar.
    const petalas = (['petalaA', 'petalaB', 'petalaC'] as const).map((chave) => {
      const petala = new Image();
      petala.src = urlDaImagem(config.imagens[chave], 'vertical');
      return petala;
    });

    raiz.append(chao, envelope, caixa);
    // No modo de segurança, a carta já está sem `inert` quando o aviso chega: o foco vai ao título.
    pararDeOuvirSeguranca = eventos.on('seguranca', () => {
      titulo.focus({ preventScroll: true });
    });
    // Até `convite:aberto`, a página não rola (RF-06.9).
    document.body.style.overflow = 'hidden';

    elementos = {
      envelope,
      sombra,
      dobrada,
      fechado,
      aberto,
      para,
      selo,
      metades,
      iniciais,
      botao,
      dica,
      conteudo: caixa,
      carta: cartaEl,
      titulo,
      blocos,
      chao,
      rolar,
      casal,
      petalas,
    };
    return elementos;
  }

  function criarSeta(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'convite__seta');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const caminho = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    caminho.setAttribute('d', 'M6 9l6 6 6-6');
    svg.append(caminho);
    return svg;
  }

  /** Centro vertical do baú na tela, onde o envelope pousa; sem baú, um ponto baixo. */
  function pousoY(): number {
    const corpo = raiz.querySelector('.bau__corpo');
    if (!corpo) return window.innerHeight * 0.7;
    const caixa = corpo.getBoundingClientRect();
    return caixa.top + caixa.height * 0.2;
  }

  function luzesDoPorDoSol(): HTMLElement[] {
    return gsap.utils.toArray<HTMLElement>('.camada--ceu-sol, .camada--luz', raiz);
  }

  function liberarRolagem(): void {
    const { conteudo: caixa } = montar();
    document.body.style.overflow = '';
    caixa.removeAttribute('inert');
  }

  function parar(): void {
    linhaDaCarta?.kill();
    linhaDoConvite?.kill();
    espera?.kill();
    pulso?.kill();
    recolherDica?.kill();
    ouvintes?.abort();
    ouvintesDoConvite?.abort();
  }

  /** Estado final da primeira tela, sem animação: carta aberta, sem envelope, rolagem liberada. */
  function irParaOEstadoFinal(): void {
    const e = montar();
    parar();
    aberta = true;
    e.botao.disabled = true;
    gsap.set(e.envelope, { opacity: 0 });
    e.envelope.hidden = true;
    gsap.set(luzesDoPorDoSol(), { opacity: 1 });
    const cena = raiz.querySelector<HTMLElement>('.cena');
    if (cena) gsap.set(cena, { y: -window.innerHeight * tempoDoConvite.cenaSobeFracao });
    const bau = raiz.querySelector<HTMLElement>('.bau');
    if (bau) gsap.set(bau, { opacity: 0 });
    gsap.set(e.chao, { opacity: 1 });
    if (e.casal) gsap.set(e.casal, { opacity: 1, y: 0 });
    gsap.set(e.carta, { opacity: 1, scaleY: 1 });
    gsap.set(e.blocos, { opacity: 1, y: 0 });
    liberarRolagem();
  }

  const carta: Cena = {
    init() {
      montar();
    },

    run() {
      const e = montar();
      const t = tempoDaCarta;
      return new Promise<void>((resolver) => {
        const abrir = (como: OrigemDaAbertura) => {
          if (aberta) return;
          aberta = true;
          origem = como;
          e.botao.disabled = true;
          espera?.kill();
          pulso?.kill();
          linhaDaCarta?.kill();
          resolver();
        };

        const pousou = () => {
          eventos.emit('carta:pousou');
          estado.definirFase('aguardando-selo');
          e.botao.disabled = false;
          // O foco vai para o envelope quando ele pousa (SPEC-09, RF-09.6).
          e.botao.focus({ preventScroll: true });
          // A espera de 4 s conta a partir do pouso; o primeiro dos dois gatilhos vale (RF-06.4).
          espera = gsap.delayedCall(duracoes.esperaSelo, () => {
            abrir('tempo');
          });
        };

        ouvintes = new AbortController();
        // Além do toque, deslizar o selo abre o envelope (SPEC-16); só a primeira origem vale.
        const gesto = ligarGestoDoSelo({
          botao: e.botao,
          selo: e.selo,
          gesto: t.gesto,
          mola: curvas.mola,
          reduzido: estado.reduzido,
          aoAbrir: () => {
            abrir('gesto');
          },
          signal: ouvintes.signal,
        });
        e.botao.addEventListener(
          'click',
          () => {
            if (gesto.cliqueFoiArrasto()) return; // o clique que sobra de um arrasto não é um toque
            abrir('toque');
          },
          { signal: ouvintes.signal },
        );

        e.dica.textContent = conteudo.dicas.selo;
        linhaDaCarta = gsap
          .timeline()
          // O envelope surge no alto, inclinado, e desce até pousar sobre o baú.
          .fromTo(
            e.envelope,
            {
              opacity: 1,
              rotation: t.inclinacao,
              y: () => window.innerHeight * (0.5 - t.alturaDeSaida),
            },
            { rotation: 0, y: () => pousoY(), duration: t.pouso, ease: curvas.pouso },
            0,
          )
          .to(
            e.sombra,
            { opacity: t.opacidadeDaSombra, duration: t.sombra, ease: curvas.senoSaida },
            t.sombraEm,
          )
          .call(pousou, [], t.pousouEm)
          // A dica surge e o selo passa a pulsar.
          .to(e.dica, { opacity: 1, duration: t.dicaAparece, ease: curvas.saida }, t.dicaEm)
          .call(
            () => {
              pulso = gsap.to(e.selo, {
                scale: t.pulsoDoSelo.escala,
                duration: t.pulsoDoSelo.periodo / 2,
                ease: curvas.suave,
                yoyo: true,
                repeat: -1,
              });
            },
            [],
            t.dicaEm,
          )
          .set({}, {}, duracoes.carta);
      });
    },

    skip() {
      irParaOEstadoFinal();
    },

    destroy() {
      parar();
      if (elementos) {
        for (const parte of [
          elementos.envelope,
          elementos.conteudo,
          elementos.chao,
          elementos.rolar,
        ]) {
          parte.remove();
        }
        elementos.casal?.remove();
        elementos = undefined;
      }
      pararDeOuvirSeguranca?.();
      pararDeOuvirSeguranca = undefined;
      document.body.style.overflow = '';
      aberta = false;
    },
  };

  const convite: Cena = {
    init() {
      montar();
    },

    run() {
      const e = montar();
      const t = tempoDoConvite;
      const altura = window.innerHeight;
      // A luz vai ao pôr do sol antes de a abertura mexer nela, mesmo que a história tenha sido
      // acelerada ou pulada (RF-06.7).
      gsap.set(luzesDoPorDoSol(), { opacity: 1 });
      const cena = raiz.querySelector<HTMLElement>('.cena');
      const bau = raiz.querySelector<HTMLElement>('.bau');

      return new Promise<void>((resolver) => {
        const linha = gsap.timeline({ onComplete: resolver });
        linhaDoConvite = linha;

        linha
          // 0 s: o selo faz o som e a música 2 entra; a dica some.
          .call(
            () => {
              eventos.emit('carta:abrindo', { origem });
            },
            [],
            0,
          )
          .to(e.dica, { opacity: 0, duration: t.dicaSome, ease: curvas.saida }, 0)
          // O selo cresce e se parte em duas metades que giram e caem, sumindo.
          .to(
            e.selo,
            { scale: t.seloCresce.escala, duration: t.seloCresce.duracao, ease: curvas.saida },
            0,
          )
          .to(e.iniciais, { opacity: 0, duration: t.seloCresce.duracao, ease: curvas.saida }, 0)
          .to(
            e.metades[0] ?? e.selo,
            {
              rotation: -t.seloParte.giro,
              y: t.seloParte.queda,
              opacity: 0,
              duration: t.seloParte.duracao,
              ease: curvas.entrada,
            },
            t.seloCresce.duracao,
          )
          .to(
            e.metades[1] ?? e.selo,
            {
              rotation: t.seloParte.giro,
              y: t.seloParte.queda,
              opacity: 0,
              duration: t.seloParte.duracao,
              ease: curvas.entrada,
            },
            t.seloCresce.duracao,
          )
          // A aba abre: o envelope fechado dá lugar ao aberto, com leve aumento.
          .to(e.fechado, { opacity: 0, duration: t.aba, ease: curvas.leve }, t.abaEm)
          .to(e.aberto, { opacity: 1, duration: t.aba, ease: curvas.leve }, t.abaEm)
          .to(e.envelope, { scale: t.abaEscala, duration: t.aba, ease: curvas.leve }, t.abaEm)
          // A carta dobrada, atrás do envelope, sobe e sai pela abertura.
          .to(
            e.dobrada,
            { yPercent: -70, duration: t.cartaSobe, ease: curvas.saida },
            t.cartaSobeEm,
          )
          // O envelope desce e some.
          .to(
            e.envelope,
            {
              y: `+=${String(altura * 0.35)}`,
              opacity: 0,
              duration: t.envelopeDesce,
              ease: curvas.entrada,
            },
            t.envelopeDesceEm,
          );

        // A cena inteira sobe e o baú some; o chão preenche a base que fica à mostra.
        if (cena) {
          linha.to(
            cena,
            { y: -altura * t.cenaSobeFracao, duration: t.cenaSobe, ease: curvas.viaDupla },
            t.cenaSobeEm,
          );
        }
        if (bau)
          linha.to(bau, { opacity: 0, duration: t.bauSome, ease: curvas.saida }, t.cenaSobeEm);
        linha.to(e.chao, { opacity: 1, duration: t.cenaSobe, ease: curvas.viaDupla }, t.cenaSobeEm);
        // O casal surge de costas à beira do lago.
        if (e.casal) {
          linha.fromTo(
            e.casal,
            { opacity: 0, y: t.casalDeslocamento },
            { opacity: 1, y: 0, duration: t.casalAparece, ease: curvas.senoSaida },
            t.casalEm,
          );
        }

        linha
          // A carta se desdobra a partir do topo e assenta; a dobrada some no mesmo instante.
          .to(e.dobrada, { opacity: 0, duration: t.desdobra / 2, ease: curvas.leve }, t.desdobraEm)
          .to(
            e.carta,
            { opacity: 1, scaleY: 1, duration: t.desdobra, ease: curvas.viaDuplaForte },
            t.desdobraEm,
          )
          // Os blocos de texto entram um a um.
          .fromTo(
            e.blocos,
            { opacity: 0, y: t.blocosDeslocamento },
            {
              opacity: 1,
              y: 0,
              duration: t.blocosAparecem,
              ease: curvas.saida,
              stagger: t.blocosIntervalo,
            },
            t.blocosEm,
          )
          // Pétalas caem devagar pela tela.
          .add(
            chuvaDePetalas({
              conteiner: e.carta.parentElement ?? raiz,
              imagens: e.petalas,
              quantidade: Math.round(gsap.utils.random(t.petalas.minimo, t.petalas.maximo)),
              largura: t.petalas.largura,
              altura,
              quedaMinima: t.petalas.quedaMinima,
              quedaMaxima: t.petalas.quedaMaxima,
              balanco: t.petalas.balanco,
              rotacao: t.petalas.rotacao,
              duracao: t.petalas.duracao,
              curva: curvas.suave,
            }),
            t.petalasEm,
          )
          // "Role para ler" aparece e a rolagem é liberada.
          .to(e.rolar, { opacity: 1, duration: t.rolarAparece, ease: curvas.saida }, t.rolarEm)
          .call(liberarRolagem, [], t.rolarEm)
          // 7 s: carta aberta; o foco vai para o título.
          .call(
            () => {
              eventos.emit('convite:aberto');
              e.titulo.focus({ preventScroll: true });
            },
            [],
            duracoes.convite,
          )
          .set({}, {}, duracoes.convite);

        // A dica "Role para ler" some na primeira rolagem ou depois de `rolarVisivel` segundos, o que
        // vier primeiro (SPEC-14, RF-14.4).
        recolherDica = gsap.to(e.rolar, {
          opacity: 0,
          duration: t.rolarAparece,
          ease: curvas.saida,
          delay: t.rolarEm + t.rolarAparece + t.rolarVisivel,
        });
        ouvintesDoConvite = new AbortController();
        window.addEventListener(
          'scroll',
          () => {
            gsap.to(e.rolar, { opacity: 0, duration: t.rolarAparece, ease: curvas.saida });
          },
          { once: true, passive: true, signal: ouvintesDoConvite.signal },
        );
      });
    },

    skip() {
      irParaOEstadoFinal();
    },

    destroy() {
      carta.destroy();
    },
  };

  return { carta, convite };
}
