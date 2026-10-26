import type { Relogio } from '@/application/ports/relogio';

const DATA_SIMULADA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export interface OpcoesDoRelogio {
  /** `import.meta.env.DEV`: a data simulada só existe em desenvolvimento (SPEC-07, RF-07.9). */
  readonly desenvolvimento: boolean;
  /** `location.search`. */
  readonly busca: string;
}

/**
 * Relógio do aparelho. Em desenvolvimento, `?data=AAAA-MM-DDTHH:MM` congela o
 * instante, lido como horário de Brasília (UTC−3), para testar os quatro estados.
 */
export function criarRelogio({ desenvolvimento, busca }: OpcoesDoRelogio): Relogio {
  if (desenvolvimento) {
    const simulada = new URLSearchParams(busca).get('data');
    if (simulada !== null && DATA_SIMULADA.test(simulada)) {
      const instante = Date.parse(`${simulada}:00-03:00`);
      if (!Number.isNaN(instante)) return { agora: () => instante };
    }
  }
  return { agora: () => Date.now() };
}
