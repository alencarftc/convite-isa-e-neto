/** Porta do relógio. O domínio e os casos de uso nunca chamam `Date.now()`. */
export interface Relogio {
  /** Instante atual, em ms desde 1970. */
  agora(): number;
}
