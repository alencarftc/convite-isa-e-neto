import gsap from 'gsap';

import type { ConfigConvite } from '@/domain/config/config-convite';
import { deslocamentoPorPonteiro } from '@/domain/profundidade/deslocamento';

import { animarNoNavegador } from '../animacao/animar-no-navegador';
import { curvaCss } from '../animacao/curva-css';

export interface OpcoesDeProfundidade {
  /** Camadas com `data-prof` (0 a 1); as de profundidade maior se movem mais. */
  readonly camadas: readonly HTMLElement[];
  /** Aparelho de toque: deriva automática em vez de acompanhar o mouse. */
  readonly toque: boolean;
  readonly parametros: ConfigConvite['movimento']['profundidade'];
  /** Curva da deriva (`config.curvas.suave`). */
  readonly curva: string;
  readonly janela: Pick<
    Window,
    'innerWidth' | 'innerHeight' | 'addEventListener' | 'removeEventListener'
  >;
}

/** A profundidade em andamento: para de vez, ou congela e retoma a deriva ("Pausar animação", SPEC-18). */
export interface ProfundidadeEmAndamento {
  parar(): void;
  pausar(): void;
  retomar(): void;
}

function profundidadeDe(camada: HTMLElement): number {
  return Number(camada.getAttribute('data-prof') ?? 0);
}

/** O deslocamento (x, y) que a transformação calculada de uma camada tem agora, com a animação do navegador onde estiver. */
function deslocamentoAtual(camada: HTMLElement): { x: number; y: number } {
  const calculada = /^matrix(3d)?\(([^)]*)\)$/.exec(getComputedStyle(camada).transform);
  if (!calculada) return { x: 0, y: 0 };
  const numeros = (calculada[2] ?? '').split(',').map(Number);
  const x = (calculada[1] ? numeros[12] : numeros[4]) ?? 0;
  const y = (calculada[1] ? numeros[13] : numeros[5]) ?? 0;
  return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
}

/**
 * O menor deslocamento da deriva, em pixels, que alguém percebe. Uma camada que se move menos que isto (o céu, a 0,07 px) não ganha
 * animação: seria uma camada de tela cheia a mais na GPU para um movimento invisível (11/11/2026, ADR-0050).
 */
const DESLOCAMENTO_VISIVEL = 1;

/**
 * A deriva do celular pelo navegador: cada camada vai e volta (`alternate`, sem fim) de 0 a `deriva × profundidade` px, no mesmo
 * período, na mesma curva e com a mesma defasagem de antes. As camadas que se moveriam menos que `DESLOCAMENTO_VISIVEL` ficam paradas.
 *
 * Pausar NÃO deixa a animação pausada: uma animação do navegador pausada continua "em curso" e mantém cada camada de tela cheia numa
 * camada de GPU para sempre, como um `will-change` (11/11/2026, ADR-0049). Pausar guarda o ponto em que a camada está (o tempo da
 * animação e o deslocamento, escrito como `translate` 2D no estilo) e cancela a animação; retomar a recria nesse mesmo tempo.
 */
function derivaNoNavegador({
  camadas,
  parametros,
  curva,
}: Pick<OpcoesDeProfundidade, 'camadas' | 'parametros' | 'curva'>): ProfundidadeEmAndamento {
  const moveis = camadas
    .map((camada, indice) => ({ camada, indice }))
    .filter(({ camada }) => parametros.deriva * profundidadeDe(camada) >= DESLOCAMENTO_VISIVEL);

  const criar = ({ camada, indice }: (typeof moveis)[number], tempo: number): Animation => {
    const deslocamento = parametros.deriva * profundidadeDe(camada);
    const animacao = animarNoNavegador(
      camada,
      [
        { transform: 'translate3d(0px, 0px, 0px)' },
        { transform: `translate3d(${String(deslocamento)}px, 0px, 0px)` },
      ],
      {
        duration: parametros.periodoDaDeriva * 1000,
        delay: indice * parametros.defasagemDaDeriva * 1000,
        direction: 'alternate',
        iterations: Number.POSITIVE_INFINITY,
        easing: curvaCss(curva),
        fill: 'both',
      },
    );
    if (tempo > 0) animacao.currentTime = tempo;
    return animacao;
  };
  let animacoes: Animation[] = moveis.map((movel) => criar(movel, 0));
  /** Em que ponto cada camada ficou, enquanto a deriva está congelada (`undefined` = rodando). */
  let congelada: { tempo: number; transformacao: string }[] | undefined;

  const soltar = (): void => {
    if (!congelada) return;
    moveis.forEach(({ camada }, posicao) => {
      camada.style.transform = congelada?.[posicao]?.transformacao ?? '';
    });
  };

  return {
    parar() {
      for (const animacao of animacoes) animacao.cancel();
      soltar();
      congelada = undefined;
    },
    pausar() {
      if (congelada) return;
      congelada = animacoes.map((animacao, posicao) => {
        const camada = moveis[posicao]?.camada;
        const anterior = camada?.style.transform ?? '';
        if (camada) {
          const { x, y } = deslocamentoAtual(camada);
          camada.style.transform = `translate(${String(Math.round(x * 1000) / 1000)}px, ${String(Math.round(y * 1000) / 1000)}px)`;
        }
        const tempo = Number(animacao.currentTime ?? 0);
        animacao.cancel();
        return { tempo: Number.isFinite(tempo) ? tempo : 0, transformacao: anterior };
      });
    },
    retomar() {
      if (!congelada) {
        for (const animacao of animacoes) animacao.play();
        return;
      }
      const pontos = congelada;
      animacoes = moveis.map((movel, posicao) => criar(movel, pontos[posicao]?.tempo ?? 0));
      soltar();
      congelada = undefined;
    },
  };
}

