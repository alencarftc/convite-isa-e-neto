export interface Ponto {
  readonly x: number;
  readonly y: number;
}

export interface EntradaDoArco {
  /** Centro do arco: o chão sobre o qual ele se abre (a boca do baú, um pouco acima). */
  readonly centro: Ponto;
  /** Raio horizontal do arco, em pixels. */
  readonly raio: number;
  /** Quanto o arco é baixo: o raio vertical é `raio × achatamento`. */
  readonly achatamento: number;
  readonly quantidade: number;
}

/**
 * Onde cada estrela fica no arco sobre o baú (ADR-0026): da esquerda para a direita, num leque de 150° a 30° em
 * volta do centro, todas acima dele. Uma só estrela fica no ponto mais alto. A primeira memória acende a primeira
 * estrela, e assim por diante: o arco se completa com a última.
 */
export function posicoesDasEstrelas(entrada: EntradaDoArco): Ponto[] {
  const { centro, raio, achatamento, quantidade } = entrada;
  const inicio = (Math.PI * 5) / 6;
  const fim = Math.PI / 6;
  return Array.from({ length: quantidade }, (_, indice) => {
    const fracao = quantidade === 1 ? 0.5 : indice / (quantidade - 1);
    const angulo = inicio + (fim - inicio) * fracao;
    return {
      x: centro.x + raio * Math.cos(angulo),
      y: centro.y - raio * achatamento * Math.sin(angulo),
    };
  });
}
