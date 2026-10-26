import type { EventosConvite } from '@/domain/eventos/eventos-convite';

import type { BarramentoEventos } from '../barramento-eventos';
import type { EstadoConvite } from '../estado-convite';

export interface DependenciasDaVisita {
  readonly estado: EstadoConvite;
  readonly eventos: BarramentoEventos<EventosConvite>;
}

/**
 * Quando a carta termina de abrir, a visita fica registrada no aparelho (SPEC-06, RF-06.10): a
 * próxima abertura mostra "Pular para o convite" (SPEC-02) e dispensa a dica da história (SPEC-05).
 * Devolve a função que para de ouvir.
 */
export function registrarVisita({ estado, eventos }: DependenciasDaVisita): () => void {
  return eventos.on('convite:aberto', () => {
    estado.marcarVisitado();
  });
}
