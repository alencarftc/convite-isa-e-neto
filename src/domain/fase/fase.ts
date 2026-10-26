/** Fases do orquestrador (SPEC-01, "Comportamento: estados do orquestrador"). */
export const FASES = [
  'carregando',
  'aguardando-entrada',
  'bosque',
  'aguardando-bau',
  'bau',
  'historia',
  'carta',
  'aguardando-selo',
  'convite',
  'informacoes',
  'seguranca',
] as const;

export type Fase = (typeof FASES)[number];

const FASES_FINAIS: readonly Fase[] = ['informacoes', 'seguranca'];

/** Fases das quais o convite não sai mais (estado final ou modo de segurança). */
export function ehFaseFinal(fase: Fase): boolean {
  return FASES_FINAIS.includes(fase);
}

/** A próxima fase do caminho completo; as finais não têm próxima. */
export function proximaFase(fase: Fase): Fase | null {
  if (ehFaseFinal(fase)) return null;
  const proxima = FASES[FASES.indexOf(fase) + 1];
  return proxima ?? null;
}
