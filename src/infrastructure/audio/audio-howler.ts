import type { Howl, HowlerGlobal, HowlOptions } from 'howler';

import type { AudioPort, NomeDeEfeito } from '@/application/ports/audio';
import type { ConfigConvite } from '@/domain/config/config-convite';

type Som = Pick<Howl, 'play' | 'pause' | 'stop' | 'fade' | 'seek' | 'volume'>;

/** O que o adaptador usa do Howler.js; a raiz de composição entrega `{ Howl, Howler }`. */
export interface BibliotecaDeAudio {
  readonly Howl: new (opcoes: HowlOptions) => Som;
  readonly Howler: Pick<HowlerGlobal, 'mute'>;
}

export interface DependenciasDoAudioHowler {
  readonly biblioteca: BibliotecaDeAudio;
  readonly config: Pick<ConfigConvite, 'volumes' | 'transicoesDeAudio' | 'musicas'>;
  /** Registra uma falha de som sem interromper o convite (RF-08.8). */
  readonly avisar: (erro: unknown) => void;
  /** `navigator.audioSession` (Safari recente): `type = 'playback'` faz o som sair no modo silencioso. */
  readonly sessaoDeAudio?: { type: string } | undefined;
}

/** Caminhos relativos à página, para funcionar em qualquer subpasta do GitHub Pages (RF-01.2). */
const ARQUIVOS = {
  ambiente: 'audio/ambiente.mp3',
  fechadura: 'audio/fechadura.mp3',
  tampa: 'audio/tampa.mp3',
  selo: 'audio/selo.mp3',
  musica1: 'audio/musica-1.mp3',
  musica2: 'audio/musica-2.mp3',
} as const;

const NOMES_DE_EFEITO: readonly NomeDeEfeito[] = ['fechadura', 'tampa', 'selo'];

const emMilissegundos = (segundos: number): number => segundos * 1000;

/**
 * Adaptador de áudio com Howler.js (SPEC-08). Ambiente e efeitos usam Web Audio (loop sem emenda,
 * resposta imediata); as músicas usam o elemento `<audio>` (tocam enquanto baixam, pouca memória).
 * Os arquivos só são criados, e portanto só começam a baixar, em `desbloquear` (RNF-08.3).
 */
