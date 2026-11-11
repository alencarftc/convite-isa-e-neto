import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import type { EstadoConvite } from '@/application/estado-convite';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';

import { animarNoNavegador } from '../animacao/animar-no-navegador';
import { curvaCss } from '../animacao/curva-css';
import { concluirLuzDoPorDoSol } from '../bosque/luz-do-por-do-sol';
import { criar, criarImagem } from '../dom';
import { carregarImagensTardias } from '../imagens/imagens-tardias';
import { montarImagemDoSelo, soltarSelo } from '../selo/selo';
import { ligarGestoDoSelo } from './gesto-do-selo';
import { montarCarta } from './montar-carta';
import { type Revelacao, revelarEmSequencia } from './revelacao-da-carta';

export interface DependenciasDaCarta {
  readonly raiz: HTMLElement;
  readonly conteudo: ConteudoConvite;
  readonly config: ConfigConvite;
  readonly estado: EstadoConvite;
  readonly eventos: BarramentoEventos<EventosConvite>;
}

type OrigemDaAbertura = 'toque' | 'gesto';

interface Elementos {
  readonly envelope: HTMLElement;
  readonly sombra: HTMLElement;
  readonly fechado: HTMLElement;
  readonly aberto: HTMLElement;
  readonly selo: HTMLElement;
  readonly brilho: HTMLElement;
  readonly imagemDoSelo: HTMLImageElement;
  readonly botao: HTMLButtonElement;
  readonly dica: HTMLElement;
  readonly conteudo: HTMLElement;
  readonly carta: HTMLElement;
  readonly titulo: HTMLElement;
  readonly blocos: readonly HTMLElement[];
  readonly chao: HTMLElement;
  readonly rolar: HTMLElement;
  readonly seta: SVGSVGElement;
  readonly casal: HTMLElement | null;
  /** Preenchida em `carta.run`: as variações da chuva de pétalas, já pedidas ao navegador. */
}

