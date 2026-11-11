import gsap from 'gsap';

import type { ConfigConvite } from '@/domain/config/config-convite';
import type { FotoDaGaleria } from '@/domain/conteudo/conteudo-convite';

import { animarNoNavegador } from '../animacao/animar-no-navegador';
import { curvaCss } from '../animacao/curva-css';
import { criar } from '../dom';

export interface DependenciasDoCarrossel {
  readonly fotos: readonly FotoDaGaleria[];
  /** Nome acessível do carrossel. */
  readonly rotulo: string;
  /** Modelo do nome de cada foto, com `{n}` e `{total}` ("Foto {n} de {total}"). */
  readonly rotuloDaFoto: string;
  readonly config: Pick<ConfigConvite, 'carrossel' | 'curvas'>;
  /** Animação reduzida: sem troca automática e sem movimento; o convidado passa as fotos quando quiser. */
  readonly reduzido?: boolean;
}

export interface CarrosselMontado {
  readonly elemento: HTMLElement;
  /** Para a troca automática, tira os ouvintes e as animações. */
  destruir(): void;
}

const DIRECAO_ADIANTE = 1;
const DIRECAO_ATRAS = -1;

/**
 * O carrossel de fotos do casal, abaixo da mensagem (08/11/2026): as fotos se alternam sozinhas, com uma troca suave (a
 * foto que sai desliza e some enquanto a outra chega e se assenta) e um zoom lento sobre a que está à vista. Cada foto
 * aparece inteira, sobre um fundo desfocado dela mesma. A troca automática só anda enquanto o carrossel está na tela e
 * para de vez no primeiro toque do convidado, que também pode arrastar para o lado, tocar nos pontinhos ou usar as setas
 * do teclado. Só uma foto fica exposta ao leitor de tela por vez. Com animação reduzida, nada se move sozinho.
 */
