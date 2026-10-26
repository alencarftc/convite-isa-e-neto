import { MS_POR_DIA, MS_POR_HORA, MS_POR_MINUTO } from '../tempo/tempo';

export interface Contagem {
  readonly dias: number;
  readonly horas: number;
  readonly minutos: number;
}

/** Par [singular, plural] de uma unidade de tempo. */
export type FormaDaUnidade = readonly [singular: string, plural: string];

export interface UnidadesDeTempo {
  readonly dia: FormaDaUnidade;
  readonly hora: FormaDaUnidade;
  readonly minuto: FormaDaUnidade;
}

/** Dias, horas e minutos inteiros até o casamento; nunca negativos (SPEC-07, RF-07.2). */
export function calcularContagem(agora: number, casamento: number): Contagem {
  const resto = Math.max(0, casamento - agora);
  return {
    dias: Math.floor(resto / MS_POR_DIA),
    horas: Math.floor((resto % MS_POR_DIA) / MS_POR_HORA),
    minutos: Math.floor((resto % MS_POR_HORA) / MS_POR_MINUTO),
  };
}

function comUnidade(quantidade: number, [singular, plural]: FormaDaUnidade): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

/**
 * Preenche o modelo de `content.contagem.antes`, que traz os marcadores
 * `{dias}`, `{horas}` e `{minutos}`, com singular e plural corretos.
 */
export function formatarContagem(
  contagem: Contagem,
  modelo: string,
  unidades: UnidadesDeTempo,
): string {
  return modelo
    .replace('{dias}', comUnidade(contagem.dias, unidades.dia))
    .replace('{horas}', comUnidade(contagem.horas, unidades.hora))
    .replace('{minutos}', comUnidade(contagem.minutos, unidades.minuto));
}
