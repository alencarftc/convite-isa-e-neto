/**
 * Onde a ondulação age (SPEC-19, RF-19.4): fora da região o deslocamento é zero, então a mata ao fundo do lago
 * não se mexe, e o vento do casal mexe só no cabelo e na barra do vestido (SPEC-22). Todos os valores são frações
 * da caixa da imagem, de 0 a 1.
 */
export type RegiaoDeOndulacao =
  | {
      readonly tipo: 'faixa';
      /** Onde a região começa, contada de cima (0 = topo da caixa). */
      readonly inicio: number;
      /** Largura da transição suave: o deslocamento sobe de 0 a 1 entre `inicio` e `inicio + borda`. */
      readonly borda: number;
    }
  | {
      readonly tipo: 'elipse';
      readonly centro: readonly [number, number];
      /** Raio em cada eixo, como fração da largura e da altura da caixa. */
      readonly raio: readonly [number, number];
      /** Parte do raio, de fora para dentro, em que a força decai (1 = decai desde o centro). */
      readonly borda: number;
      /** Força no centro, de 0 a 1. */
      readonly intensidade: number;
    };

function dentroDeZeroAUm(valor: number, nome: string): void {
  if (!Number.isFinite(valor) || valor < 0 || valor > 1) {
    throw new RangeError(`${nome} precisa estar entre 0 e 1 (veio ${String(valor)})`);
  }
}

/** Recusa uma região com algum valor fora de 0..1; devolve a própria região, para encadear. CT-19.2. */
export function validarRegiao(regiao: RegiaoDeOndulacao): RegiaoDeOndulacao {
  if (regiao.tipo === 'faixa') {
    dentroDeZeroAUm(regiao.inicio, 'faixa.inicio');
    dentroDeZeroAUm(regiao.borda, 'faixa.borda');
    return regiao;
  }
  dentroDeZeroAUm(regiao.centro[0], 'elipse.centro[0]');
  dentroDeZeroAUm(regiao.centro[1], 'elipse.centro[1]');
  dentroDeZeroAUm(regiao.raio[0], 'elipse.raio[0]');
  dentroDeZeroAUm(regiao.raio[1], 'elipse.raio[1]');
  dentroDeZeroAUm(regiao.borda, 'elipse.borda');
  dentroDeZeroAUm(regiao.intensidade, 'elipse.intensidade');
  if (regiao.raio[0] === 0 || regiao.raio[1] === 0) {
    throw new RangeError('A elipse precisa de raio maior que zero');
  }
  return regiao;
}