export function montarCarrossel(dependencias: DependenciasDoCarrossel): CarrosselMontado {
  const { fotos, rotulo, rotuloDaFoto, config, reduzido = false } = dependencias;
  const { carrossel: parametros, curvas } = config;
  const total = fotos.length;
  const nomeDaFoto = (indice: number) =>
    rotuloDaFoto.replace('{n}', String(indice + 1)).replace('{total}', String(total));

  const raiz = criar('div', 'carrossel');
  raiz.setAttribute('role', 'group');
  raiz.setAttribute('aria-roledescription', 'carrossel');
  raiz.setAttribute('aria-label', rotulo);

  const quadro = criar('div', 'carrossel__quadro');
  // Com troca automática, o leitor de tela não deve anunciar cada foto que passa.
  quadro.setAttribute('aria-live', 'off');

  /** A foto à vista: opaca e visível, sem deslocamento. */
  function aparecer(slide: HTMLElement): void {
    slide.style.opacity = '1';
    slide.style.visibility = 'inherit';
    slide.style.transform = '';
  }
  /** A foto fora de vista: invisível e `visibility: hidden`, sem deslocamento. */
  function sumir(slide: HTMLElement): void {
    slide.style.opacity = '0';
    slide.style.visibility = 'hidden';
    slide.style.transform = '';
  }

  function criarImagem(classe: string, origem: string, alt: string): HTMLImageElement {
    const imagem = document.createElement('img');
    imagem.className = classe;
    imagem.src = origem;
    imagem.alt = alt;
    imagem.loading = 'lazy';
    imagem.decoding = 'async';
    imagem.draggable = false;
    return imagem;
  }

  const slides = fotos.map((foto, indice) => {
    const slide = criar('div', 'carrossel__slide');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', nomeDaFoto(indice));
    slide.setAttribute('aria-hidden', indice === 0 ? 'false' : 'true');
    // O fundo desfocado preenche o quadro quando a foto, inteira, não tem a mesma proporção dele.
    const fundo = criarImagem('carrossel__fundo', foto.foto, '');
    fundo.setAttribute('aria-hidden', 'true');
    const imagem = criarImagem('carrossel__foto', foto.foto, foto.alt);
    slide.append(fundo, imagem);
    // As fotos que não estão à vista ficam `visibility: hidden`: o navegador não as desenha nem as mantém em camadas da GPU,
    // cinco fotos empilhadas com desfoque por trás eram o ponto em que o convite piscava (10/11/2026).
    if (indice === 0) aparecer(slide);
    else sumir(slide);
    return { slide, imagem };
  });
  quadro.append(...slides.map((s) => s.slide));

  const pontos = fotos.map((_, indice) => {
    const ponto = document.createElement('button');
    ponto.type = 'button';
    ponto.className = 'carrossel__ponto';
    ponto.setAttribute('aria-label', nomeDaFoto(indice));
    if (indice === 0) ponto.setAttribute('aria-current', 'true');
    ponto.append(criar('span', 'carrossel__ponto-marca'));
    return ponto;
  });
  const listaDePontos = criar('div', 'carrossel__pontos');
  listaDePontos.append(...pontos);
  raiz.append(quadro, listaDePontos);

  let atual = 0;
  let interagiu = false;
  let visivel = false;
  let destruido = false;
  let proximaTroca: gsap.core.Tween | undefined;
  /** O zoom da foto que está à vista, e o das fotos que ainda não terminaram de sair (por índice). */
  let zoom: Animation | undefined;
  const zoomsPorFoto = new Map<number, Animation>();
  /** As trocas em andamento, cada uma com o que fazer quando termina (ou é interrompida). */
  const trocasEmCurso = new Map<Animation, () => void>();
  let observador: IntersectionObserver | undefined;
  const ouvintes = new AbortController();
  const { signal } = ouvintes;

  /**
   * A troca de fotos e o zoom são animações do navegador (`Element.animate`), não do GSAP (10/11/2026, ADR-0044): o navegador as roda
   * por conta própria e só promove a camada de GPU enquanto elas andam, e a troca por JavaScript piscava de leve no Motorola Edge 70
   * Fusion+ (144 Hz). Quando uma troca acaba, o estado final vai para o estilo da foto e a animação é cancelada.
   */
  function animarTroca(
    slide: HTMLElement,
    quadros: Keyframe[],
    curva: string,
    duracao: number,
    aoTerminar: () => void,
  ): void {
    const animacao = animarNoNavegador(slide, quadros, {
      duration: duracao * 1000,
      easing: curvaCss(curva),
      fill: 'both',
    });
    const terminar = () => {
      trocasEmCurso.delete(animacao);
      animacao.onfinish = null;
      aoTerminar();
      animacao.cancel();
    };
    trocasEmCurso.set(animacao, terminar);
    animacao.onfinish = terminar;
  }

  /** Uma troca interrompida por outra vai direto ao fim: a que chegava fica à vista, a que saía some. */
  function concluirTrocasEmCurso(): void {
    for (const terminar of [...trocasEmCurso.values()]) terminar();
  }

  /** O zoom lento sobre a foto que está à vista (só `transform`). */
  function iniciarZoom(indice: number): void {
    // A foto que sai fica onde está (zoom parado) até a troca acabar; então volta ao tamanho normal.
    zoom?.pause();
    zoom = undefined;
    const imagem = slides[indice]?.imagem;
    if (!imagem || reduzido || typeof imagem.animate !== 'function') return;
    zoomsPorFoto.get(indice)?.cancel();
    zoom = animarNoNavegador(
      imagem,
      [{ transform: 'scale(1)' }, { transform: `scale(${String(parametros.zoom)})` }],
      {
        duration: (parametros.intervalo + parametros.transicao) * 1000,
        easing: curvaCss(curvas.linear),
        fill: 'both',
      },
    );
    zoomsPorFoto.set(indice, zoom);
  }

  function ir(para: number, direcao: 1 | -1): void {
    if (destruido || para === atual || total === 0) return;
    const saindo = slides[atual];
    const entrando = slides[para];
    if (!saindo || !entrando) return;
    const indiceQueSai = atual;
    const duracao =
      reduzido || typeof entrando.slide.animate !== 'function' ? 0 : parametros.transicao;

    concluirTrocasEmCurso();
    const aoSair = () => {
      sumir(saindo.slide);
      zoomsPorFoto.get(indiceQueSai)?.cancel();
      zoomsPorFoto.delete(indiceQueSai);
    };
    if (duracao === 0) {
      aparecer(entrando.slide);
      aoSair();
    } else {
      const deslocamento = parametros.deslocamento;
      // A que chega parte invisível, deslocada para o lado de onde vem, e assenta; a que sai desliza para o lado oposto e some.
      entrando.slide.style.opacity = '0';
      entrando.slide.style.visibility = 'inherit';
      animarTroca(
        entrando.slide,
        [
          { opacity: 0, transform: `translate3d(${String(direcao * deslocamento)}%, 0, 0)` },
          { opacity: 1, transform: 'translate3d(0%, 0, 0)' },
        ],
        curvas.saida,
        duracao,
        () => {
          aparecer(entrando.slide);
        },
      );
      animarTroca(
        saindo.slide,
        [
          { opacity: 1, transform: 'translate3d(0%, 0, 0)' },
          { opacity: 0, transform: `translate3d(${String(-direcao * deslocamento)}%, 0, 0)` },
        ],
        curvas.suave,
        duracao,
        aoSair,
      );
    }

    saindo.slide.setAttribute('aria-hidden', 'true');
    entrando.slide.setAttribute('aria-hidden', 'false');
    pontos[atual]?.removeAttribute('aria-current');
    pontos[para]?.setAttribute('aria-current', 'true');
    atual = para;
    iniciarZoom(para);
  }

  /** A troca automática só anda com o carrossel na tela e enquanto o convidado não mexeu nele. */
  function agendar(): void {
    proximaTroca?.kill();
    if (destruido || reduzido || interagiu || !visivel || total < 2) return;
    proximaTroca = gsap.delayedCall(parametros.intervalo, () => {
      ir((atual + 1) % total, DIRECAO_ADIANTE);
      agendar();
    });
  }

  /** O convidado assumiu o controle: a troca automática para de vez. */
  function assumir(): void {
    interagiu = true;
    proximaTroca?.kill();
  }

  function irPara(para: number): void {
    assumir();
    ir(para, para > atual ? DIRECAO_ADIANTE : DIRECAO_ATRAS);
  }

  pontos.forEach((ponto, indice) => {
    ponto.addEventListener(
      'click',
      () => {
        irPara(indice);
      },
      { signal },
    );
  });

  // Arrastar para o lado passa a foto; a rolagem vertical da página segue livre (`touch-action: pan-y` na CSS).
  let inicioX: number | undefined;
  quadro.addEventListener(
    'pointerdown',
    (evento) => {
      inicioX = evento.clientX;
    },
    { signal },
  );
  quadro.addEventListener(
    'pointerup',
    (evento) => {
      if (inicioX === undefined) return;
      const deslocamento = evento.clientX - inicioX;
      inicioX = undefined;
      if (Math.abs(deslocamento) < parametros.limiteDoGesto) return;
      irPara(deslocamento < 0 ? (atual + 1) % total : (atual - 1 + total) % total);
    },
    { signal },
  );
  quadro.addEventListener(
    'pointercancel',
    () => {
      inicioX = undefined;
    },
    { signal },
  );

  raiz.addEventListener(
    'keydown',
    (evento) => {
      if (evento.key === 'ArrowRight') irPara((atual + 1) % total);
      else if (evento.key === 'ArrowLeft') irPara((atual - 1 + total) % total);
    },
    { signal },
  );

  if (typeof IntersectionObserver === 'undefined') {
    visivel = true;
    iniciarZoom(atual);
    agendar();
  } else {
    observador = new IntersectionObserver(
      (entradas) => {
        const ultima = entradas[entradas.length - 1];
        if (!ultima) return;
        visivel = ultima.isIntersecting;
        if (visivel) {
          if (!zoom) iniciarZoom(atual);
          // Só retoma o que estava parado: `play()` numa animação que já terminou a faria recomeçar do tamanho normal.
          else if (zoom.playState === 'paused') zoom.play();
          agendar();
        } else {
          // Fora da tela, nada se move: nem a troca nem o zoom.
          proximaTroca?.kill();
          zoom?.pause();
        }
      },
      { threshold: 0.4 },
    );
    observador.observe(raiz);
  }

  return {
    elemento: raiz,
    destruir() {
      destruido = true;
      proximaTroca?.kill();
      observador?.disconnect();
      ouvintes.abort();
      // As trocas em andamento terminam no ato e os zooms são cancelados: nada fica rodando nem em camada de GPU.
      concluirTrocasEmCurso();
      for (const animacao of zoomsPorFoto.values()) animacao.cancel();
      zoomsPorFoto.clear();
      zoom = undefined;
    },
  };
}
