import { DESLOCAMENTO_BRASILIA_MS } from './tempo';

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const DIAS_DA_SEMANA = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const;

/** Relógio de parede de Brasília para o instante, lido sem depender do fuso do aparelho. */
function emBrasilia(instante: number): Date {
  return new Date(instante + DESLOCAMENTO_BRASILIA_MS);
}

/** `22 de janeiro de 2027`, no horário de Brasília (como o convite escreve as datas). */
export function dataPorExtenso(instante: number): string {
  const data = emBrasilia(instante);
  const mes = MESES[data.getUTCMonth()] ?? '';
  return `${String(data.getUTCDate())} de ${mes} de ${String(data.getUTCFullYear())}`;
}

/** `sexta-feira`, no horário de Brasília. */
export function diaDaSemana(instante: number): string {
  return DIAS_DA_SEMANA[emBrasilia(instante).getUTCDay()] ?? '';
}

/** `17h` ou `17h30`, no horário de Brasília. */
export function horaCurta(instante: number): string {
  const data = emBrasilia(instante);
  const minutos = data.getUTCMinutes();
  const hora = `${String(data.getUTCHours())}h`;
  return minutos === 0 ? hora : `${hora}${String(minutos).padStart(2, '0')}`;
}
