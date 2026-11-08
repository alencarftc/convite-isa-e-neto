import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import type { EstadoConvite } from '@/application/estado-convite';
import { tempoDeLeitura } from '@/domain/carta/tempo-de-leitura';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';

import { criar, criarImagem } from '../dom';
import { carregarImagensTardias } from '../imagens/imagens-tardias';
import { chuvaDePetalas } from '../petalas/chuva-de-petalas';
import { removerPetalas } from '../petalas/petalas';
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
  readonly petalas: HTMLImageElement[];
}

/**
 * Envelope e carta (SPEC-06). Devolve as duas etapas do caminho, que dividem o mesmo DOM e estado:
 *
 * - `carta` (`tlCarta`, 3 s): o envelope pousa a 1/3 da altura da tela, de baixo para cima, e espera o toque (ou o arrasto) no selo, o
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
  let ouvintesDoConvite: AbortController | undefined;
  let pararDeOuvirSeguranca: (() => void) | undefined;
  let origem: OrigemDaAbertura = 'toque';
  let aberta = false;
  let rolou = false;
  let dicaDeRolagemMostrada = false;

  function montar(): Elementos {
    if (elementos) return elementos;

    // Envelope: sombra, as duas imagens, selo (inteiro, com as siglas na
    // arte), botão e dica. Não há texto escrito no envelope.
    const envelope = criar('div', 'envelope');
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
    envelope.append(sombra, fechado, aberto, botao, selo, dica);
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

    // O chão é a faixa que continua as cores da borda de baixo do primeiro plano (uma imagem minúscula,
    // ampliada pelo navegador): a base que a cena deixa à mostra ao subir. A timeline a sobe junto com a cena.
    const chao = criar('div', 'convite__chao');
    chao.setAttribute('aria-hidden', 'true');
    chao.append(
      criarImagem(
        'convite__chao-imagem',
        urlDaImagem(config.imagens.chao, estado.orientacao),
        true,
      ),
    );
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
      ? criarImagem('casal__imagem', urlDaImagem(config.imagens.casal, 'vertical'))
      : null;
    if (espacoDoCasal && casal) {
      espacoDoCasal.append(casal);
      gsap.set(casal, { opacity: 0 });
    }

    // As pétalas são pedidas quando o envelope começa (`carta.run`), e não no `init`, antes do toque.
    const petalas: HTMLImageElement[] = [];

    raiz.append(chao, envelope, caixa);
    // No modo de segurança, a carta já está sem `inert` quando o aviso chega: o foco vai ao título.
    pararDeOuvirSeguranca = eventos.on('seguranca', () => {
      titulo.focus({ preventScroll: true });
    });
    // Até a carta se abrir, a página não rola (RF-06.9).
    document.body.style.overflow = 'hidden';

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

  /** Onde o envelope pousa: a 1/3 da altura da tela, de baixo para cima (02/11/2026); o baú já saiu de cena. */
  function pousoY(): number {
    return window.innerHeight * tempoDaCarta.alturaDoPouso;
  }

  function luzesDoPorDoSol(): HTMLElement[] {
    return gsap.utils.toArray<HTMLElement>('.camada--ceu-sol, .camada--luz', raiz);
  }

  function liberarRolagem(): void {
    const { conteudo: caixa } = montar();
    document.body.style.overflow = '';
    caixa.removeAttribute('inert');
  }

  /** "Role para ler": aparece uma vez, com a seta descendo e subindo, e some na primeira rolagem. */
  function mostrarDicaDeRolagem(): void {
    if (dicaDeRolagemMostrada || rolou) return;
    dicaDeRolagemMostrada = true;
    const { rolar, seta } = montar();
    const t = tempoDoConvite.rolar;
    gsap.to(rolar, { opacity: 1, duration: t.aparece, ease: curvas.saida });
    balancoDaSeta = gsap.fromTo(
      seta,
      { y: 0 },
      { y: t.deslocamento, duration: t.periodo / 2, ease: curvas.suave, yoyo: true, repeat: -1 },
    );
  }

  function esconderDicaDeRolagem(): void {
    const { rolar } = montar();
    gsap.to(rolar, {
      opacity: 0,
      duration: tempoDoConvite.rolar.aparece,
      ease: curvas.saida,
      onComplete: () => {
        balancoDaSeta?.kill();
      },
    });
  }

  /** Os blocos da carta aparecem um de cada vez, no ritmo da leitura (ADR-0012). */
  function iniciarLeitura(): void {
    const e = montar();
    const t = tempoDoConvite;
    leitura?.parar();
    leitura = revelarEmSequencia({
      blocos: e.blocos,
      janela: window,
      tempoDeLeitura: (bloco) => tempoDeLeitura(bloco.textContent.trim().length, t.leitura),
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

  function parar(): void {
    linhaDaCarta?.kill();
    linhaDoConvite?.kill();
    pulso?.kill();
    balancoDaSeta?.kill();
    leitura?.parar();
    leitura = undefined;
    ouvintes?.abort();
    ouvintesDoConvite?.abort();
    // A chuva interrompida não chega ao fim em que cada pétala se remove: tira as que sobraram.
    if (elementos) removerPetalas(elementos.conteudo);
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
    carregarImagensTardias(e.chao);
    gsap.set(e.chao, { opacity: 1, y: -window.innerHeight * tempoDoConvite.cenaSobeFracao });
    if (e.casal) gsap.set(e.casal, { opacity: 1, y: 0 });
    gsap.set(e.carta, { opacity: 1, scaleY: 1 });
    gsap.set(e.blocos, { opacity: 1, y: 0 });
    gsap.set(e.rolar, { opacity: 0 });
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
      // O envelope, o selo, o chão e as pétalas só são pedidos agora (SPEC-02, RF-02.7).
      carregarImagensTardias(e.envelope);
      carregarImagensTardias(e.chao);
      if (e.petalas.length === 0) {
        for (const chave of ['petalaA', 'petalaB', 'petalaC'] as const) {
          const petala = new Image();
          petala.src = urlDaImagem(config.imagens[chave], 'vertical');
          e.petalas.push(petala);
        }
      }
      const bau = raiz.querySelector<HTMLElement>('.bau');
      return new Promise<void>((resolver) => {
        const abrir = (como: OrigemDaAbertura) => {
          if (aberta) return;
          aberta = true;
          origem = como;
          e.botao.disabled = true;
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
        // a 1/3 da altura da tela, de baixo para cima (`pousoY`).
        if (bau) linhaDaCarta.to(bau, { opacity: 0, duration: t.bauSome, ease: curvas.saida }, 0);
        linhaDaCarta
          // As estrelas da história se juntam neste ponto (a 1/3 da altura da tela, de baixo para cima) e o envelope
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
      rolou = false;
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
      gsap.set(luzesDoPorDoSol(), { opacity: 1 });
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
        if (cena) {
          linha.to(
            cena,
            { y: -altura * t.cenaSobeFracao, duration: t.cenaSobe, ease: curvas.viaDupla },
            t.cenaSobeEm,
          );
        }
        linha
          .set(e.chao, { opacity: 1 }, t.cenaSobeEm)
          .to(
            e.chao,
            { y: -altura * t.cenaSobeFracao, duration: t.cenaSobe, ease: curvas.viaDupla },
            t.cenaSobeEm,
          );
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
          // A carta se desdobra a partir do topo e assenta.
          .to(
            e.carta,
            { opacity: 1, scaleY: 1, duration: t.desdobra, ease: curvas.viaDuplaForte },
            t.desdobraEm,
          )
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

        // A primeira rolagem apaga "Role para ler" para sempre; se ela vier antes de a leitura parar,
        // a dica nem chega a aparecer.
        ouvintesDoConvite = new AbortController();
        window.addEventListener(
          'scroll',
          () => {
            rolou = true;
            esconderDicaDeRolagem();
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