/**
 * Envelope e carta (SPEC-06). Devolve as duas etapas do caminho, que dividem o mesmo DOM e estado:
 *
 * - `carta` (`tlCarta`, 3 s): o envelope pousa com o centro a 58% da altura da tela (do alto) e espera o toque (ou o arrasto) no selo, o
 *   tempo que for: não abre sozinho (`carta:pousou`).
 * - `convite` (`tlConvite`, 7 s): o selo se solta, a carta sai do envelope, a cena sobe, o casal
 *   surge, a carta se desdobra, a rolagem é liberada, os blocos começam a aparecer um a um e caem as
 *   pétalas (`carta:abrindo`, `convite:aberto`). A leitura segue sozinha depois dos 7 s (ADR-0012).
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
  let pulso: gsap.core.Tween | undefined;
  let balancoDaSeta: gsap.core.Tween | undefined;
  let leitura: Revelacao | undefined;
  let ouvintes: AbortController | undefined;
  let pararDeOuvirSeguranca: (() => void) | undefined;
  let origem: OrigemDaAbertura = 'toque';
  let aberta = false;
  let dicaDeRolagemMostrada = false;
  let travaDeRolagem: AbortController | undefined;

  function montar(): Elementos {
    if (elementos) return elementos;

    // Envelope: sombra, as duas imagens, selo (inteiro, com as siglas na
    // arte), botão e dica. Não há texto escrito no envelope.
    const envelope = criar('div', 'envelope');
    // No computador o envelope é maior (09/11/2026): os 300 px do celular pareciam pequenos numa tela de monitor.
    if (!estado.toque) envelope.classList.add('envelope--computador');
    const sombra = criar('div', 'envelope__sombra');
    const fechado = criarImagem(
      'envelope__fechado',
      urlDaImagem(config.imagens.envelopeFechado, 'vertical'),
      true,
    );
    const aberto = criarImagem(
      'envelope__aberto',
      urlDaImagem(config.imagens.envelopeAberto, 'vertical'),
      true,
    );
    const selo = criar('div', 'selo');
    const brilho = criar('span', 'selo__brilho');
    brilho.setAttribute('aria-hidden', 'true');
    const imagemDoSelo = montarImagemDoSelo(urlDaImagem(config.imagens.selo, 'vertical'), true);
    selo.append(brilho, imagemDoSelo);
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'carta__abrir';
    botao.setAttribute('aria-label', conteudo.rotulos.abrirEnvelope);
    botao.disabled = true;
    const dica = criar('p', 'carta__dica');
    dica.setAttribute('aria-live', 'polite');
    // O botão vem antes do selo: o foco do teclado acende o selo (`.carta__abrir:focus-visible + .selo`), no lugar de
    // um retângulo em volta do envelope inteiro.
    // O glow por trás do envelope (11/11/2026): vem primeiro no DOM, para ficar atrás de tudo. Só CSS; acende quando o
    // envelope pousa e apaga quando o selo é tocado.
    const aura = criarAuraDoEnvelope();
    envelope.append(aura, sombra, fechado, aberto, botao, selo, dica);
    gsap.set(envelope, { opacity: 0, xPercent: -50, yPercent: -50 });
    gsap.set([sombra, aberto, dica, brilho], { opacity: 0 });

    // Carta e informações: já no DOM, inertes e invisíveis até a abertura terminar.
    const { papel } = tempoDaCarta;
    const cartaEl = montarCarta(conteudo.carta, {
      url: urlDaImagem(config.imagens.papelCarta, 'vertical'),
      urlDoMiolo: urlDaImagem(config.imagens.papelMiolo, 'vertical'),
      ...papel,
    });
    const caixa = criar('main', 'conteudo');
    // No computador a carta, os cartões e o casal são maiores (09/11/2026); a CSS só vale na horizontal.
    if (!estado.toque) caixa.classList.add('conteudo--computador');
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

    // O chão (10/11/2026): uma faixa de gramado nítido da própria pintura, que continua a borda de baixo dela e fica à mostra
    // quando a cena sobe (antes era uma imagem minúscula ampliada, um borrão fosco). A timeline a sobe junto com a cena.
    // A imagem é do computador (pintura 16:9) ou das telas de toque (pintura vertical); só a CSS as mede.
    const chao = criar('div', 'convite__chao');
    chao.setAttribute('aria-hidden', 'true');
    const faixa = criar('div', 'convite__chao-faixa');
    faixa.append(
      criarImagem(
        'convite__chao-trecho',
        urlDaImagem(config.imagens.chao, estado.orientacao, estado.computador),
        true,
      ),
    );
    chao.append(faixa);
    if (estado.computador) chao.classList.add('convite__chao--computador');
    // Só aparece quando a cena sobe: antes disso a faixa ficaria à mostra na base da tela.
    gsap.set(chao, { opacity: 0 });
    // "Role para ler" vive dentro do conteúdo, ancorada ao topo da carta (na margem do papel, onde não há
    // texto), e rola junto com ela: nunca cobre o texto (SPEC-14, RF-14.4). Só aparece quando a leitura
    // para esperando a rolagem; quem usa leitor de tela já navega, então ela é só um aviso visual.
    const rolar = criar('p', 'convite__rolar', conteudo.dicas.rolar);
    rolar.setAttribute('aria-hidden', 'true');
    const seta = criarSeta();
    rolar.append(seta);
    gsap.set(rolar, { opacity: 0 });
    cartaEl.append(rolar);

    // O casal vive no espaço `.casal` da cena do bosque: sobe junto com ela.
    const espacoDoCasal = raiz.querySelector<HTMLElement>('.casal');
    const casal = espacoDoCasal
      ? criarImagem(
          estado.toque ? 'casal__imagem' : 'casal__imagem casal__imagem--computador',
          urlDaImagem(config.imagens.casal, 'vertical'),
        )
      : null;
    if (espacoDoCasal && casal) {
      espacoDoCasal.append(casal);
      gsap.set(casal, { opacity: 0 });
    }

    raiz.append(chao, envelope, caixa);
    // No modo de segurança, a carta já está sem `inert` quando o aviso chega: o foco vai ao título.
    pararDeOuvirSeguranca = eventos.on('seguranca', () => {
      titulo.focus({ preventScroll: true });
    });
    // Até a carta se abrir, a página não rola (RF-06.9).
    document.body.style.overflow = 'hidden';
    manterNoAlto();

    elementos = {
      envelope,
      sombra,
      fechado,
      aberto,
      selo,
      brilho,
      imagemDoSelo,
      botao,
      dica,
      conteudo: caixa,
      carta: cartaEl,
      titulo,
      blocos,
      chao,
      rolar,
      seta,
      casal,
    };
    return elementos;
  }

  /**
   * O glow atrás do envelope (11/11/2026): uma luz dourada macia em duas camadas, a de dentro, que segue o contorno do envelope, e a de
   * fora, mais larga (o tamanho, a cor e o ritmo delas estão em `carta.css`). Decorativo e sem texto.
   */
  function criarAuraDoEnvelope(): HTMLElement {
    const aura = criar('div', 'envelope__aura');
    aura.setAttribute('aria-hidden', 'true');
    aura.append(criar('span', 'envelope__halo'), criar('span', 'envelope__glow'));
    return aura;
  }

  /** Acende ou apaga o brilho do envelope (a CSS faz o esmaecimento). */
  function brilharEnvelope(acender: boolean): void {
    elementos?.envelope.classList.toggle('envelope--brilhando', acender);
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

  /** Onde o envelope pousa: `config.carta.alturaDoPouso` da altura da tela, do alto (08/11/2026); o baú já saiu de cena. */
  function pousoY(): number {
    return window.innerHeight * tempoDaCarta.alturaDoPouso;
  }

  /**
   * Enquanto a carta não abre, a página fica no alto (08/11/2026). O navegador restaura a rolagem de uma visita anterior ao
   * recarregar, mesmo com a rolagem travada, e a carta aparecia no meio e, de repente, pulava para o topo ao ser liberada:
   * qualquer rolagem fora do zero é desfeita na hora.
   */
  function manterNoAlto(): void {
    travaDeRolagem?.abort();
    window.scrollTo(0, 0);
    travaDeRolagem = new AbortController();
    window.addEventListener(
      'scroll',
      () => {
        if (window.scrollY !== 0) window.scrollTo(0, 0);
      },
      { passive: true, signal: travaDeRolagem.signal },
    );
  }

  function liberarRolagem(): void {
    travaDeRolagem?.abort();
    travaDeRolagem = undefined;
    const { conteudo: caixa } = montar();
    document.body.style.overflow = '';
    caixa.removeAttribute('inert');
    // A carta aberta começa sempre do alto: se a página se mexeu enquanto a rolagem estava travada (alguns navegadores de celular
    // deixam), ela volta ao início ao ser liberada.
    window.scrollTo(0, 0);
  }

  /** A seta de "Role para ler" desce e sobe sem parar; com animação reduzida, fica parada. */
  function balancarASeta(): void {
    if (estado.reduzido) return;
    const { seta } = montar();
    const t = tempoDoConvite.rolar;
    balancoDaSeta?.kill();
    balancoDaSeta = gsap.fromTo(
      seta,
      { y: 0 },
      { y: t.deslocamento, duration: t.periodo / 2, ease: curvas.suave, yoyo: true, repeat: -1 },
    );
  }

  /**
   * "Role para ler" é o primeiro texto a aparecer na carta aberta, antes de qualquer bloco, e fica à vista (08/11/2026): nem
   * a rolagem nem o fim da leitura a apagam.
   */
  function mostrarDicaDeRolagem(): void {
    if (dicaDeRolagemMostrada) return;
    dicaDeRolagemMostrada = true;
    const { rolar } = montar();
    gsap.to(rolar, { opacity: 1, duration: tempoDoConvite.rolar.aparece, ease: curvas.saida });
    balancarASeta();
  }

  /** Os blocos da carta aparecem um de cada vez, sempre no mesmo intervalo (ADR-0012, ADR-0034). */
  function iniciarLeitura(): void {
    const e = montar();
    const t = tempoDoConvite;
    leitura?.parar();
    leitura = revelarEmSequencia({
      blocos: e.blocos,
      janela: window,
      intervalo: t.intervaloDosBlocos,
      aparecer: (bloco) => {
        gsap.fromTo(
          bloco,
          { opacity: 0, y: t.blocosDeslocamento },
          { opacity: 1, y: 0, duration: t.blocosAparecem, ease: curvas.saida },
        );
      },
      mostrar: (bloco) => {
        gsap.set(bloco, { opacity: 1, y: 0 });
      },
      folgaDaDobra: t.folgaDaDobra,
      aoEsperarRolagem: mostrarDicaDeRolagem,
    });
  }

  /**
   * A carta ganha camada de GPU própria (`will-change`) a partir do envelope (11/11/2026, ADR-0050). Alta, com sombra projetada
   * (`drop-shadow`) e texto em mistura (`difference`), ela era refeita a cada quadro enquanto o JavaScript animava o selo e a cena por
   * cima, e no Motorola Edge 70 Fusion+ o convite piscava; com a camada dela o piscar parou (teste ao vivo no aparelho, painel `?painel`).
   * É JavaScript, e não CSS, porque a ADR-0047 proíbe `will-change` nas folhas de estilo e esta é a única peça que o pede, só depois do baú.
   */
  function darCamadaACarta(carta: HTMLElement): void {
    carta.style.willChange = 'transform, opacity';
  }

  /** Para a pulsação do selo deixando-o na escala em que estava: a abertura parte dali. */
  function pararOPulso(): void {
    pulso?.kill();
    pulso = undefined;
  }

  /** Os movimentos grandes da abertura que rodam no navegador (a subida da cena e do chão, o desdobrar da carta). */
  let movimentosDoConvite: Animation[] = [];

  function pararOsMovimentosDoConvite(): void {
    for (const movimento of movimentosDoConvite) movimento.cancel();
    movimentosDoConvite = [];
  }

  /**
   * Move uma peça grande pelo navegador (`Element.animate`) e, ao fim, grava o estado final no estilo pelo GSAP, que é quem o lê depois.
   * A subida da cena e do chão e o desdobrar da carta eram tweens do GSAP: o JavaScript reescrevia a transformação de peças enormes a cada
   * quadro (a cena inteira, com a água e dez camadas; a carta, alta e com sombra) e, no Motorola Edge 70 Fusion+ (144 Hz), a transição do
   * envelope para o convite piscava (11/11/2026, ADR-0050). Devolve `false` sem `animate`: quem chamou usa o GSAP, como antes.
   */
  function moverNoNavegador(
    elemento: HTMLElement,
    quadros: Keyframe[],
    duracaoEmSegundos: number,
    curva: string,
    aoFim: () => void,
  ): boolean {
    if (typeof elemento.animate !== 'function') return false;
    const animacao = animarNoNavegador(elemento, quadros, {
      duration: duracaoEmSegundos * 1000,
      easing: curvaCss(curva),
      fill: 'forwards',
    });
    movimentosDoConvite.push(animacao);
    animacao.onfinish = () => {
      aoFim();
      animacao.cancel();
    };
    return true;
  }

  function parar(): void {
    pararOsMovimentosDoConvite();
    linhaDaCarta?.kill();
    linhaDoConvite?.kill();
    pararOPulso();
    balancoDaSeta?.kill();
    leitura?.parar();
    leitura = undefined;
    ouvintes?.abort();
  }

  /** Estado final da primeira tela, sem animação: carta aberta, sem envelope, rolagem liberada. */
  function irParaOEstadoFinal(): void {
    const e = montar();
    parar();
    darCamadaACarta(e.carta);
    aberta = true;
    e.botao.disabled = true;
    brilharEnvelope(false);
    gsap.set(e.envelope, { opacity: 0 });
    e.envelope.hidden = true;
    concluirLuzDoPorDoSol(raiz);
    const cena = raiz.querySelector<HTMLElement>('.cena');
    if (cena) gsap.set(cena, { y: -window.innerHeight * tempoDoConvite.cenaSobeFracao });
    const bau = raiz.querySelector<HTMLElement>('.bau');
    if (bau) gsap.set(bau, { opacity: 0 });
    carregarImagensTardias(e.chao);
    gsap.set(e.chao, { opacity: 1, y: -window.innerHeight * tempoDoConvite.cenaSobeFracao });
    if (e.casal) gsap.set(e.casal, { opacity: 1, y: 0 });
    gsap.set(e.carta, { opacity: 1, scaleY: 1 });
    gsap.set(e.blocos, { opacity: 1, y: 0 });
    gsap.set(e.rolar, { opacity: 1 });
    dicaDeRolagemMostrada = true;
    balancarASeta();
    liberarRolagem();
    // Quem chega aqui sem ver a abertura (Pular, atalho, animação reduzida) tem o foco no título,
    // como quem a viu (SPEC-09, RF-09.6); o botão que o levou até aqui acabou de sumir.
    e.titulo.focus({ preventScroll: true });
  }

  const carta: Cena = {
    init() {
      montar();
    },

    run() {
      const e = montar();
      const t = tempoDaCarta;
      darCamadaACarta(e.carta);
      // O envelope, o selo e o chão só são pedidos agora (SPEC-02, RF-02.7).
      carregarImagensTardias(e.envelope);
      carregarImagensTardias(e.chao);
      const bau = raiz.querySelector<HTMLElement>('.bau');
      return new Promise<void>((resolver) => {
        const abrir = (como: OrigemDaAbertura) => {
          if (aberta) return;
          aberta = true;
          origem = como;
          e.botao.disabled = true;
          brilharEnvelope(false);
          pararOPulso();
          linhaDaCarta?.kill();
          resolver();
        };

        const pousou = () => {
          eventos.emit('carta:pousou');
          estado.definirFase('aguardando-selo');
          brilharEnvelope(true);
          e.botao.disabled = false;
          // O foco vai para o envelope quando ele pousa (SPEC-09, RF-09.6).
          e.botao.focus({ preventScroll: true });
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
        linhaDaCarta = gsap.timeline();
        // O baú sai de cena assim que o envelope aparece, antes do toque no selo (01/11/2026); o envelope ainda pousa
        // em `config.carta.alturaDoPouso` da altura da tela (`pousoY`).
        if (bau) linhaDaCarta.to(bau, { opacity: 0, duration: t.bauSome, ease: curvas.saida }, 0);
        linhaDaCarta
          // As estrelas da história se juntam neste ponto (`config.carta.alturaDoPouso`) e o envelope
          // nasce da luz delas: aparece no lugar, crescendo (ADR-0026).
          .fromTo(
            e.envelope,
            { opacity: 0, rotation: 0, scale: t.escalaDeNascimento, y: () => pousoY() },
            { opacity: 1, scale: 1, duration: t.pouso, ease: curvas.saida },
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
              // O selo pulsa pelo GSAP, como antes da ADR-0044 (11/11/2026): a pulsação por `Element.animate` coincidiu com o piscar do
              // envelope e do selo no Motorola Edge 70 Fusion+ (ADR-0048). O glow atrás do envelope agora é estático.
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
      travaDeRolagem?.abort();
      travaDeRolagem = undefined;
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
      dicaDeRolagemMostrada = false;
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
      concluirLuzDoPorDoSol(raiz);
      const cena = raiz.querySelector<HTMLElement>('.cena');

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
          // O selo cresce, solta um clarão e se solta inteiro (levanta, gira de leve e se desfaz em luz); as
          // siglas, que são da arte, vão com ele.
          .to(
            e.selo,
            { scale: t.seloCresce.escala, duration: t.seloCresce.duracao, ease: curvas.saida },
            0,
          )
          .fromTo(
            e.brilho,
            { opacity: 0, scale: 0.4 },
            {
              opacity: t.seloBrilho.opacidade,
              scale: t.seloBrilho.escala * 0.6,
              duration: t.seloBrilho.duracao * 0.4,
              ease: curvas.saida,
            },
            t.seloCresce.duracao,
          )
          .to(
            e.brilho,
            {
              opacity: 0,
              scale: t.seloBrilho.escala,
              duration: t.seloBrilho.duracao * 0.6,
              ease: curvas.senoSaida,
            },
            t.seloCresce.duracao + t.seloBrilho.duracao * 0.4,
          )
          .add(
            soltarSelo(e.imagemDoSelo, { ...t.seloSolta, curva: curvas.saida }),
            t.seloCresce.duracao,
          )
          // A aba abre: o envelope fechado dá lugar ao aberto, com leve aumento.
          .to(e.fechado, { opacity: 0, duration: t.aba, ease: curvas.leve }, t.abaEm)
          .to(e.aberto, { opacity: 1, duration: t.aba, ease: curvas.leve }, t.abaEm)
          .to(e.envelope, { scale: t.abaEscala, duration: t.aba, ease: curvas.leve }, t.abaEm)
          // O envelope desce e some; a carta só aparece depois, desdobrando-se na cena (nada de papel subindo por trás
          // do envelope, 01/11/2026).
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

        // A cena inteira sobe (o baú já saiu de cena com a chegada do envelope); o chão preenche a base que fica à mostra.
        const sobe = -altura * t.cenaSobeFracao;
        // A subida é do navegador: o GSAP só entra se não houver `Element.animate` (e para gravar o estado final no estilo).
        const subir = (peca: HTMLElement): void => {
          const rodou = moverNoNavegador(
            peca,
            [{ transform: 'translateY(0px)' }, { transform: `translateY(${String(sobe)}px)` }],
            t.cenaSobe,
            curvas.viaDupla,
            () => {
              gsap.set(peca, { y: sobe });
            },
          );
          if (!rodou) gsap.to(peca, { y: sobe, duration: t.cenaSobe, ease: curvas.viaDupla });
        };
        if (cena) linha.call(subir, [cena], t.cenaSobeEm);
        linha.set(e.chao, { opacity: 1 }, t.cenaSobeEm).call(subir, [e.chao], t.cenaSobeEm);
        // O casal surge de costas, na margem do lago.
        if (e.casal) {
          linha.fromTo(
            e.casal,
            { opacity: 0, y: t.casalDeslocamento },
            { opacity: 1, y: 0, duration: t.casalAparece, ease: curvas.senoSaida },
            t.casalEm,
          );
        }

        linha
          // A carta se desdobra a partir do topo e assenta (pelo navegador; o GSAP só entra sem `Element.animate`).
          .call(
            () => {
              const rodou = moverNoNavegador(
                e.carta,
                [
                  { opacity: 0, transform: `scaleY(${String(t.escalaDobrada)})` },
                  { opacity: 1, transform: 'scaleY(1)' },
                ],
                t.desdobra,
                curvas.viaDuplaForte,
                () => {
                  gsap.set(e.carta, { opacity: 1, scaleY: 1 });
                },
              );
              if (!rodou) {
                gsap.to(e.carta, {
                  opacity: 1,
                  scaleY: 1,
                  duration: t.desdobra,
                  ease: curvas.viaDuplaForte,
                });
              }
            },
            [],
            t.desdobraEm,
          )
          // "Role para ler" é o primeiro texto a aparecer: surge quando a carta já se desdobrou pela metade.
          .call(mostrarDicaDeRolagem, [], t.desdobraEm + t.desdobra / 2)
          // Com a carta aberta, a rolagem é liberada e os blocos começam a aparecer, um a um, no ritmo
          // da leitura; a leitura continua sozinha depois do fim desta linha (ADR-0012).
          .call(
            () => {
              liberarRolagem();
              iniciarLeitura();
            },
            [],
            t.blocosEm,
          )
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
