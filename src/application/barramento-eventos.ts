type Escuta<D> = (dados: D) => void;

/** Eventos sem dados (`undefined`) não recebem argumento em `emit`. */
type ArgumentosDoEvento<D> = [D] extends [undefined] ? [] : [D];

/**
 * Barramento de eventos tipado (SPEC-01, RF-01.7). Quem escuta é chamado na
 * ordem de registro; um erro numa escuta sobe a quem emitiu, e o orquestrador
 * o transforma em modo de segurança.
 */
export interface BarramentoEventos<E> {
  /** Registra a escuta e devolve a função que a remove. */
  on<K extends keyof E>(evento: K, escuta: Escuta<E[K]>): () => void;
  off<K extends keyof E>(evento: K, escuta: Escuta<E[K]>): void;
  emit<K extends keyof E>(evento: K, ...dados: ArgumentosDoEvento<E[K]>): void;
}

export function criarBarramento<E extends object>(): BarramentoEventos<E> {
  const escutas = new Map<keyof E, Set<Escuta<unknown>>>();

  function off<K extends keyof E>(evento: K, escuta: Escuta<E[K]>): void {
    escutas.get(evento)?.delete(escuta as Escuta<unknown>);
  }

  return {
    on(evento, escuta) {
      const conjunto = escutas.get(evento) ?? new Set<Escuta<unknown>>();
      conjunto.add(escuta as Escuta<unknown>);
      escutas.set(evento, conjunto);
      return () => {
        off(evento, escuta);
      };
    },
    off,
    emit(evento, ...dados) {
      const conjunto = escutas.get(evento);
      if (!conjunto) return;
      const dado = (dados as readonly unknown[])[0];
      // Cópia: uma escuta pode se remover durante a emissão.
      for (const escuta of [...conjunto]) escuta(dado);
    },
  };
}
