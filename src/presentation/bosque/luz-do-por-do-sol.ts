import gsap from 'gsap';

import { animarNoNavegador } from '../animacao/animar-no-navegador';
import { curvaCss } from '../animacao/curva-css';

/**
 * A luz do pôr do sol da cena: o céu do pôr do sol (`.camada--ceu-sol`, uma imagem opaca de tela cheia) e a luz quente por cima
 * (`.camada--luz`, de tela cheia, um degradê comum, sem mistura: ADR-0050). Ela sobe de 0 a 1 ao longo de toda a história (SPEC-05, RF-03.5).
 *
 * Pelo navegador, e não pelo GSAP (11/11/2026, ADR-0050): o GSAP reescrevia a opacidade das duas camadas a cada quadro durante os ~26 s da
 * história. `Element.animate` roda no compositor, sem JavaScript por quadro.
 *
 * Quando o céu do pôr do sol chega a 1 ele cobre o céu de baunilha por inteiro (as duas imagens são opacas), então o de baunilha sai de
 * cena: uma camada de tela cheia a menos, sem mudar nada do que se vê.
 */

const SELETOR_DAS_CAMADAS = '.camada--ceu-sol, .camada--luz';
const SELETOR_DO_CEU_COBERTO = '.camada--ceu';

const emCurso = new WeakMap<HTMLElement, Animation>();

function camadasDaLuz(raiz: ParentNode): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>(SELETOR_DAS_CAMADAS)];
}

/**
 * Começa o pôr do sol pelo navegador, partindo da opacidade que cada camada tem agora. Devolve `false` se não dá (navegador sem
 * `Element.animate`, ou sem as camadas): quem chamou usa o GSAP, como antes.
 */
export function iniciarLuzDoPorDoSol(
  raiz: ParentNode,
  duracaoEmSegundos: number,
  curva: string,
): boolean {
  const camadas = camadasDaLuz(raiz);
  const primeira = camadas[0];
  if (!primeira || typeof primeira.animate !== 'function') return false;
  for (const camada of camadas) {
    emCurso.get(camada)?.cancel();
    const de = Number.parseFloat(camada.style.opacity) || 0;
    const animacao = animarNoNavegador(camada, [{ opacity: de }, { opacity: 1 }], {
      duration: duracaoEmSegundos * 1000,
      easing: curvaCss(curva),
      fill: 'forwards',
    });
    animacao.onfinish = () => {
      concluirLuzDoPorDoSol(raiz);
    };
    emCurso.set(camada, animacao);
  }
  return true;
}

/** A opacidade do céu do pôr do sol agora (0 a 1), com o pôr do sol do navegador onde estiver. */
export function opacidadeDoCeuDoPorDoSol(raiz: ParentNode): number {
  const sol = raiz.querySelector<HTMLElement>('.camada--ceu-sol');
  if (!sol) return 0;
  // Com a animação do navegador o valor atual não está no estilo do elemento: só o estilo calculado o tem.
  const valor = emCurso.has(sol) ? getComputedStyle(sol).opacity : sol.style.opacity;
  return Number.parseFloat(valor) || 0;
}

/** Para o pôr do sol do navegador onde está (a opacidade volta ao que o estilo diz). Quem para decide o que vem depois. */
export function pararLuzDoPorDoSol(raiz: ParentNode): void {
  for (const camada of camadasDaLuz(raiz)) {
    emCurso.get(camada)?.cancel();
    emCurso.delete(camada);
  }
}

/** O pôr do sol completo, já: opacidade 1 no estilo, sem animação, e o céu de baunilha (coberto) fora do desenho. */
export function concluirLuzDoPorDoSol(raiz: ParentNode): void {
  const camadas = camadasDaLuz(raiz);
  pararLuzDoPorDoSol(raiz);
  if (camadas.length > 0) gsap.set(camadas, { opacity: 1 });
  esconderOCeuCoberto(raiz);
}

function esconderOCeuCoberto(raiz: ParentNode): void {
  const sol = raiz.querySelector<HTMLElement>('.camada--ceu-sol img');
  // Se a arte do pôr do sol não chegou, o céu de baunilha é o único céu que existe: fica.
  if (!(sol instanceof HTMLImageElement) || !sol.complete || sol.naturalWidth === 0) return;
  const ceu = raiz.querySelector<HTMLElement>(SELETOR_DO_CEU_COBERTO);
  if (ceu) ceu.style.visibility = 'hidden';
}
