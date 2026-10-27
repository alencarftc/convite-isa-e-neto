export interface ParametrosDeLeitura {
  /** Tempo mínimo de cada bloco, em segundos: até um ornamento merece uma pausa. */
  readonly base: number;
  /** Segundos a mais por caractere do texto. */
  readonly porCaractere: number;
  /** Teto: um parágrafo longo não segura o convite além disto. */
  readonly maximo: number;
}

/**
 * Quanto tempo um bloco da carta fica sozinho na tela antes de o próximo aparecer (ADR-0012): o
 * convidado lê com calma, sem que a carta caia de uma vez. Cresce com o tamanho do texto, até o teto.
 */
export function tempoDeLeitura(caracteres: number, parametros: ParametrosDeLeitura): number {
  if (!Number.isFinite(caracteres) || caracteres < 0) {
    throw new RangeError(`Número de caracteres inválido: ${String(caracteres)}`);
  }
  return Math.min(parametros.maximo, parametros.base + parametros.porCaractere * caracteres);
}
