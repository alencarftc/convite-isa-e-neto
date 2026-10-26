export interface EntradaDePosicoes {
  readonly alturaDaTela: number;
  readonly alturaDoBalao: number;
  /** Altura de leitura, em fração da tela contada de baixo para cima (0,62). */
  readonly fracaoDaSaida: number;
  /** Quanto o balão sobe durante a leitura, em fração da altura da tela (0,08). */
  readonly fracaoDaLeitura: number;
  /** Espaço mínimo entre o topo do balão e o alto da tela, em pixels. */
  readonly margem: number;
}

export interface PosicoesDoBalao {
  /** Centro do balão ao fim da saída da boca do baú, em pixels a partir do topo. */
  readonly saida: number;
  /** Centro ao fim da leitura (já subiu mais um pouco). */
  readonly leitura: number;
  /** Centro quando o balão já saiu pelo alto. */
  readonly fora: number;
}

/**
 * Alturas verticais de um balão (SPEC-05, "Linha do tempo de um balão"), contadas do topo da tela.
 * Em telas baixas (celular deitado) a subida é limitada pela altura disponível: o topo do balão
 * nunca passa da margem, e a frase, que fica logo abaixo, nunca sai da tela (casos de borda).
 */
export function posicoesDoBalao(entrada: EntradaDePosicoes): PosicoesDoBalao {
  const { alturaDaTela, alturaDoBalao, fracaoDaSaida, fracaoDaLeitura, margem } = entrada;
  const subidaDaLeitura = alturaDaTela * fracaoDaLeitura;
  const centroMaisAltoPermitido = margem + alturaDoBalao / 2;
  const saida = Math.max(
    alturaDaTela * (1 - fracaoDaSaida),
    centroMaisAltoPermitido + subidaDaLeitura,
  );
  return {
    saida,
    leitura: saida - subidaDaLeitura,
    fora: -alturaDoBalao,
  };
}
