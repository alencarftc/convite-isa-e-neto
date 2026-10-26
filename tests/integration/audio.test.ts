import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarBarramento } from '@/application/barramento-eventos';
import { criarEstado } from '@/application/estado-convite';
import { conectarAudio } from '@/application/use-cases/audio-do-convite';
import { content } from '@/config/content';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { criarPreferencias } from '@/infrastructure/armazenamento/preferencias-local-storage';
import { montarBotaoSom } from '@/presentation/audio/botao-som';

/** Camadas reais do som: botão (DOM) → evento → caso de uso → estado → preferência salva. */
function armazenamentoEmMemoria() {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => dados.set(chave, valor),
  };
}

function montar(armazenamento = armazenamentoEmMemoria()) {
  document.body.innerHTML = '<div id="app"></div>';
  const raiz = document.querySelector<HTMLElement>('#app');
  if (!raiz) throw new Error('sem #app');

  const eventos = criarBarramento<EventosConvite>();
  const estado = criarEstado({
    preferencias: criarPreferencias(armazenamento),
    ambiente: {
      animacaoReduzida: () => false,
      porToque: () => true,
      algumToque: () => true,
      orientacao: () => 'vertical',
      aoMudarOrientacao: () => () => undefined,
    },
  });
  const audio = {
    desbloquear: vi.fn(),
    efeito: vi.fn(),
    musica1: vi.fn(),
    musica2: vi.fn(),
    ligar: vi.fn(),
    pausar: vi.fn(),
    retomar: vi.fn(),
    parar: vi.fn(),
  };
  const conectado = conectarAudio({ audio, eventos, estado, avisar: vi.fn() });
  const remover = montarBotaoSom({ raiz, dicas: content.dicas, estado, eventos });
  const botao = document.querySelector<HTMLButtonElement>('.botao-som');
  if (!botao) throw new Error('botão de som não montado');
  return { armazenamento, estado, audio, conectado, remover, botao, raiz, eventos };
}

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  document.body.innerHTML = '';
});

describe('botão de som (SPEC-08)', () => {
  it('nasce ligado: aria-pressed, nome fixo e dica "Som ligado" (RF-08.5)', () => {
    const { botao } = montar();

    expect(botao.getAttribute('aria-pressed')).toBe('true');
    expect(botao.getAttribute('aria-label')).toBe('Som');
    expect(botao.title).toBe('Som ligado');
    expect(botao.type).toBe('button');
  });

  it('um toque desliga o som, silencia o áudio e guarda a escolha (CA-08.4.1, CA-08.4.2)', () => {
    const { botao, estado, audio, armazenamento } = montar();

    botao.click();

    expect(botao.getAttribute('aria-pressed')).toBe('false');
    expect(botao.title).toBe('Som desligado');
    expect(estado.somLigado).toBe(false);
    expect(audio.ligar).toHaveBeenCalledWith(false);
    expect(armazenamento.dados.get('convite:som')).toBe('false');
  });

  it('outro toque liga de novo', () => {
    const { botao, audio, armazenamento } = montar();

    botao.click();
    botao.click();

    expect(botao.getAttribute('aria-pressed')).toBe('true');
    expect(audio.ligar).toHaveBeenLastCalledWith(true);
    expect(armazenamento.dados.get('convite:som')).toBe('true');
  });

  it('numa próxima visita, lembra que o som estava desligado (CT-08.4)', () => {
    const armazenamento = armazenamentoEmMemoria();
    montar(armazenamento).botao.click();

    const novaVisita = montar(armazenamento);

    expect(novaVisita.botao.getAttribute('aria-pressed')).toBe('false');
    expect(novaVisita.estado.somLigado).toBe(false);
  });

  it('sem localStorage, o som começa ligado e a escolha vale só nesta visita', () => {
    const { botao, estado } = montar({
      dados: new Map(),
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    });
    expect(botao.getAttribute('aria-pressed')).toBe('true');

    botao.click();

    expect(estado.somLigado).toBe(false);
    expect(botao.getAttribute('aria-pressed')).toBe('false');
  });

  it('remover tira o botão e os ouvintes', () => {
    const { remover, estado, eventos } = montar();
    const aoAlterar = vi.fn();
    eventos.on('som:alterado', aoAlterar);

    remover();
    estado.definirSom(false);

    expect(document.querySelector('.botao-som')).toBeNull();
    expect(aoAlterar).not.toHaveBeenCalled();
  });
});
