import gsap from 'gsap';

import { criar, criarImagem } from '../dom';

export interface MetadesDoSelo {
  readonly esquerda: HTMLElement;
  readonly direita: HTMLElement;
  /** As duas imagens, iguais: a primeira a carregar avisa que o selo pode aparecer. */
  readonly imagens: readonly [HTMLImageElement, HTMLImageElement];
}

/**
 * O selo se parte em duas metades recortadas da mesma imagem (SPEC-06, RF-06.5; SPEC-16): a da
 * esquerda e a da direita, cada uma com o selo inteiro, vista só pela sua metade (`clip-path` na CSS).
 * Serve à entrada e ao envelope. As siglas I&D vêm na própria arte do selo e partem junto com ele.
 */
export function montarMetadesDoSelo(url: string, adiada = false): MetadesDoSelo {
  const montar = (lado: 'esquerda' | 'direita') => {
    const metade = criar('div', `selo__metade selo__metade--${lado}`);
    const imagem = criarImagem('selo__imagem', url, adiada);
    metade.append(imagem);
    return { metade, imagem };
  };
  const esquerda = montar('esquerda');
  const direita = montar('direita');
  return {
    esquerda: esquerda.metade,
    direita: direita.metade,
    imagens: [esquerda.imagem, direita.imagem],
  };
}

export interface ParametrosDoRompimento {
  /** Giro de cada metade, em graus, e queda, em pixels. */
  readonly giro: number;
  readonly queda: number;
  readonly duracao: number;
  /** Quanto cada metade se afasta para o seu lado, em pixels. */
  readonly afastamento: number;
  readonly curva: string;
}

/**
 * As metades giram em torno da borda do meio, afastam-se, caem e somem: o selo "estala". Devolve a
 * linha do tempo para quem a encaixa na sua.
 */
export function romperSelo(
  metades: Pick<MetadesDoSelo, 'esquerda' | 'direita'>,
  parametros: ParametrosDoRompimento,
): gsap.core.Timeline {
  const { giro, queda, duracao, afastamento, curva } = parametros;
  return gsap
    .timeline()
    .to(
      metades.esquerda,
      { rotation: -giro, x: -afastamento, y: queda, opacity: 0, duration: duracao, ease: curva },
      0,
    )
    .to(
      metades.direita,
      { rotation: giro, x: afastamento, y: queda, opacity: 0, duration: duracao, ease: curva },
      0,
    );
}
