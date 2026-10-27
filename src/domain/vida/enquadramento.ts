/**
 * Enquadramento de uma imagem numa caixa, como o `object-fit` da CSS (SPEC-19, RF-19.3): a matemática que o
 * motor de ondulação usa para pôr o canvas pixel a pixel sobre a imagem que o navegador desenhou.
 */

export interface Dimensoes {
  readonly largura: number;
  readonly altura: number;
}

export interface OpcoesDeEnquadramento {
  readonly imagem: Dimensoes;
  readonly caixa: Dimensoes;
  /** Onde a imagem se ancora na caixa, de 0 a 1 em cada eixo (0,5 = centro, como `object-position`). */
  readonly posicao?: readonly [number, number];
  /** `cover` preenche a caixa e corta o que sobra; `contain` cabe inteira e deixa faixas vazias. */
  readonly ajuste?: 'cover' | 'contain';
}

export interface AjusteDeTextura {
  /** `coordenadaDaTextura = coordenadaDaCaixa * escala + deslocamento`, com a caixa e a textura em 0..1. */
  readonly escala: readonly [number, number];
  readonly deslocamento: readonly [number, number];
}

/**
 * Como ler a textura para cada ponto da caixa. No `cover` a escala é menor que 1 num dos eixos (só uma parte da
 * imagem aparece) e o deslocamento a centra; no `contain` a escala passa de 1 e o deslocamento é negativo (a
 * imagem ocupa só uma faixa da caixa, e o que cai fora de 0..1 é vazio). CT-19.1.
 */
export function ajusteDeCobertura(opcoes: OpcoesDeEnquadramento): AjusteDeTextura {
  const { imagem, caixa, posicao = [0.5, 0.5], ajuste = 'cover' } = opcoes;
  if (imagem.largura <= 0 || imagem.altura <= 0 || caixa.largura <= 0 || caixa.altura <= 0) {
    throw new RangeError('A imagem e a caixa precisam ter largura e altura positivas');
  }
  const razaoX = caixa.largura / imagem.largura;
  const razaoY = caixa.altura / imagem.altura;
  const razao = ajuste === 'cover' ? Math.max(razaoX, razaoY) : Math.min(razaoX, razaoY);
  // Fração da imagem que a caixa mostra em cada eixo.
  const fracaoX = caixa.largura / (imagem.largura * razao);
  const fracaoY = caixa.altura / (imagem.altura * razao);
  return {
    escala: [fracaoX, fracaoY],
    deslocamento: [(1 - fracaoX) * posicao[0], (1 - fracaoY) * posicao[1]],
  };
}
