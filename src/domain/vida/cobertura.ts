/**
 * Quando a carta esconde a cena (SPEC-18, RF-18.4): a cena fica fixa por trás e a carta, opaca, rola por
 * cima. Enquanto a cena não aparece, não precisa se mover.
 */

/**
 * Fração da altura da janela em que a cena ainda aparece acima do conteúdo: 1 com o conteúdo na base da
 * janela (ou abaixo dela), 0 com o topo dele no alto da janela (ou acima). CT-18.3.
 */
export function fracaoVisivelDaCena(topoDoConteudo: number, alturaDaJanela: number): number {
  if (alturaDaJanela <= 0) return 1; // sem medida, não há motivo para pausar
  return Math.min(1, Math.max(0, topoDoConteudo / alturaDaJanela));
}

/**
 * A carta só esconde a cena se cobre quase a largura da janela. Em telas largas ela é uma coluna e o lago
 * continua à vista dos lados: pausar ali deixaria a água e as folhas congeladas à vista de todos.
 */
export function cartaCobreALargura(
  larguraDaCarta: number,
  larguraDaJanela: number,
  fracaoMinima: number,
): boolean {
  if (larguraDaJanela <= 0) return true;
  return larguraDaCarta / larguraDaJanela >= fracaoMinima;
}
