import gsap from 'gsap';

import { criarPetala, estaPronta } from './petalas';

export interface OpcoesDePetalas {
  /** Elemento posicionado (relative ou absolute) onde as pétalas nascem e flutuam. */
  readonly conteiner: HTMLElement;
  /** Imagens já pedidas ao navegador; só as que terminaram de carregar entram (RF-04.9). */
  readonly imagens: readonly HTMLImageElement[];
  readonly quantidade: number;
  /** Ponto de origem, em porcentagem do contêiner (a boca do baú, a dobra da carta…). */
  readonly origem: { readonly x: string; readonly y: string };
  /** Largura de cada pétala em relação ao contêiner, como `12%`. */
  readonly largura: string;
  readonly subida: number;
  readonly deriva: number;
  readonly duracao: number;
  readonly curva: string;
}

/**
 * Pétalas azuis que sobem e se desfazem (SPEC-04, RF-04.9; reaproveitada pela SPEC-06). Cada uma
 * é um clone de uma das variações, com subida, desvio e giro sorteados; só `transform` e `opacity`.
 * Sem nenhuma imagem pronta, devolve uma linha do tempo vazia e a cena segue sem pétalas.
 */
export function soltarPetalas(opcoes: OpcoesDePetalas): gsap.core.Timeline {
  const { conteiner, imagens, quantidade, origem, largura, subida, deriva, duracao, curva } =
    opcoes;
  const linha = gsap.timeline();
  const prontas = imagens.filter(estaPronta);
  if (prontas.length === 0) return linha;

  for (let indice = 0; indice < quantidade; indice += 1) {
    const modelo = prontas[indice % prontas.length];
    if (!modelo) continue;
    const petala = criarPetala(modelo, largura);
    petala.style.left = origem.x;
    petala.style.top = origem.y;
    conteiner.append(petala);

    const atraso = (indice / quantidade) * duracao * 0.35;
    const alvoX = gsap.utils.random(-deriva, deriva);
    const alvoY = -subida * gsap.utils.random(0.6, 1);
    linha
      .fromTo(
        petala,
        { opacity: 0, scale: 0.5, x: 0, y: 0, rotation: gsap.utils.random(-40, 40) },
        {
          opacity: 1,
          scale: gsap.utils.random(0.8, 1.1),
          x: alvoX,
          y: alvoY,
          rotation: gsap.utils.random(-160, 160),
          duration: duracao,
          ease: curva,
        },
        atraso,
      )
      // Some no último terço da subida.
      .to(
        petala,
        { opacity: 0, duration: duracao * 0.35, ease: 'power1.in' },
        atraso + duracao * 0.65,
      )
      .call(
        () => {
          petala.remove();
        },
        [],
        atraso + duracao,
      );
  }
  return linha;
}
