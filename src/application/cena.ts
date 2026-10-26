/**
 * Contrato de toda cena (SPEC-01, RF-01.6). O contexto (`ctx`: raiz do DOM, textos, estado,
 * eventos, áudio) chega à fábrica de cada cena na raiz de composição, não por `init`: assim a
 * camada de aplicação não precisa conhecer o DOM.
 *
 * `R` é o que `run()` entrega; só a entrada devolve algo (a escolha do convidado).
 */
export interface Cena<R = void> {
  /** Monta o DOM da cena e prepara as timelines (pausadas). */
  init(): void;
  /** Toca a cena; resolve quando ela termina, inclusive a espera por um toque. */
  run(): Promise<R>;
  /** Leva a cena ao estado final, sem animação (Pular, animação reduzida, modo de segurança). */
  skip(): void;
  /** Remove ouvintes e desfaz as animações. Pode ser chamado mais de uma vez. */
  destroy(): void;
}
