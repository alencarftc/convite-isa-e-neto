import type { TickerDaVida } from '@/presentation/vida/medidor-de-quadros';

export interface TickerFalso extends TickerDaVida {
  /** Dispara um quadro: cada escuta recebe o tempo acumulado (s) e o intervalo (ms). */
  quadro: (intervaloEmMs: number) => void;
  /** Quantas escutas estão registradas. */
  escutas: () => number;
}

/** Ticker que só anda quando o teste dispara um quadro, para medir quadros lentos e rápidos sem relógio. */
export function criarTickerFalso(): TickerFalso {
  const escutas = new Set<(tempo: number, intervalo: number) => void>();
  let tempo = 0;
  return {
    add: (escuta) => {
      escutas.add(escuta);
    },
    remove: (escuta) => {
      escutas.delete(escuta);
    },
    quadro(intervaloEmMs) {
      tempo += intervaloEmMs / 1000;
      for (const escuta of [...escutas]) escuta(tempo, intervaloEmMs);
    },
    escutas: () => escutas.size,
  };
}
