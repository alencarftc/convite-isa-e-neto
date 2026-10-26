import gsap from 'gsap';

import { criarPetala, estaPronta } from './petalas';

export interface OpcoesDaChuva {
  /** Elemento posicionado que cobre a tela, onde as pétalas caem. */
  readonly conteiner: HTMLElement;
  /** Variações já pedidas ao navegador; só as que terminaram de carregar entram. */
  readonly imagens: readonly HTMLImageElement[];
  readonly quantidade: number;
  readonly largura: string;
  /** Altura do contêiner, em pixels, para calcular a queda. */
  readonly altura: number;
  /** Queda mínima e máxima, em fração da altura (0,4 a 0,6). */
  readonly quedaMinima: number;
  readonly quedaMaxima: number;
  /** Balanço lateral, em pixels. */
  readonly balanco: number;
  /** Giro máximo, em graus. */
  readonly rotacao: number;
  readonly duracao: number;
  readonly curva: string;
}

/**
 * Pétalas azuis que caem devagar pela tela e somem (SPEC-06, "Pétalas"): posição inicial sorteada no
 * alto, queda de 40% a 60% da altura, balanço lateral e giro. Mesma ideia da função de subida do baú
 * (`soltarPetalas`, SPEC-04), na direção contrária. Sem variações carregadas, não faz nada.
 */
export function chuvaDePetalas(opcoes: OpcoesDaChuva): gsap.core.Timeline {
  const { conteiner, imagens, quantidade, largura, altura, quedaMinima, quedaMaxima } = opcoes;
  const linha = gsap.timeline();
  const prontas = imagens.filter(estaPronta);
  if (prontas.length === 0) return linha;

  for (let indice = 0; indice < quantidade; indice += 1) {
    const modelo = prontas[indice % prontas.length];
    if (!modelo) continue;
    const petala = criarPetala(modelo, largura, 'petala--chuva');
    petala.style.left = `${String(gsap.utils.random(5, 95))}%`;
    petala.style.top = '0';
    conteiner.append(petala);

    const queda = altura * gsap.utils.random(quedaMinima, quedaMaxima);
    const atraso = (indice / quantidade) * opcoes.duracao * 0.5;
    linha
      .fromTo(
        petala,
        { opacity: 0, y: -20, x: 0, rotation: gsap.utils.random(-40, 40) },
        {
          opacity: 1,
          y: queda,
          x: gsap.utils.random(-opcoes.balanco, opcoes.balanco),
          rotation: gsap.utils.random(-opcoes.rotacao, opcoes.rotacao),
          duration: opcoes.duracao,
          ease: opcoes.curva,
        },
        atraso,
      )
      .to(
        petala,
        { opacity: 0, duration: opcoes.duracao * 0.3, ease: 'power1.in' },
        atraso + opcoes.duracao * 0.7,
      )
      .call(
        () => {
          petala.remove();
        },
        [],
        atraso + opcoes.duracao,
      );
  }
  return linha;
}
