/**
 * Matemática do gesto de deslizar o selo para abrir o envelope (SPEC-16). Pura: quem lê os
 * ponteiros e move o selo é a apresentação.
 */

/**
 * Quanto o dedo andou "para abrir": para baixo ou para o lado, nunca para cima (RF-16.1). O
 * deslocamento para cima não conta, então arrastar para o alto não abre nem afasta o selo.
 */
export function distanciaDoGesto(dx: number, dy: number): number {
  return Math.hypot(dx, Math.max(0, dy));
}

/**
 * Quanto o selo acompanha o dedo: cresce com a distância e se aproxima de `limite` sem passar
 * dele, o que dá a sensação de resistência (SPEC-16, "Deslizar para abrir"). Com a distância
 * igual ao limite o selo já andou cerca de três quartos dele.
 */
export function deslocamentoComResistencia(distancia: number, limite: number): number {
  if (distancia <= 0 || limite <= 0) return 0;
  return limite * Math.tanh(distancia / limite);
}

/** Soltar além do limiar abre o envelope; antes dele, o selo volta ao lugar. */
export function gestoAbre(distancia: number, limiar: number): boolean {
  return distancia >= limiar;
}
