import { diaEmBrasilia } from '../tempo/tempo';

/** Os quatro estados do convite por data (SPEC-07, "Estados por data"). */
export type EstadoPorData = 'antes-do-prazo' | 'depois-do-prazo' | 'no-dia' | 'depois';

export interface DatasDoConvite {
  /** Instante do casamento, em ms. */
  readonly casamento: number;
  /** Último instante em que a confirmação de presença é aceita, em ms. */
  readonly prazoConfirmacao: number;
}

export function calcularEstadoPorData(agora: number, datas: DatasDoConvite): EstadoPorData {
  const diaAgora = diaEmBrasilia(agora);
  const diaDoCasamento = diaEmBrasilia(datas.casamento);

  if (diaAgora > diaDoCasamento) return 'depois';
  if (diaAgora === diaDoCasamento) return 'no-dia';
  return agora <= datas.prazoConfirmacao ? 'antes-do-prazo' : 'depois-do-prazo';
}
