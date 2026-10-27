import gsap from 'gsap';

import type { ConfigConvite } from '@/domain/config/config-convite';
import { planejarBando, type PlanoDoPassaro } from '@/domain/vida/passaros';
import { type Aleatorio, sortearEntre } from '@/domain/vida/sorteio';

import type { ElementoDeVida } from './elemento-de-vida';
import { criarRelogioDaVida } from './relogio-da-vida';

export interface DependenciasDosPassaros {
  readonly raiz: HTMLElement;
  readonly config: ConfigConvite;
  readonly aleatorio?: Aleatorio;
}

const NAMESPACE_SVG = 'http://www.w3.org/2000/svg';
/** Quanto o bando começa e termina fora da tela, em pixels. */
const MARGEM_FORA_DA_TELA = 60;

/** Um "v" visto de longe: duas asas curvas que saem do corpo, na origem, e sobem. */
function asas(largura: number): string {
  const metade = largura / 2;
  return `M0 0Q${String(-metade / 2)} ${String(-largura * 0.35)} ${String(-metade)} ${String(-largura * 0.05)}M0 0Q${String(metade / 2)} ${String(-largura * 0.35)} ${String(metade)} ${String(-largura * 0.05)}`;
}

function criarPassaro(plano: PlanoDoPassaro): { passaro: SVGGElement; asas: SVGPathElement } {
  const passaro = document.createElementNS(NAMESPACE_SVG, 'g');
  const corpo = document.createElementNS(NAMESPACE_SVG, 'path');
  corpo.setAttribute('class', 'passaro');
  corpo.setAttribute('d', asas(plano.largura));
  passaro.append(corpo);
  return { passaro, asas: corpo };
}

/**
 * Pássaros que cruzam o céu em bandos pequenos (SPEC-20): pinceladas em "v" desenhadas no código, num único
 * `<svg>` por bando dentro do espaço do céu. Cada um bate as asas (`scaleY`) defasado dos outros e, em parte dos
 * bandos, planam um instante no meio do caminho. Nunca há dois bandos ao mesmo tempo.
 */
export function criarPassaros(dependencias: DependenciasDosPassaros): ElementoDeVida {
  const { raiz, config, aleatorio = Math.random } = dependencias;
  const { passaros: parametros } = config.vida;
  const { curvas } = config;
  const relogio = criarRelogioDaVida();
  let noAr = false;
  let aguardando = false;
  let parado = false;

  /** As batidas de asas entre dois instantes da travessia: sobem e descem em `periodo`, a partir de `inicio`. */
  function bater(
    ave: gsap.core.Timeline,
    asasDoPassaro: SVGPathElement,
    plano: PlanoDoPassaro,
    de: number,
    ate: number,
    escalaInicial: number,
  ): void {
    const meioPeriodo = plano.periodo / 2;
    const batidas = Math.floor((ate - de) / meioPeriodo);
    if (batidas < 1) return;
    ave.fromTo(
      asasDoPassaro,
      { scaleY: escalaInicial },
      {
        scaleY: parametros.asas.escalaMinima,
        duration: meioPeriodo,
        repeat: batidas - 1,
        yoyo: true,
        ease: curvas.suave,
        transformOrigin: '50% 100%',
      },
      de,
    );
  }

  function lancar(): void {
    const conteiner = raiz.querySelector('.vida--ceu');
    if (!conteiner || noAr) return;
    const plano = planejarBando(aleatorio, parametros);
    const { innerWidth: largura, innerHeight: altura } = window;
    const svg = document.createElementNS(NAMESPACE_SVG, 'svg');
    svg.setAttribute('class', 'bando');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('width', String(largura));
    svg.setAttribute('height', String(altura));
    conteiner.append(svg);
    noAr = true;

    const sentido = plano.entra === 'esquerda' ? 1 : -1;
    const bando = gsap.timeline({
      onComplete: () => {
        svg.remove();
        noAr = false;
        if (aguardando) {
          aguardando = false;
          proximo();
        }
      },
    });
    for (const dados of plano.passaros) {
      const { passaro, asas: asasDoPassaro } = criarPassaro(dados);
      svg.append(passaro);
      const inicio =
        plano.entra === 'esquerda' ? -MARGEM_FORA_DA_TELA : largura + MARGEM_FORA_DA_TELA;
      const base = plano.faixa * altura + dados.desvio.y;
      const { amplitude, ciclos } = plano.ondulacao;
      gsap.set(passaro, { x: inicio - sentido * dados.desvio.x, y: base });
      const ave = gsap.timeline();
      ave
        // Atravessa a tela de um lado ao outro em linha reta...
        .to(
          passaro,
          {
            x: inicio + sentido * (largura + 2 * MARGEM_FORA_DA_TELA),
            duration: dados.duracao,
            ease: curvas.linear,
          },
          0,
        )
        // ...com uma leve ondulação vertical.
        .fromTo(
          passaro,
          { y: base - amplitude },
          {
            y: base + amplitude,
            duration: dados.duracao / (ciclos * 2),
            repeat: ciclos * 2 - 1,
            yoyo: true,
            ease: curvas.suave,
          },
          0,
        );
      // A fase de cada um: começa com as asas num ponto diferente da batida.
      const escalaInicial = 1 + (parametros.asas.escalaMinima - 1) * dados.fase;
      if (plano.planar) {
        const { duracao: pausa, escala } = parametros.planar;
        const meio = dados.duracao / 2 - pausa / 2;
        bater(ave, asasDoPassaro, dados, 0, meio, escalaInicial);
        ave.to(asasDoPassaro, { scaleY: escala, duration: pausa / 4, ease: curvas.suave }, meio);
        bater(ave, asasDoPassaro, dados, meio + pausa, dados.duracao, escala);
      } else {
        bater(ave, asasDoPassaro, dados, 0, dados.duracao, escalaInicial);
      }
      bando.add(ave, 0);
    }
    relogio.iniciar(bando);
  }

  /** Um bando a cada intervalo sorteado; se o anterior ainda atravessa, espera ele acabar. */
  function proximo(): void {
    if (parado) return;
    if (noAr) {
      aguardando = true;
      return;
    }
    lancar();
    relogio.depois(sortearEntre(parametros.intervalo, aleatorio), proximo);
  }

  return {
    iniciar() {
      relogio.depois(parametros.primeiroEm, proximo);
    },
    // A vida dos pássaros é a mesma nos dois níveis (SPEC-18, "Níveis").
    aoMudarNivel() {
      /* nada muda */
    },
    pausar: relogio.pausar,
    retomar: relogio.retomar,
    parar() {
      parado = true;
      relogio.parar();
      for (const svg of raiz.querySelectorAll('.bando')) svg.remove();
      noAr = false;
    },
  };
}
