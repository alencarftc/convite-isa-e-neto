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

/**
 * O convite só anda para a frente (RF-01.8): uma fase nunca volta, as finais não têm saída,
 * e `informacoes` (pular, animação reduzida) e `seguranca` (erro) valem de qualquer fase.
 */
export function transicaoValida(de: Fase, para: Fase): boolean {
  if (ehFaseFinal(de)) return false;
  if (ehFaseFinal(para)) return true;
  return FASES.indexOf(para) > FASES.indexOf(de);
}

/** A próxima fase do caminho completo; as finais não têm próxima. */
export function proximaFase(fase: Fase): Fase | null {
  if (ehFaseFinal(fase)) return null;
  const proxima = FASES[FASES.indexOf(fase) + 1];
  return proxima ?? null;
}
