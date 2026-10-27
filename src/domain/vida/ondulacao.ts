/** Parâmetros do motor de ondulação (SPEC-19), compartilhados pela água e pelo vento do casal (SPEC-22). */

export interface OndaDeOndulacao {
  /** Deslocamento máximo, em pixels de tela, onde a região vale 1 e a força é 1. */
  readonly amplitude: number;
  /** Ondas por altura da caixa, na base da região. */
  readonly frequencia: number;
  /** Ciclos por segundo. */
  readonly velocidade: number;
  readonly direcao: 'horizontal' | 'vertical';
  /** 0 = igual em toda a altura; 1 = metade da amplitude e o dobro da frequência no alto da região. */
  readonly perspectiva: number;
}

export interface ReflexosDaOndulacao {
  /** Cor dos reflexos, lida de um token da CSS (`--cor-luz`). */
  readonly cor: string;
  /** Fração dos pontos da textura de ruído que acendem, de 0 a 1. */
  readonly densidade: number;
  /** Centro da coluna de luz, como fração da largura da caixa. */
  readonly colunaDoSol: number;
  readonly larguraDaColuna: number;
}
