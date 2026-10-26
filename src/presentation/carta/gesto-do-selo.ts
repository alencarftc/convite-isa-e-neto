import gsap from 'gsap';

import type { ConfigConvite } from '@/domain/config/config-convite';
import {
  deslocamentoComResistencia,
  distanciaDoGesto,
  gestoAbre,
} from '@/domain/gesto/gesto-do-selo';

export interface OpcoesDoGestoDoSelo {
  /** Recebe os ponteiros: o botão que cobre o envelope (SPEC-06, RF-06.3). */
  readonly botao: HTMLElement;
  /** O que acompanha o dedo. */
  readonly selo: HTMLElement;
  readonly gesto: ConfigConvite['carta']['gesto'];
  /** Curva com que o selo volta ao lugar quando o gesto não chegou ao limiar. */
  readonly mola: string;
  /** Animação reduzida: o selo não acompanha o dedo, mas o gesto ainda abre (RF-16.3). */
  readonly reduzido: boolean;
  /** Soltou além do limiar. */
  readonly aoAbrir: () => void;
  /** Quando abortado, desliga os ouvintes. */
  readonly signal: AbortSignal;
}

export interface GestoDoSelo {
  /**
   * O `click` que o navegador dispara logo depois de um arrasto não é um toque: a cena pergunta
   * aqui antes de abrir. Consome a marca, então vale para um clique só.
   */
  cliqueFoiArrasto(): boolean;
}

/**
 * Deslizar o selo para abrir o envelope (SPEC-16, RF-16.1 a RF-16.3). Usa `pointerdown/move/up`
 * no botão que cobre o envelope e só começa se o dedo pousar sobre o selo; tocar em qualquer
 * outro ponto continua sendo um clique comum, e Enter e Espaço continuam abrindo. O selo acompanha o dedo
 * até `gesto.limite`, com resistência, só por `transform`; ao soltar além de `gesto.limiar` o
 * envelope abre, antes disso o selo volta ao lugar com uma mola curta.
 */
export function ligarGestoDoSelo({
  botao,
  selo,
  gesto,
  mola,
  reduzido,
  aoAbrir,
  signal,
}: OpcoesDoGestoDoSelo): GestoDoSelo {
  let ponteiro: number | undefined;
  let inicio = { x: 0, y: 0 };
  let arrastando = false;
  let distancia = 0;
  let arrastouRecentemente = false;

  /** O dedo precisa pousar sobre o selo, com uma folga: o selo é pequeno e o dedo, grande. */
  function sobreOSelo(x: number, y: number): boolean {
    const caixa = selo.getBoundingClientRect();
    const folga = gesto.folga;
    return (
      x >= caixa.left - folga &&
      x <= caixa.right + folga &&
      y >= caixa.top - folga &&
      y <= caixa.bottom + folga
    );
  }

  function seguir(dx: number, dy: number): void {
    if (reduzido) return;
    const fator =
      distancia === 0 ? 0 : deslocamentoComResistencia(distancia, gesto.limite) / distancia;
    gsap.set(selo, { x: dx * fator, y: Math.max(0, dy) * fator });
  }

  function voltar(duracao: number, curva: string): void {
    gsap.to(selo, { x: 0, y: 0, duration: duracao, ease: curva, overwrite: 'auto' });
  }

  /**
   * Capturar o ponteiro só serve para continuar recebendo os movimentos fora do botão. Se o
   * navegador recusar (ponteiro que já acabou, evento sintético), o gesto segue sem a captura:
   * um erro aqui levaria o convite inteiro ao modo de segurança, por causa de um enfeite.
   */
  function capturar(id: number): void {
    try {
      botao.setPointerCapture(id);
    } catch {
      // sem captura, o gesto funciona dentro do botão
    }
  }

  function liberar(id: number): void {
    try {
      if (botao.hasPointerCapture(id)) botao.releasePointerCapture(id);
    } catch {
      // o ponteiro já acabou
    }
  }

  function terminar(): void {
    if (ponteiro !== undefined) liberar(ponteiro);
    ponteiro = undefined;
    arrastando = false;
  }

  botao.addEventListener(
    'pointerdown',
    (evento) => {
      arrastouRecentemente = false;
      if (ponteiro !== undefined || !evento.isPrimary) return;
      if (!sobreOSelo(evento.clientX, evento.clientY)) return;
      ponteiro = evento.pointerId;
      inicio = { x: evento.clientX, y: evento.clientY };
      distancia = 0;
      capturar(evento.pointerId);
    },
    { signal },
  );

  botao.addEventListener(
    'pointermove',
    (evento) => {
      if (evento.pointerId !== ponteiro) return;
      const dx = evento.clientX - inicio.x;
      const dy = evento.clientY - inicio.y;
      distancia = distanciaDoGesto(dx, dy);
      // Andar menos que a folga ainda é um toque: o selo fica quieto até o dedo "decidir".
      if (!arrastando && Math.hypot(dx, dy) < gesto.folga) return;
      arrastando = true;
      seguir(dx, dy);
    },
    { signal },
  );

  botao.addEventListener(
    'pointerup',
    (evento) => {
      if (evento.pointerId !== ponteiro) return;
      const foiArrasto = arrastando;
      const abre = foiArrasto && gestoAbre(distancia, gesto.limiar);
      terminar();
      if (!foiArrasto) return; // um toque: o `click` cuida
      arrastouRecentemente = true;
      if (abre) {
        voltar(gesto.retorno / 2, 'power2.out');
        aoAbrir();
      } else {
        voltar(gesto.retorno, mola);
      }
    },
    { signal },
  );

  botao.addEventListener(
    'pointercancel',
    (evento) => {
      if (evento.pointerId !== ponteiro) return;
      const foiArrasto = arrastando;
      terminar();
      if (foiArrasto) voltar(gesto.retorno, mola);
    },
    { signal },
  );

  return {
    cliqueFoiArrasto() {
      const foi = arrastouRecentemente;
      arrastouRecentemente = false;
      return foi;
    },
  };
}
