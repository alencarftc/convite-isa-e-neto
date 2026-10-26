import { describe, expect, it, vi } from 'vitest';

import { criarEstado } from './estado-convite';
import type { Ambiente, Orientacao } from './ports/ambiente';
import type { Preferencias } from './ports/preferencias';

function ambienteFalso(inicial: Partial<{ reduzido: boolean; toque: boolean }> = {}) {
  let orientacao: Orientacao = 'vertical';
  const escutas = new Set<(o: Orientacao) => void>();
  const ambiente: Ambiente = {
    animacaoReduzida: () => inicial.reduzido ?? false,
    porToque: () => inicial.toque ?? false,
    algumToque: () => inicial.toque ?? false,
    orientacao: () => orientacao,
    aoMudarOrientacao(escuta) {
      escutas.add(escuta);
      return () => {
        escutas.delete(escuta);
      };
    },
  };
  return {
    ambiente,
    girar(nova: Orientacao) {
      orientacao = nova;
      for (const escuta of [...escutas]) escuta(nova);
    },
    escutasAtivas: () => escutas.size,
  };
}

function preferenciasFalsas(valores: Record<string, boolean> = {}): Preferencias {
  return {
    ler: (chave, padrao) => valores[chave] ?? padrao,
    gravar: vi.fn(),
  };
}

describe('criarEstado', () => {
  it('nasce em "carregando", com som ligado e visita nova por padrão', () => {
    const { ambiente } = ambienteFalso();
    const estado = criarEstado({ preferencias: preferenciasFalsas(), ambiente });

    expect(estado.fase).toBe('carregando');
    expect(estado.somLigado).toBe(true);
    expect(estado.visitado).toBe(false);
    expect(estado.reduzido).toBe(false);
    expect(estado.toque).toBe(false);
    expect(estado.orientacao).toBe('vertical');
  });

  it('lê som e visita das preferências e o resto do ambiente', () => {
    const { ambiente } = ambienteFalso({ reduzido: true, toque: true });
    const preferencias = preferenciasFalsas({ 'convite:som': false, 'convite:visitado': true });
    const estado = criarEstado({ preferencias, ambiente });

    expect(estado.somLigado).toBe(false);
    expect(estado.visitado).toBe(true);
    expect(estado.reduzido).toBe(true);
    expect(estado.toque).toBe(true);
  });

  it('avança a fase e avisa quem ouve', () => {
    const { ambiente } = ambienteFalso();
    const estado = criarEstado({ preferencias: preferenciasFalsas(), ambiente });
    const fases: string[] = [];
    estado.aoMudar((e) => fases.push(e.fase));

    expect(estado.definirFase('aguardando-entrada')).toBe(true);
    expect(estado.definirFase('bosque')).toBe(true);

    expect(estado.fase).toBe('bosque');
    expect(fases).toEqual(['aguardando-entrada', 'bosque']);
  });

  it('recusa voltar ou repetir a fase, sem avisar', () => {
    const { ambiente } = ambienteFalso();
    const estado = criarEstado({ preferencias: preferenciasFalsas(), ambiente });
    estado.definirFase('historia');
    const escuta = vi.fn();
    estado.aoMudar(escuta);

    expect(estado.definirFase('bosque')).toBe(false);
    expect(estado.definirFase('historia')).toBe(false);

    expect(estado.fase).toBe('historia');
    expect(escuta).not.toHaveBeenCalled();
  });

  it('não sai de uma fase final', () => {
    const { ambiente } = ambienteFalso();
    const estado = criarEstado({ preferencias: preferenciasFalsas(), ambiente });
    estado.definirFase('informacoes');

    expect(estado.definirFase('seguranca')).toBe(false);
    expect(estado.fase).toBe('informacoes');
  });

  it('acompanha o giro do aparelho sem reiniciar a fase (casos de borda da SPEC-01)', () => {
    const { ambiente, girar } = ambienteFalso();
    const estado = criarEstado({ preferencias: preferenciasFalsas(), ambiente });
    estado.definirFase('bau');
    const escuta = vi.fn();
    estado.aoMudar(escuta);

    girar('horizontal');
    girar('horizontal'); // repetido: nada a avisar

    expect(estado.orientacao).toBe('horizontal');
    expect(estado.fase).toBe('bau');
    expect(escuta).toHaveBeenCalledTimes(1);
  });

  it('definirSom guarda a escolha, lembra para a próxima visita e avisa (CA-08.4.2)', () => {
    const { ambiente } = ambienteFalso();
    const preferencias = preferenciasFalsas();
    const estado = criarEstado({ preferencias, ambiente });
    const escuta = vi.fn();
    estado.aoMudar(escuta);

    estado.definirSom(false);

    expect(estado.somLigado).toBe(false);
    expect(preferencias.gravar).toHaveBeenCalledWith('convite:som', false);
    expect(escuta).toHaveBeenCalledTimes(1);
  });

  it('definirSom com o valor que já vale não grava nem avisa', () => {
    const { ambiente } = ambienteFalso();
    const preferencias = preferenciasFalsas();
    const estado = criarEstado({ preferencias, ambiente });
    const escuta = vi.fn();
    estado.aoMudar(escuta);

    estado.definirSom(true);

    expect(preferencias.gravar).not.toHaveBeenCalled();
    expect(escuta).not.toHaveBeenCalled();
  });

  it('marcarVisitado grava a visita e avisa uma só vez (RF-06.10)', () => {
    const { ambiente } = ambienteFalso();
    const preferencias = preferenciasFalsas();
    const estado = criarEstado({ preferencias, ambiente });
    const escuta = vi.fn();
    estado.aoMudar(escuta);

    estado.marcarVisitado();
    estado.marcarVisitado();

    expect(estado.visitado).toBe(true);
    expect(preferencias.gravar).toHaveBeenCalledExactlyOnceWith('convite:visitado', true);
    expect(escuta).toHaveBeenCalledTimes(1);
  });

  it('quem cancela o aviso deixa de ser chamado', () => {
    const { ambiente } = ambienteFalso();
    const estado = criarEstado({ preferencias: preferenciasFalsas(), ambiente });
    const escuta = vi.fn();
    const cancelar = estado.aoMudar(escuta);

    cancelar();
    estado.definirFase('bosque');

    expect(escuta).not.toHaveBeenCalled();
  });

  it('destruir para de ouvir o ambiente e esquece os avisos', () => {
    const { ambiente, girar, escutasAtivas } = ambienteFalso();
    const estado = criarEstado({ preferencias: preferenciasFalsas(), ambiente });
    const escuta = vi.fn();
    estado.aoMudar(escuta);

    estado.destruir();
    girar('horizontal');

    expect(escutasAtivas()).toBe(0);
    expect(escuta).not.toHaveBeenCalled();
  });
});
