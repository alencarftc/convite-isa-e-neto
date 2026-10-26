/** Porta do tempo corrido: esperas e limites. O domínio e os casos de uso nunca chamam `setTimeout`. */
export interface Temporizador {
  /** Resolve depois de `segundos`. */
  esperar(segundos: number): Promise<void>;
}
