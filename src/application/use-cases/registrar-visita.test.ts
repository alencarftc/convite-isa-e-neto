import { describe, expect, it, vi } from 'vitest';

import type { EventosConvite } from '@/domain/eventos/eventos-convite';

import { criarBarramento } from '../barramento-eventos';
import { criarEstado } from '../estado-convite';
import { registrarVisita } from './registrar-visita';

function montar() {
  const gravar = vi.fn();
  const estado = criarEstado({
    preferencias: { ler: (_chave, padrao) => padrao, gravar },
    ambiente: {
      animacaoReduzida: () => false,
      porToque: () => false,
      algumToque: () => false,
      orientacao: () => 'vertical',
      aoMudarOrientacao: () => () => undefined,
    },
  });
  const eventos = criarBarramento<EventosConvite>();
  return { estado, eventos, gravar, parar: registrarVisita({ estado, eventos }) };
}

describe('registrarVisita', () => {
  it('convite:aberto marca a visita e a grava no aparelho', () => {
    const { estado, eventos, gravar } = montar();
    expect(estado.visitado).toBe(false);

    eventos.emit('convite:aberto');

    expect(estado.visitado).toBe(true);
    expect(gravar).toHaveBeenCalledWith('convite:visitado', true);
  });

  it('antes de a carta abrir, a visita não é registrada (quem fecha o convite no meio não "visitou")', () => {
    const { estado, eventos } = montar();

    eventos.emit('carta:pousou');
    eventos.emit('carta:abrindo', { origem: 'toque' });

    expect(estado.visitado).toBe(false);
  });

  it('a função devolvida para de ouvir', () => {
    const { estado, eventos, parar } = montar();

    parar();
    eventos.emit('convite:aberto');

    expect(estado.visitado).toBe(false);
  });
});
