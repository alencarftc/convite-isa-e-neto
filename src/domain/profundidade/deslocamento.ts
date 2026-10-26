/**
 * Deslocamento de uma camada que acompanha o ponteiro (SPEC-03, RF-03.3). O ponteiro em `posicao`
 * (de 0 a `tamanho`) vira um valor de -1 a 1; a camada anda no sentido oposto, até `maximo`
 * multiplicado pela profundidade (as mais próximas, de profundidade maior, se movem mais).
 */
export function deslocamentoPorPonteiro(
  posicao: number,
  tamanho: number,
  maximo: number,
  profundidade: number,
): number {
  if (tamanho <= 0) return 0;
  const normalizado = Math.min(1, Math.max(-1, (posicao / tamanho) * 2 - 1));
  // `+ 0` evita o -0 quando o ponteiro está exatamente no centro.
  return -normalizado * maximo * profundidade + 0;
}
