import { describe, expect, it, vi } from 'vitest';

import type { EventosConvite } from '@/domain/eventos/eventos-convite';

import { criarBarramento } from '../barramento-eventos';
import { criarEstado } from '../estado-convite';
import type { AudioPort } from '../ports/audio';
import { conectarAudio } from './audio-do-convite';

function audioFalso(): { [K in keyof AudioPort]: ReturnType<typeof vi.fn> } {
  return {
    desbloquear: vi.fn(),
    efeito: vi.fn(),
    musica1: vi.fn(),
    musica2: vi.fn(),
    ligar: vi.fn(),
    pausar: vi.fn(),
    retomar: vi.fn(),
    parar: vi.fn(),
  };
}

function montar(opcoes: { reduzido?: boolean; somSalvo?: boolean } = {}) {
  const audio = audioFalso();
  const eventos = criarBarramento<EventosConvite>();
  const gravar = vi.fn();
  const estado = criarEstado({
    preferencias: {
      ler: (chave, padrao) => (chave === 'convite:som' ? (opcoes.somSalvo ?? padrao) : padrao),
      gravar,
    },
    ambiente: {
      animacaoReduzida: () => opcoes.reduzido ?? false,
      porToque: () => false,
      orientacao: () => 'vertical',
      aoMudarOrientacao: () => () => undefined,
    },
  });
  const avisar = vi.fn();
  const conectado = conectarAudio({
    audio: audio as unknown as AudioPort,
    eventos,
    estado,
    avisar,
  });
  return { audio, eventos, estado, avisar, conectado, gravar };
}

describe('conectarAudio', () => {
  it('o toque de entrada libera o áudio com a preferência de som (RF-08.2)', () => {
    const { audio, eventos } = montar({ somSalvo: false });

    eventos.emit('entrada:tocou', { escolha: 'entrar' });

    expect(audio.desbloquear).toHaveBeenCalledExactlyOnceWith(false);
    expect(audio.musica2).not.toHaveBeenCalled();
  });

  it('pular na entrada leva a música 2 direto (tabela "Pular ou animação reduzida")', () => {
    const { audio, eventos } = montar();

    eventos.emit('entrada:tocou', { escolha: 'pular' });

    expect(audio.desbloquear).toHaveBeenCalledOnce();
    expect(audio.musica2).toHaveBeenCalledOnce();
  });

  it('animação reduzida também leva a música 2 direto', () => {
    const { audio, eventos } = montar({ reduzido: true });

    eventos.emit('entrada:tocou', { escolha: 'entrar' });

    expect(audio.musica2).toHaveBeenCalledOnce();
  });

  it('cada evento das cenas dispara o som da tabela do comportamento', () => {
    const { audio, eventos } = montar();

    eventos.emit('bau:girou');
    eventos.emit('bau:abriu');
    eventos.emit('historia:inicio', { duracao: 15 });
    eventos.emit('carta:abrindo', { origem: 'toque' });

    expect(audio.efeito.mock.calls).toEqual([['fechadura'], ['tampa'], ['selo']]);
    expect(audio.musica1).toHaveBeenCalledOnce();
    expect(audio.musica2).toHaveBeenCalledOnce();
  });

  it('som:alterado guarda a escolha no estado e liga ou silencia o áudio (CT-08.4)', () => {
    const { audio, eventos, estado, gravar } = montar();

    eventos.emit('som:alterado', { ligado: false });

    expect(estado.somLigado).toBe(false);
    expect(gravar).toHaveBeenCalledWith('convite:som', false);
    expect(audio.ligar).toHaveBeenCalledWith(false);
  });

  it('o modo de segurança para o áudio', () => {
    const { audio, eventos } = montar();

    eventos.emit('seguranca', { erro: new Error('x') });

    expect(audio.parar).toHaveBeenCalledOnce();
  });

  it('sair e voltar do aplicativo pausa e retoma (CA-08.5.1)', () => {
    const { audio, conectado } = montar();

    conectado.aoSair();
    conectado.aoVoltar();

    expect(audio.pausar).toHaveBeenCalledOnce();
    expect(audio.retomar).toHaveBeenCalledOnce();
  });

  describe('o som nunca derruba o convite (RF-08.8)', () => {
    it('um erro do áudio vira aviso e não sobe a quem emitiu o evento', () => {
      const { audio, eventos, avisar } = montar();
      const falha = new Error('arquivo quebrado');
      audio.efeito.mockImplementation(() => {
        throw falha;
      });

      expect(() => {
        eventos.emit('bau:girou');
      }).not.toThrow();
      expect(avisar).toHaveBeenCalledWith(falha);
    });

    it('o selo falhar não impede a música 2 de entrar', () => {
      const { audio, eventos, avisar } = montar();
      audio.efeito.mockImplementation(() => {
        throw new Error('selo');
      });

      eventos.emit('carta:abrindo', { origem: 'tempo' });

      expect(audio.musica2).toHaveBeenCalledOnce();
      expect(avisar).toHaveBeenCalledOnce();
    });

    it('erro ao sair ou voltar também só vira aviso', () => {
      const { audio, conectado, avisar } = montar();
      audio.pausar.mockImplementation(() => {
        throw new Error('pausa');
      });
      audio.retomar.mockImplementation(() => {
        throw new Error('retoma');
      });

      expect(() => {
        conectado.aoSair();
        conectado.aoVoltar();
      }).not.toThrow();
      expect(avisar).toHaveBeenCalledTimes(2);
    });
  });

  it('destruir para de ouvir os eventos', () => {
    const { audio, eventos, conectado } = montar();

    conectado.destruir();
    eventos.emit('bau:girou');
    eventos.emit('historia:inicio', { duracao: 15 });

    expect(audio.efeito).not.toHaveBeenCalled();
    expect(audio.musica1).not.toHaveBeenCalled();
  });
});
