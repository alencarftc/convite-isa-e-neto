import gsap from 'gsap';

import type { ConfigConvite } from '@/domain/config/config-convite';
import { deslocamentoPorPonteiro } from '@/domain/profundidade/deslocamento';

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

function profundidadeDe(camada: HTMLElement): number {
  return Number(camada.getAttribute('data-prof') ?? 0);
}

/**
 * Profundidade do bosque (SPEC-03, RF-03.3 e RF-03.4): no computador as camadas acompanham o mouse
 * (até 24 × 12 px, vezes a profundidade) e voltam ao centro quando ele sai da janela; no celular,
 * cada camada faz uma deriva lenta e defasada. Só `transform`. Devolve a função que para tudo.
 */
export function iniciarProfundidade(opcoes: OpcoesDeProfundidade): () => void {
  const { camadas, toque, parametros, curva, janela } = opcoes;

  if (toque) {
    const contexto = gsap.context(() => {
      camadas.forEach((camada, indice) => {
        gsap.to(camada, {
          x: parametros.deriva * profundidadeDe(camada),
          duration: parametros.periodoDaDeriva,
          ease: curva,
          yoyo: true,
          repeat: -1,
          delay: indice * parametros.defasagemDaDeriva,
        });
      });
    });
    return () => {
      contexto.revert();
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
  return () => {
    janela.removeEventListener('pointermove', aoMover);
    janela.removeEventListener('pointerout', aoSair);
    gsap.killTweensOf(camadas);
  };
}