export function criarAudioHowler(dependencias: DependenciasDoAudioHowler): AudioPort {
  const { biblioteca, config, avisar, sessaoDeAudio } = dependencias;
  const { Howl, Howler } = biblioteca;
  const { volumes, transicoesDeAudio: transicoes, musicas: trechos } = config;

  let desbloqueado = false;
  let ligado = true;

  let ambiente: Som | undefined;
  let ambienteCarregado = false;
  let volumeDoAmbiente = 0;
  const efeitos: Partial<Record<NomeDeEfeito, Som>> = {};
  let musica1: Som | undefined;
  let musica2: Som | undefined;
  let idMusica1: number | undefined;
  let idMusica2: number | undefined;
  let musica1Saindo = false;
  let musica2Terminou = false;
  let pausadas: readonly ('musica1' | 'musica2')[] = [];

  /** Qualquer falha de som vira aviso; nada aqui pode quebrar a animação. */
  function seguro(comando: () => void): void {
    try {
      comando();
    } catch (erro) {
      avisar(erro);
    }
  }

  function mudarAmbiente(para: number, segundos: number): void {
    volumeDoAmbiente = para;
    // Antes de carregar, o `onload` do ambiente já sobe direto ao volume pedido.
    if (ambiente && ambienteCarregado) {
      ambiente.fade(ambiente.volume(), para, emMilissegundos(segundos));
    }
  }

  function entrarNoTrecho(musica: Som, inicio: number): number {
    if (inicio > 0) musica.seek(inicio);
    const id = musica.play();
    musica.fade(0, volumes.musica, emMilissegundos(transicoes.musica));
    return id;
  }

  function criarAmbiente(): Som {
    const som: Som = new Howl({
      src: [ARQUIVOS.ambiente],
      loop: true,
      volume: 0,
      onload: () => {
        seguro(() => {
          ambienteCarregado = true;
          som.play();
          som.fade(0, volumeDoAmbiente, emMilissegundos(transicoes.entradaDoAmbiente));
        });
      },
      onloaderror: (_id, erro) => {
        avisar(erro);
      },
    });
    return som;
  }

  function criarEfeito(nome: NomeDeEfeito): Som {
    return new Howl({
      src: [ARQUIVOS[nome]],
      volume: volumes.efeitos,
      onloaderror: (_id, erro) => {
        avisar(erro);
      },
    });
  }

  function criarMusica1(): Som {
    const som: Som = new Howl({
      src: [ARQUIVOS.musica1],
      html5: true,
      volume: 0,
      preload: 'metadata',
      // Terminado o esmaecimento de saída, a música 1 para de vez.
      onfade: () => {
        seguro(() => {
          if (musica1Saindo) som.stop();
        });
      },
      onloaderror: (_id, erro) => {
        avisar(erro);
      },
    });
    return som;
  }

  function criarMusica2(): Som {
    return new Howl({
      src: [ARQUIVOS.musica2],
      html5: true,
      volume: 0,
      preload: 'metadata',
      onend: () => {
        seguro(() => {
          musica2Terminou = true;
          mudarAmbiente(volumes.ambiente, transicoes.retornoDoAmbiente);
        });
      },
      onloaderror: (_id, erro) => {
        avisar(erro);
      },
    });
  }

  return {
    desbloquear(somLigado) {
      if (desbloqueado) return;
      desbloqueado = true;
      ligado = somLigado;
      seguro(() => {
        // O som precisa existir mesmo com a preferência "desligado", para ligar depois funcionar.
        Howler.mute(!somLigado);
        if (sessaoDeAudio) sessaoDeAudio.type = 'playback';
      });
      seguro(() => {
        volumeDoAmbiente = volumes.ambiente;
        ambiente = criarAmbiente();
        for (const nome of NOMES_DE_EFEITO) efeitos[nome] = criarEfeito(nome);
        musica1 = criarMusica1();
        musica2 = criarMusica2();
      });
    },

    efeito(nome) {
      seguro(() => {
        efeitos[nome]?.play();
      });
    },

    musica1() {
      seguro(() => {
        if (!musica1 || idMusica1 !== undefined) return;
        mudarAmbiente(volumes.ambienteSobMusica, transicoes.ambienteSobMusica);
        idMusica1 = entrarNoTrecho(musica1, trechos.inicio1);
      });
    },

    musica2() {
      seguro(() => {
        if (!musica2 || idMusica2 !== undefined) return;
        mudarAmbiente(volumes.ambienteSobMusica, transicoes.ambienteSobMusica);
        if (musica1) {
          musica1Saindo = true;
          // Se a música 1 nunca começou (ainda carregando), `fade` e `stop` ficam na fila do Howler
          // e ela não chega a soar: só a música 2 toca.
          musica1.fade(musica1.volume(), 0, emMilissegundos(transicoes.musica));
        }
        idMusica2 = entrarNoTrecho(musica2, trechos.inicio2);
      });
    },

    ligar(novoEstado) {
      ligado = novoEstado;
      seguro(() => {
        Howler.mute(!novoEstado);
      });
    },

    pausar() {
      seguro(() => {
        Howler.mute(true);
        const tocando: ('musica1' | 'musica2')[] = [];
        if (musica1 && idMusica1 !== undefined && !musica1Saindo) tocando.push('musica1');
        if (musica2 && idMusica2 !== undefined && !musica2Terminou) tocando.push('musica2');
        for (const nome of tocando) {
          if (nome === 'musica1') musica1?.pause(idMusica1);
          else musica2?.pause(idMusica2);
        }
        pausadas = tocando;
      });
    },

    retomar() {
      seguro(() => {
        Howler.mute(!ligado);
        for (const nome of pausadas) {
          if (nome === 'musica1') musica1?.play(idMusica1);
          else musica2?.play(idMusica2);
        }
        pausadas = [];
      });
    },

    parar() {
      seguro(() => {
        Howler.mute(true);
        for (const som of [ambiente, musica1, musica2]) som?.stop();
      });
    },
  };
}

/** `navigator.audioSession`, quando o navegador tem (Safari recente); senão, `undefined`. */
export function obterSessaoDeAudio(navegador: object): { type: string } | undefined {
  const sessao = (navegador as { audioSession?: unknown }).audioSession;
  return typeof sessao === 'object' && sessao !== null && 'type' in sessao
    ? (sessao as { type: string })
    : undefined;
}
