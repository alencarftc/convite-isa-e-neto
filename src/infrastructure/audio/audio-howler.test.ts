import type { HowlOptions } from 'howler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AudioPort } from '@/application/ports/audio';

import { type BibliotecaDeAudio, criarAudioHowler, obterSessaoDeAudio } from './audio-howler';

const config = {
  volumes: { ambiente: 0.35, ambienteSobMusica: 0.15, efeitos: 0.8, musica: 0.6 },
  transicoesDeAudio: {
    entradaDoAmbiente: 2,
    ambienteSobMusica: 2,
    musica: 2,
    retornoDoAmbiente: 3,
  },
  musicas: { inicio1: 0, inicio2: 0 },
};

/** Som falso: guarda as opções recebidas e registra o que o adaptador pede ao Howler. */
class SomFalso {
  static criados: SomFalso[] = [];
  static falharAoCriar = false;
  volumeAtual = 0;
  readonly play = vi.fn((_id?: string | number) => 7);
  readonly pause = vi.fn();
  readonly stop = vi.fn();
  readonly fade = vi.fn();
  readonly seek = vi.fn();
  readonly volume = vi.fn(() => this.volumeAtual);

  readonly opcoes: HowlOptions;

  constructor(opcoes: HowlOptions) {
    this.opcoes = opcoes;
    if (SomFalso.falharAoCriar) throw new Error('Howl quebrou');
    SomFalso.criados.push(this);
  }

  get arquivo(): string {
    return String((this.opcoes.src as string[])[0]);
  }
}

function som(arquivo: string): SomFalso {
  const encontrado = SomFalso.criados.find((s) => s.arquivo === `audio/${arquivo}.mp3`);
  if (!encontrado) throw new Error(`som ${arquivo} não foi criado`);
  return encontrado;
}

function montar(extra: { musicas?: { inicio1: number; inicio2: number } } = {}) {
  const mute = vi.fn();
  const biblioteca = { Howl: SomFalso, Howler: { mute } } as unknown as BibliotecaDeAudio;
  const avisar = vi.fn();
  const sessaoDeAudio = { type: 'auto' };
  const audio: AudioPort = criarAudioHowler({
    biblioteca,
    config: { ...config, ...extra },
    avisar,
    sessaoDeAudio,
  });
  return { audio, mute, avisar, sessaoDeAudio };
}

function carregarAmbiente(): void {
  (som('ambiente').opcoes.onload as () => void)();
}

beforeEach(() => {
  SomFalso.criados = [];
  SomFalso.falharAoCriar = false;
});

