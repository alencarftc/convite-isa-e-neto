export type Orientacao = 'vertical' | 'horizontal';

/** O que o aparelho informa sobre o próprio ambiente (SPEC-01, `state`). */
export interface Ambiente {
  /** O convidado pediu menos movimento (`prefers-reduced-motion`). */
  animacaoReduzida(): boolean;
  /** O aparelho é de toque (`pointer: coarse`); define a dica da chave (SPEC-04). */
  porToque(): boolean;
  orientacao(): Orientacao;
  /** Avisa quando o aparelho gira; devolve a função que cancela o aviso. */
  aoMudarOrientacao(escuta: (orientacao: Orientacao) => void): () => void;
}
