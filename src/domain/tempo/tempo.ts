export const MS_POR_MINUTO = 60_000;
export const MS_POR_HORA = 60 * MS_POR_MINUTO;
export const MS_POR_DIA = 24 * MS_POR_HORA;

/** Brasília (UTC−3) não tem horário de verão desde 2019: o deslocamento é fixo. */
const DESLOCAMENTO_BRASILIA_MS = -3 * MS_POR_HORA;

const COM_FUSO_EXPLICITO = /(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Converte uma data ISO em instante (ms desde 1970). Exige fuso explícito, para o
 * resultado nunca depender do fuso do aparelho (SPEC-07, RF-07.1).
 */
export function analisarInstante(iso: string): number {
  if (!COM_FUSO_EXPLICITO.test(iso)) {
    throw new RangeError(`Data sem fuso explícito: "${iso}"`);
  }
  const instante = Date.parse(iso);
  if (Number.isNaN(instante)) {
    throw new RangeError(`Data inválida: "${iso}"`);
  }
  return instante;
}

/** Dia civil em Brasília no formato AAAA-MM-DD. */
export function diaEmBrasilia(instante: number): string {
  return new Date(instante + DESLOCAMENTO_BRASILIA_MS).toISOString().slice(0, 10);
}

/** Milissegundos até a próxima virada de minuto (sempre entre 1 e 60 000). */
export function msAteProximoMinuto(instante: number): number {
  return MS_POR_MINUTO - (instante % MS_POR_MINUTO);
}