/**
 * Profundidade do bosque (SPEC-03, RF-03.3 e RF-03.4): no computador as camadas acompanham o mouse
 * (até 24 × 12 px, vezes a profundidade) e voltam ao centro quando ele sai da janela; no celular,
 * cada camada faz uma deriva lenta e defasada. Só `transform`. Pausar congela a deriva (ela anda sozinha,
 * como a cena viva); o mouse não precisa de pausa, porque só se move quando o convidado o move.
 */
export function iniciarProfundidade(opcoes: OpcoesDeProfundidade): ProfundidadeEmAndamento {
  const { camadas, toque, parametros, curva, janela } = opcoes;

  if (toque) {
    // A deriva é uma animação do navegador (`Element.animate`) e não do GSAP: no Motorola Edge 70 Fusion+ (144 Hz) as camadas
    // grandes derivando por JavaScript, quadro a quadro, faziam a cena piscar, e as mesmas animações por CSS, não (10/11/2026,
    // ADR-0044). O navegador as roda por conta própria, fora da thread do JavaScript. Sem `animate` (navegador antigo), o GSAP.
    const primeira = camadas[0];
    if (primeira && typeof primeira.animate === 'function') return derivaNoNavegador(opcoes);

    const derivas: gsap.core.Tween[] = [];
    const contexto = gsap.context(() => {
      camadas.forEach((camada, indice) => {
        derivas.push(
          gsap.to(camada, {
            x: parametros.deriva * profundidadeDe(camada),
            duration: parametros.periodoDaDeriva,
            ease: curva,
            yoyo: true,
            repeat: -1,
            delay: indice * parametros.defasagemDaDeriva,
          }),
        );
      });
    });
    return {
      parar() {
        contexto.revert();
      },
      pausar() {
        for (const deriva of derivas) deriva.pause();
      },
      retomar() {
        for (const deriva of derivas) deriva.resume();
      },
    };
  }

  const seguidores = camadas.map((el) => ({
    prof: profundidadeDe(el),
    x: gsap.quickTo(el, 'x', { duration: parametros.suavizacao, ease: 'power3.out' }),
    y: gsap.quickTo(el, 'y', { duration: parametros.suavizacao, ease: 'power3.out' }),
  }));

  const aoMover = (evento: PointerEvent) => {
    for (const { prof, x, y } of seguidores) {
      x(deslocamentoPorPonteiro(evento.clientX, janela.innerWidth, parametros.mouseX, prof));
      y(deslocamentoPorPonteiro(evento.clientY, janela.innerHeight, parametros.mouseY, prof));
    }
  };
  // O mouse saiu da janela (`relatedTarget` nulo): as camadas voltam ao centro.
  const aoSair = (evento: PointerEvent) => {
    if (evento.relatedTarget !== null) return;
    for (const { x, y } of seguidores) {
      x(0);
      y(0);
    }
  };

  janela.addEventListener('pointermove', aoMover);
  janela.addEventListener('pointerout', aoSair);
  return {
    parar() {
      janela.removeEventListener('pointermove', aoMover);
      janela.removeEventListener('pointerout', aoSair);
      gsap.killTweensOf(camadas);
    },
    // O mouse só move as camadas quando o convidado o move: não há movimento próprio para pausar.
    pausar() {
      /* nada a congelar */
    },
    retomar() {
      /* nada a retomar */
    },
  };
}
