import { describe, expect, it, vi } from 'vitest';

import { criarAmbienteDoNavegador, type JanelaComMidia } from './ambiente-do-navegador';

type EscutaDeMudanca = (evento: { readonly matches: boolean }) => void;

/** `matchMedia` falso: `ativas` lista as consultas verdadeiras; guarda as escutas de mudança. */
function janelaFalsa(ativas: readonly string[]) {
  const escutas = new Map<string, Set<EscutaDeMudanca>>();
  const janela: JanelaComMidia = {
    matchMedia(consulta) {
      return {
        matches: ativas.includes(consulta),
        addEventListener(_tipo, escuta) {
          escutas.set(consulta, (escutas.get(consulta) ?? new Set()).add(escuta));
        },
        removeEventListener(_tipo, escuta) {
          escutas.get(consulta)?.delete(escuta);
        },
      };
    },
  };
  return {
    janela,
    disparar(consulta: string, matches: boolean) {
      for (const escuta of escutas.get(consulta) ?? []) escuta({ matches });
    },
    escutasDe: (consulta: string) => escutas.get(consulta)?.size ?? 0,
  };
}

describe('criarAmbienteDoNavegador', () => {
  it('lê animação reduzida, toque e orientação do matchMedia', () => {
    const { janela } = janelaFalsa([
      '(prefers-reduced-motion: reduce)',
      '(pointer: coarse)',
      '(any-pointer: coarse)',
      '(orientation: portrait)',
    ]);
    const ambiente = criarAmbienteDoNavegador(janela);

    expect(ambiente.animacaoReduzida()).toBe(true);
    expect(ambiente.porToque()).toBe(true);
    expect(ambiente.algumToque()).toBe(true);
    expect(ambiente.orientacao()).toBe('vertical');
  });

  it('sem nenhuma consulta verdadeira: movimento normal, mouse e horizontal', () => {
    const ambiente = criarAmbienteDoNavegador(janelaFalsa([]).janela);

    expect(ambiente.animacaoReduzida()).toBe(false);
    expect(ambiente.porToque()).toBe(false);
    expect(ambiente.algumToque()).toBe(false);
    expect(ambiente.orientacao()).toBe('horizontal');
  });

  it('avisa quando o aparelho gira e para de avisar ao cancelar', () => {
    const { janela, disparar, escutasDe } = janelaFalsa(['(orientation: portrait)']);
    const ambiente = criarAmbienteDoNavegador(janela);
    const escuta = vi.fn();

    const cancelar = ambiente.aoMudarOrientacao(escuta);
    disparar('(orientation: portrait)', false);
    disparar('(orientation: portrait)', true);
    cancelar();
    disparar('(orientation: portrait)', false);

    expect(escuta.mock.calls).toEqual([['horizontal'], ['vertical']]);
    expect(escutasDe('(orientation: portrait)')).toBe(0);
  });

  it('se o matchMedia lançar, cai nos padrões seguros em vez de quebrar o convite', () => {
    const janela: JanelaComMidia = {
      matchMedia: () => {
        throw new Error('sem matchMedia');
      },
    };
    const ambiente = criarAmbienteDoNavegador(janela);

    expect(ambiente.animacaoReduzida()).toBe(false);
    expect(ambiente.porToque()).toBe(false);
    expect(ambiente.orientacao()).toBe('horizontal');
    expect(() => ambiente.aoMudarOrientacao(vi.fn())()).not.toThrow();
  });
});
