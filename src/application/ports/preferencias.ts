/** Preferências do convidado guardadas no aparelho (SPEC-01, `lerPreferencia`). */
export interface ChavesDePreferencia {
  /** O som está ligado? (SPEC-08) */
  readonly 'convite:som': boolean;
  /** O convidado já abriu o convite neste aparelho? (SPEC-09) */
  readonly 'convite:visitado': boolean;
}

/**
 * Porta de armazenamento. Se o armazenamento falhar (navegação privada, navegador
 * interno restrito), `ler` devolve o padrão e `gravar` não faz nada.
 */
export interface Preferencias {
  ler<K extends keyof ChavesDePreferencia>(
    chave: K,
    padrao: ChavesDePreferencia[K],
  ): ChavesDePreferencia[K];
  gravar<K extends keyof ChavesDePreferencia>(chave: K, valor: ChavesDePreferencia[K]): void;
}
