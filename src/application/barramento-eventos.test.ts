import { describe, expect, it, vi } from 'vitest';

import type { EventosConvite } from '@/domain/eventos/eventos-convite';

import { criarBarramento } from './barramento-eventos';

describe('barramento de eventos', () => {
  it('entrega os dados do evento a quem escuta', () => {
    const barramento = criarBarramento<EventosConvite>();
    const escuta = vi.fn();
    barramento.on('entrada:tocou', escuta);

    barramento.emit('entrada:tocou', { escolha: 'entrar' });

    expect(escuta).toHaveBeenCalledExactlyOnceWith({ escolha: 'entrar' });
  });

  it('emite eventos sem dados', () => {
    const barramento = criarBarramento<EventosConvite>();
    const escuta = vi.fn();
    barramento.on('bosque:pronto', escuta);

    barramento.emit('bosque:pronto');

    expect(escuta).toHaveBeenCalledTimes(1);
  });

  it('chama as escutas na ordem de registro', () => {
    const barramento = criarBarramento<EventosConvite>();
    const ordem: string[] = [];
    barramento.on('bau:abriu', () => ordem.push('audio'));
    barramento.on('bau:abriu', () => ordem.push('historia'));

    barramento.emit('bau:abriu');

    expect(ordem).toEqual(['audio', 'historia']);
  });

  it('não chama escutas de outros eventos', () => {
    const barramento = criarBarramento<EventosConvite>();
    const escuta = vi.fn();
    barramento.on('bau:girou', escuta);

    barramento.emit('bau:abriu');

    expect(escuta).not.toHaveBeenCalled();
  });

  it('remove a escuta com off e com a função devolvida por on', () => {
    const barramento = criarBarramento<EventosConvite>();
    const porOff = vi.fn();
    const porRetorno = vi.fn();
    barramento.on('convite:aberto', porOff);
    const remover = barramento.on('convite:aberto', porRetorno);

    barramento.off('convite:aberto', porOff);
    remover();
    barramento.emit('convite:aberto');

    expect(porOff).not.toHaveBeenCalled();
    expect(porRetorno).not.toHaveBeenCalled();
  });

  it('permite que uma escuta se remova durante a emissão', () => {
    const barramento = criarBarramento<EventosConvite>();
    const segunda = vi.fn();
    const remover = barramento.on('historia:fim', () => {
      remover();
    });
    barramento.on('historia:fim', segunda);

    barramento.emit('historia:fim');
    barramento.emit('historia:fim');

    expect(segunda).toHaveBeenCalledTimes(2);
  });

  it('não falha ao emitir sem ninguém escutando', () => {
    const barramento = criarBarramento<EventosConvite>();
    expect(() => {
      barramento.emit('seguranca', { erro: new Error('x') });
    }).not.toThrow();
  });

  it('propaga o erro de uma escuta a quem emitiu', () => {
    const barramento = criarBarramento<EventosConvite>();
    barramento.on('carta:pousou', () => {
      throw new Error('falha na dica');
    });

    expect(() => {
      barramento.emit('carta:pousou');
    }).toThrow('falha na dica');
  });
});
