import gsap from 'gsap';

import type { EstadoConvite } from '@/application/estado-convite';
import type { Capacidades } from '@/application/ports/capacidades';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { NivelAtivo } from '@/domain/vida/nivel';

import type { ElementoDeVida } from './elemento-de-vida';
import type { TickerDaVida } from './medidor-de-quadros';
import { criarOndulacao, type Ondulacao } from './ondulacao/ondulacao';
import { criarRelogioDaVida } from './relogio-da-vida';

export interface DependenciasDaAgua {
  readonly raiz: HTMLElement;
  readonly config: ConfigConvite;
  readonly estado: EstadoConvite;
  readonly capacidades: Pick<Capacidades, 'suportaWebGL'>;
  readonly ticker: TickerDaVida;
}

/** A camada do lago, onde o canvas entra, e o céu do pôr do sol, cuja opacidade manda no brilho. */
const SELETOR_DO_LAGO = '.camada--lago';
const SELETOR_DO_SOL = '.camada--ceu-sol';
/** Token da CSS com a cor dos reflexos (SPEC-03, "Luz"). */
const TOKEN_DA_LUZ = '--cor-luz';

/**
 * Água viva (SPEC-19): um canvas WebGL sobre a camada do lago faz a superfície ondular e cintilar, só na parte
 * de água (a mata ao fundo não se mexe). Os reflexos crescem com a opacidade do céu do pôr do sol, que a
 * história anima (SPEC-05); com Pular ela já é 1 e o brilho já nasce no máximo. Sem WebGL, ou se o contexto se
 * perder, o lago fica parado, como a pintura sempre foi: a imagem de baixo nunca é escondida.
 */
