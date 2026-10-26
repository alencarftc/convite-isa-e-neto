import type { Ambiente, Orientacao } from '@/application/ports/ambiente';

interface ConsultaDeMidia {
  readonly matches: boolean;
  addEventListener(tipo: 'change', escuta: (evento: { readonly matches: boolean }) => void): void;
  removeEventListener(
    tipo: 'change',
    escuta: (evento: { readonly matches: boolean }) => void,
  ): void;
}

export interface JanelaComMidia {
  matchMedia(consulta: string): ConsultaDeMidia;
}

const SEM_CONSULTA: ConsultaDeMidia = {
  matches: false,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};

/**
 * Ambiente do aparelho via `matchMedia` (SPEC-01, `state`). Se o navegador não responder, vale o
 * padrão mais conservador para a animação (reduzida: não) e para o resto (retrato, sem toque).
 */
export function criarAmbienteDoNavegador(janela: JanelaComMidia): Ambiente {
  function consultar(consulta: string): ConsultaDeMidia {
    try {
      return janela.matchMedia(consulta);
    } catch {
      return SEM_CONSULTA;
    }
  }

  const retrato = consultar('(orientation: portrait)');
  const orientacaoDe = (vertical: boolean): Orientacao => (vertical ? 'vertical' : 'horizontal');

  return {
    animacaoReduzida: () => consultar('(prefers-reduced-motion: reduce)').matches,
    porToque: () => consultar('(pointer: coarse)').matches,
    algumToque: () => consultar('(any-pointer: coarse)').matches,
    orientacao: () => orientacaoDe(retrato.matches),
    aoMudarOrientacao(escuta) {
      const aoMudar = (evento: { readonly matches: boolean }) => {
        escuta(orientacaoDe(evento.matches));
      };
      retrato.addEventListener('change', aoMudar);
      return () => {
        retrato.removeEventListener('change', aoMudar);
      };
    },
  };
}
