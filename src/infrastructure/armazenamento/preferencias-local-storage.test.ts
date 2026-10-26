import { describe, expect, it, vi } from 'vitest';

import {
  type ArmazenamentoMinimo,
  criarPreferencias,
  obterLocalStorageSeguro,
} from './preferencias-local-storage';

function armazenamentoEmMemoria(): ArmazenamentoMinimo & { dados: Map<string, string> } {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => {
      dados.set(chave, valor);
    },
  };
}

const armazenamentoQuebrado: ArmazenamentoMinimo = {
  getItem: () => {
    throw new DOMException('bloqueado', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('cheio', 'QuotaExceededError');
  },
};

describe('criarPreferencias', () => {
  it('devolve o padrão quando nada foi gravado', () => {
    const preferencias = criarPreferencias(armazenamentoEmMemoria());
    expect(preferencias.ler('convite:som', true)).toBe(true);
    expect(preferencias.ler('convite:visitado', false)).toBe(false);
  });

  it('grava e lê de volta', () => {
    const armazenamento = armazenamentoEmMemoria();
    const preferencias = criarPreferencias(armazenamento);

    preferencias.gravar('convite:som', false);

    expect(armazenamento.dados.get('convite:som')).toBe('false');
    expect(preferencias.ler('convite:som', true)).toBe(false);
  });

  it('ignora valor de outro tipo e JSON inválido', () => {
    const armazenamento = armazenamentoEmMemoria();
    const preferencias = criarPreferencias(armazenamento);

    armazenamento.dados.set('convite:som', '"sim"');
    expect(preferencias.ler('convite:som', true)).toBe(true);

    armazenamento.dados.set('convite:som', '{quebrado');
    expect(preferencias.ler('convite:som', true)).toBe(true);
  });

  it('cai no padrão e não lança quando o armazenamento falha', () => {
    const preferencias = criarPreferencias(armazenamentoQuebrado);

    expect(preferencias.ler('convite:visitado', false)).toBe(false);
    expect(() => {
      preferencias.gravar('convite:visitado', true);
    }).not.toThrow();
  });

  it('funciona sem armazenamento algum', () => {
    const preferencias = criarPreferencias(undefined);

    expect(preferencias.ler('convite:som', true)).toBe(true);
    expect(() => {
      preferencias.gravar('convite:som', false);
    }).not.toThrow();
  });
});

describe('obterLocalStorageSeguro', () => {
  it('devolve undefined se acessar window.localStorage lançar', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new DOMException('bloqueado', 'SecurityError');
      },
    });

    expect(obterLocalStorageSeguro()).toBeUndefined();

    vi.unstubAllGlobals();
  });

  it('devolve o localStorage quando disponível', () => {
    const fake = armazenamentoEmMemoria();
    vi.stubGlobal('window', { localStorage: fake });

    expect(obterLocalStorageSeguro()).toBe(fake);

    vi.unstubAllGlobals();
  });
});