export function criarAgua(dependencias: DependenciasDaAgua): ElementoDeVida {
  const { raiz, config, estado, capacidades, ticker } = dependencias;
  const { vida, curvas } = config;
  const { agua } = vida;
  const relogio = criarRelogioDaVida();

  let ondulacao: Ondulacao | undefined;
  let nivel: NivelAtivo = 'completo';
  let parada = false;
  let pausada = false;
  /** Tempo da água, em segundos: só anda enquanto ela desenha, então pausar não dá salto ao voltar. */
  let tempo = 0;
  let desdeOUltimoDesenho = 0;
  let primeiroQuadro = true;
  let orientacao = estado.orientacao;
  let imagemDoLago: HTMLImageElement | undefined;
  let observador: ResizeObserver | undefined;
  let pararDeOuvirEstado: (() => void) | undefined;

  function resolucaoDoNivel(): number {
    return nivel === 'leve' ? vida.leve.resolucaoDaAgua : vida.completo.resolucaoDaAgua;
  }

  /** Brilho dos reflexos: do mínimo ao máximo conforme o céu passa ao pôr do sol (RF-19.5). */
  function brilhoAtual(): number {
    const sol = raiz.querySelector<HTMLElement>(SELETOR_DO_SOL);
    // O GSAP escreve a opacidade no estilo da própria camada; ler dali evita forçar o cálculo de estilo a cada quadro.
    const opacidade = Number.parseFloat(sol?.style.opacity ?? '') || 0;
    const { brilhoMinimo, brilhoMaximo } = agua.reflexos;
    return brilhoMinimo + (brilhoMaximo - brilhoMinimo) * Math.min(1, Math.max(0, opacidade));
  }

  function desenhar(): void {
    ondulacao?.desenhar({ tempo, brilho: brilhoAtual(), forca: 1 });
  }

  function aoQuadro(_tempoDoTicker: number, intervaloEmMs: number): void {
    const intervalo = intervaloEmMs / 1000;
    tempo += intervalo;
    desdeOUltimoDesenho += intervalo;
    // No nível leve a água se redesenha a `quadrosDaAgua` por segundo; a tolerância de 10% não deixa um
    // quadro de 17 ms virar 20 quadros por segundo.
    if (nivel === 'leve' && desdeOUltimoDesenho < (1 / vida.leve.quadrosDaAgua) * 0.9) return;
    desdeOUltimoDesenho = 0;
    desenhar();
    if (!primeiroQuadro) return;
    primeiroQuadro = false;
    // O canvas só aparece depois do primeiro quadro desenhado (RF-19.6); o primeiro quadro é idêntico à imagem.
    if (ondulacao) {
      relogio.iniciar(
        gsap.to(ondulacao.canvas, { opacity: 1, duration: agua.aparece, ease: curvas.suave }),
      );
    }
  }

  function aoMudarEstado(): void {
    if (estado.orientacao === orientacao) return;
    orientacao = estado.orientacao;
    ondulacao?.definirRegioes([agua.regiao[orientacao]]);
  }

  /** O navegador trocou a arte do `<picture>` (girou o aparelho): a textura é a nova imagem (RF-19.2). */
  function aoCarregarAImagem(): void {
    if (!ondulacao) return;
    ondulacao.recarregarTextura();
    ondulacao.redimensionar();
  }

  function construir(): void {
    if (parada || ondulacao) return;
    const lago = raiz.querySelector<HTMLElement>(SELETOR_DO_LAGO);
    const imagem = lago?.querySelector('img');
    if (!lago || !imagem) return;
    if (imagem.naturalWidth === 0) {
      // A imagem do lago é crítica e já está pronta; se não estiver, espera o `load`.
      imagem.addEventListener('load', construir, { once: true });
      imagemDoLago = imagem;
      return;
    }
    const criada = criarOndulacao({
      conteiner: lago,
      imagem,
      ajuste: 'cover',
      regioes: [agua.regiao[orientacao]],
      onda: agua.onda,
      reflexos: {
        ...agua.reflexos,
        cor: getComputedStyle(document.documentElement).getPropertyValue(TOKEN_DA_LUZ),
      },
      resolucao: resolucaoDoNivel(),
      // O contexto se perdeu: a água para e o canvas sai; o lago volta a ser a imagem parada (RF-19.7).
      aoPerderOContexto: parar,
    });
    if (!criada) return;
    ondulacao = criada;
    imagemDoLago = imagem;
    criada.canvas.style.opacity = '0';
    imagem.addEventListener('load', aoCarregarAImagem);
    if (typeof ResizeObserver !== 'undefined') {
      observador = new ResizeObserver(() => {
        ondulacao?.redimensionar();
      });
      observador.observe(lago);
    }
    pararDeOuvirEstado = estado.aoMudar(aoMudarEstado);
    if (!pausada) ticker.add(aoQuadro);
  }

  function parar(): void {
    if (parada) return;
    parada = true;
    ticker.remove(aoQuadro);
    relogio.parar();
    observador?.disconnect();
    observador = undefined;
    imagemDoLago?.removeEventListener('load', construir);
    imagemDoLago?.removeEventListener('load', aoCarregarAImagem);
    pararDeOuvirEstado?.();
    pararDeOuvirEstado = undefined;
    ondulacao?.destruir();
    ondulacao = undefined;
  }

  return {
    iniciar(nivelInicial) {
      // Sem WebGL a água não roda em nenhum nível: o resto da cena segue (SPEC-18, "Níveis").
      if (!capacidades.suportaWebGL()) return;
      nivel = nivelInicial;
      if (agua.primeiroEm > 0) relogio.depois(agua.primeiroEm, construir);
      else construir();
    },

    aoMudarNivel(novo) {
      nivel = novo;
      ondulacao?.definirResolucao(resolucaoDoNivel());
    },

    pausar() {
      pausada = true;
      ticker.remove(aoQuadro);
      relogio.pausar();
    },

    retomar() {
      pausada = false;
      relogio.retomar();
      if (ondulacao) ticker.add(aoQuadro);
    },

    parar,
  };
}
