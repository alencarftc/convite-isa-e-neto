import { vi } from 'vitest';

import { criarEstado, type EstadoConvite } from '@/application/estado-convite';
import type { Ambiente, Orientacao } from '@/application/ports/ambiente';

export interface OpcoesDoEstadoFalso {
  readonly visitado?: boolean;
  readonly reduzido?: boolean;
  readonly toque?: boolean;
  readonly orientacao?: Orientacao;
}

/** Estado real sobre um ambiente falso, que o teste pode girar. */
export function criarEstadoFalso(opcoes: OpcoesDoEstadoFalso = {}): {
  estado: EstadoConvite;
  girar: (nova: Orientacao) => void;
} {
  let orientacao: Orientacao = opcoes.orientacao ?? 'vertical';
  const giros = new Set<(o: Orientacao) => void>();
  const ambiente: Ambiente = {
    animacaoReduzida: () => opcoes.reduzido ?? false,
    porToque: () => opcoes.toque ?? true,
    orientacao: () => orientacao,
    aoMudarOrientacao(escuta) {
      giros.add(escuta);
      return () => {
        giros.delete(escuta);
      };
    },
  };
  const estado = criarEstado({
    preferencias: {
      ler: (chave, padrao) => (chave === 'convite:visitado' ? (opcoes.visitado ?? padrao) : padrao),
      gravar: vi.fn(),
    },
    ambiente,
  });
  return {
    estado,
    girar(nova) {
      orientacao = nova;
      for (const escuta of giros) escuta(nova);
    },
  };
}