describe('criarAudioHowler', () => {
  describe('antes do toque de entrada (RNF-08.3)', () => {
    it('não cria nenhum arquivo e ignora os comandos', () => {
      const { audio, avisar } = montar();

      audio.efeito('tampa');
      audio.musica1();
      audio.musica2();
      audio.pausar();
      audio.retomar();

      expect(SomFalso.criados).toHaveLength(0);
      expect(avisar).not.toHaveBeenCalled();
    });
  });

  describe('desbloquear', () => {
    it('cria ambiente, três efeitos e duas músicas, com as opções de cada tipo (RF-08.3)', () => {
      const { audio } = montar();

      audio.desbloquear(true);

      expect(SomFalso.criados).toHaveLength(6);
      expect(som('ambiente').opcoes).toMatchObject({ loop: true, volume: 0 });
      expect(som('ambiente').opcoes.html5).toBeUndefined();
      expect(som('fechadura').opcoes).toMatchObject({ volume: 0.8 });
      expect(som('musica-1').opcoes).toMatchObject({ html5: true, volume: 0, preload: 'metadata' });
      expect(som('musica-2').opcoes).toMatchObject({ html5: true, volume: 0, preload: 'metadata' });
    });

    it('com som ligado, libera o mudo; com som desligado, cria tudo mesmo assim (RF-08.6)', () => {
      const ligado = montar();
      ligado.audio.desbloquear(true);
      expect(ligado.mute).toHaveBeenLastCalledWith(false);

      SomFalso.criados = [];
      const desligado = montar();
      desligado.audio.desbloquear(false);
      expect(desligado.mute).toHaveBeenLastCalledWith(true);
      expect(SomFalso.criados).toHaveLength(6);
    });

    it('pede ao Safari que toque mesmo com o modo silencioso (caso de borda do iPhone)', () => {
      const { audio, sessaoDeAudio } = montar();

      audio.desbloquear(true);

      expect(sessaoDeAudio.type).toBe('playback');
    });

    it('só desbloqueia uma vez', () => {
      const { audio } = montar();

      audio.desbloquear(true);
      audio.desbloquear(true);

      expect(SomFalso.criados).toHaveLength(6);
    });

    it('o ambiente começa quando carrega, subindo de 0 a 0,35 em 2 s (CA-08.1.1)', () => {
      const { audio } = montar();
      audio.desbloquear(true);

      carregarAmbiente();

      expect(som('ambiente').play).toHaveBeenCalledOnce();
      expect(som('ambiente').fade).toHaveBeenCalledWith(0, 0.35, 2000);
    });

    it('um arquivo que não carrega vira aviso e não derruba nada (RF-08.8)', () => {
      const { audio, avisar } = montar();
      audio.desbloquear(true);
      const falha = new Error('404');

      (som('tampa').opcoes.onloaderror as (id: number, erro: unknown) => void)(1, falha);

      expect(avisar).toHaveBeenCalledWith(falha);
    });

    it('se o Howler não puder ser criado, avisa e os comandos seguintes não quebram', () => {
      SomFalso.falharAoCriar = true;
      const { audio, avisar } = montar();

      audio.desbloquear(true);

      expect(avisar).toHaveBeenCalledOnce();
      expect(() => {
        audio.efeito('selo');
        audio.musica1();
        audio.musica2();
      }).not.toThrow();
    });
  });

  describe('efeitos', () => {
    it('cada efeito toca o seu arquivo', () => {
      const { audio } = montar();
      audio.desbloquear(true);

      audio.efeito('fechadura');
      audio.efeito('selo');

      expect(som('fechadura').play).toHaveBeenCalledOnce();
      expect(som('selo').play).toHaveBeenCalledOnce();
      expect(som('tampa').play).not.toHaveBeenCalled();
    });
  });

  describe('músicas (CA-08.3.1, CA-08.3.2)', () => {
    it('a música 1 entra subindo de 0 a 0,6 em 2 s e o ambiente baixa para 0,15 em 2 s', () => {
      const { audio } = montar();
      audio.desbloquear(true);
      carregarAmbiente();
      som('ambiente').volumeAtual = 0.35;

      audio.musica1();

      expect(som('ambiente').fade).toHaveBeenLastCalledWith(0.35, 0.15, 2000);
      expect(som('musica-1').play).toHaveBeenCalledOnce();
      expect(som('musica-1').fade).toHaveBeenCalledWith(0, 0.6, 2000);
      expect(som('musica-1').seek).not.toHaveBeenCalled();
    });

    it('usa o trecho inicial de config.musicas quando não é zero (RF-08.4)', () => {
      const { audio } = montar({ musicas: { inicio1: 12, inicio2: 40 } });
      audio.desbloquear(true);

      audio.musica1();
      audio.musica2();

      expect(som('musica-1').seek).toHaveBeenCalledWith(12);
      expect(som('musica-2').seek).toHaveBeenCalledWith(40);
    });

    it('se a música 1 chega antes de o ambiente carregar, o ambiente já sobe ao volume baixo', () => {
      const { audio } = montar();
      audio.desbloquear(true);

      audio.musica1();
      carregarAmbiente();

      expect(som('ambiente').fade).toHaveBeenCalledExactlyOnceWith(0, 0.15, 2000);
    });

    it('a música 2 entra, a 1 desce a 0 em 2 s e para quando o esmaecimento termina', () => {
      const { audio } = montar();
      audio.desbloquear(true);
      audio.musica1();
      som('musica-1').volumeAtual = 0.6;

      audio.musica2();

      expect(som('musica-1').fade).toHaveBeenLastCalledWith(0.6, 0, 2000);
      expect(som('musica-2').play).toHaveBeenCalledOnce();
      expect(som('musica-2').fade).toHaveBeenCalledWith(0, 0.6, 2000);
      (som('musica-1').opcoes.onfade as () => void)();
      expect(som('musica-1').stop).toHaveBeenCalledOnce();
    });

    it('o esmaecimento de entrada da música 1 não a para', () => {
      const { audio } = montar();
      audio.desbloquear(true);
      audio.musica1();

      (som('musica-1').opcoes.onfade as () => void)();

      expect(som('musica-1').stop).not.toHaveBeenCalled();
    });

    it('a música 2 toca uma vez só, mesmo que o evento se repita', () => {
      const { audio } = montar();
      audio.desbloquear(true);

      audio.musica2();
      audio.musica2();

      expect(som('musica-2').play).toHaveBeenCalledOnce();
    });

    it('sem a música 1 (pular), só a música 2 toca', () => {
      const { audio } = montar();
      audio.desbloquear(true);

      audio.musica2();

      expect(som('musica-1').play).not.toHaveBeenCalled();
      expect(som('musica-2').play).toHaveBeenCalledOnce();
    });

    it('quando a música 2 termina, o ambiente volta a 0,35 em 3 s', () => {
      const { audio } = montar();
      audio.desbloquear(true);
      carregarAmbiente();
      audio.musica1();
      audio.musica2();
      som('ambiente').volumeAtual = 0.15;

      (som('musica-2').opcoes.onend as () => void)();

      expect(som('ambiente').fade).toHaveBeenLastCalledWith(0.15, 0.35, 3000);
    });
  });

  describe('liga/desliga e segundo plano', () => {
    it('ligar(false) silencia tudo e ligar(true) devolve o som (CT-08.4)', () => {
      const { audio, mute } = montar();
      audio.desbloquear(true);

      audio.ligar(false);
      expect(mute).toHaveBeenLastCalledWith(true);
      audio.ligar(true);
      expect(mute).toHaveBeenLastCalledWith(false);
    });

    it('desligar o som não pausa as músicas: elas seguem mudas, em sincronia', () => {
      const { audio } = montar();
      audio.desbloquear(true);
      audio.musica1();

      audio.ligar(false);

      expect(som('musica-1').pause).not.toHaveBeenCalled();
      expect(som('musica-1').stop).not.toHaveBeenCalled();
    });

    it('pausar silencia e pausa a música que toca; retomar a continua do mesmo ponto (CA-08.5.1)', () => {
      const { audio, mute } = montar();
      audio.desbloquear(true);
      audio.musica1();

      audio.pausar();
      expect(mute).toHaveBeenLastCalledWith(true);
      expect(som('musica-1').pause).toHaveBeenCalledWith(7);

      audio.retomar();
      expect(mute).toHaveBeenLastCalledWith(false);
      expect(som('musica-1').play).toHaveBeenLastCalledWith(7);
    });

    it('retomar respeita o som desligado pelo convidado', () => {
      const { audio, mute } = montar();
      audio.desbloquear(true);
      audio.musica1();
      audio.ligar(false);

      audio.pausar();
      audio.retomar();

      expect(mute).toHaveBeenLastCalledWith(true);
      expect(som('musica-1').play).toHaveBeenLastCalledWith(7);
    });

    it('pausar duas vezes (visibilitychange e pagehide) e retomar toca uma vez só', () => {
      const { audio } = montar();
      audio.desbloquear(true);
      audio.musica1();
      som('musica-1').play.mockClear();

      audio.pausar();
      audio.pausar();
      audio.retomar();
      audio.retomar();

      expect(som('musica-1').play).toHaveBeenCalledOnce();
    });

    it('música 2 que já terminou não é retomada: só o ambiente toca', () => {
      const { audio } = montar();
      audio.desbloquear(true);
      audio.musica2();
      (som('musica-2').opcoes.onend as () => void)();
      som('musica-2').play.mockClear();

      audio.pausar();
      audio.retomar();

      expect(som('musica-2').pause).not.toHaveBeenCalled();
      expect(som('musica-2').play).not.toHaveBeenCalled();
    });

    it('pausar sem música tocando só silencia', () => {
      const { audio, mute } = montar();
      audio.desbloquear(true);

      audio.pausar();

      expect(mute).toHaveBeenLastCalledWith(true);
      expect(som('musica-1').pause).not.toHaveBeenCalled();
    });
  });

  it('parar (modo de segurança) silencia e para ambiente e músicas', () => {
    const { audio, mute } = montar();
    audio.desbloquear(true);

    audio.parar();

    expect(mute).toHaveBeenLastCalledWith(true);
    for (const arquivo of ['ambiente', 'musica-1', 'musica-2']) {
      expect(som(arquivo).stop).toHaveBeenCalledOnce();
    }
  });
});

describe('obterSessaoDeAudio', () => {
  it('devolve a sessão de áudio quando o navegador tem uma', () => {
    const sessao = { type: 'auto' };

    expect(obterSessaoDeAudio({ audioSession: sessao })).toBe(sessao);
  });

  it.each([{}, { audioSession: null }, { audioSession: 'x' }, { audioSession: {} }])(
    'devolve undefined quando o navegador não tem (%j)',
    (navegador) => {
      expect(obterSessaoDeAudio(navegador)).toBeUndefined();
    },
  );
});
