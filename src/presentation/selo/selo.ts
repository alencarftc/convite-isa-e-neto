import gsap from 'gsap';

import { criarImagem } from '../dom';

/**
 * O selo de cera, inteiro (SPEC-06, RF-06.5; SPEC-16), na entrada e no envelope: uma imagem só, com as siglas I&D
 * em relevo na própria arte. Quem usa define o tamanho e a posição do selo. `adiada`: o `src` só entra quando a
 * etapa começa (`carregarImagensTardias`).
 */
export function montarImagemDoSelo(url: string, adiada = false): HTMLImageElement {
  return criarImagem('selo__imagem', url, adiada);
}

export interface ParametrosDaSoltura {
  /** Quanto o selo gira ao se soltar, em graus. */
  readonly giro: number;
  /** Quanto sobe, em pixels. */
  readonly subida: number;
  /** Escala que alcança antes de sumir. */
  readonly escala: number;
  readonly duracao: number;
  readonly curva: string;
}

/**
 * O selo se solta: levanta, cresce um pouco, gira de leve e se desfaz em luz (o clarão que sai de trás dele
 * é de quem chama). Não se parte: o selo do casal fica inteiro até o fim. Devolve a linha do tempo para quem a
 * encaixa na sua.
 */
export function soltarSelo(
  imagem: HTMLElement,
  parametros: ParametrosDaSoltura,
): gsap.core.Timeline {
  const { giro, subida, escala, duracao, curva } = parametros;
  return (
    gsap
      .timeline()
      .to(imagem, { y: -subida, scale: escala, rotation: giro, duration: duracao, ease: curva }, 0)
      // Começa a sumir quando já levantou: primeiro o gesto de soltar, depois o desfazer.
      .to(imagem, { opacity: 0, duration: duracao * 0.65, ease: curva }, duracao * 0.35)
  );
}
