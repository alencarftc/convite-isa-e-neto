import type { EventosConvite } from '@/domain/eventos/eventos-convite';

import type { BarramentoEventos } from '../barramento-eventos';
import type { EstadoConvite } from '../estado-convite';
import type { AudioPort } from '../ports/audio';

export interface DependenciasDoAudio {
  readonly audio: AudioPort;
  readonly eventos: BarramentoEventos<EventosConvite>;
  readonly estado: EstadoConvite;
  /** Registra o aviso sem derrubar o convite; o som nunca é condição para a animação (RF-08.8). */
  readonly avisar: (erro: unknown) => void;
}

export interface AudioDoConvite {
  /** O convidado saiu do aplicativo ou bloqueou a tela (RF-08.7). */
  aoSair(): void;
  /** O convidado voltou. */
  aoVoltar(): void;
  /** Para de ouvir o barramento. */
  destruir(): void;
}

/**
 * Liga o áudio aos eventos das cenas (SPEC-08, tabela "Comportamento"). Cada comando é protegido:
 * um erro de som vira aviso e nunca sobe ao emissor do evento, para não acionar o modo de
 * segurança por causa de um arquivo de áudio.
 */
export function conectarAudio({
  audio,
  eventos,
  estado,
  avisar,
}: DependenciasDoAudio): AudioDoConvite {
  function protegido(comando: () => void): void {
    try {
      comando();
    } catch (erro) {
      avisar(erro);
    }
  }

  const cancelar = [
    eventos.on('entrada:tocou', ({ escolha }) => {
      protegido(() => {
        audio.desbloquear(estado.somLigado);
        // Pular ou animação reduzida não passam pelo envelope: a música 2 entra direto.
        if (escolha === 'pular' || estado.reduzido) audio.musica2();
      });
    }),
    eventos.on('bau:girou', () => {
      protegido(() => {
        audio.efeito('fechadura');
      });
    }),
    eventos.on('bau:abriu', () => {
      protegido(() => {
        audio.efeito('tampa');
      });
    }),
    eventos.on('historia:inicio', () => {
      protegido(() => {
        audio.musica1();
      });
    }),
    eventos.on('carta:abrindo', () => {
      protegido(() => {
        audio.efeito('selo');
      });
      protegido(() => {
        audio.musica2();
      });
    }),
    eventos.on('som:alterado', ({ ligado }) => {
      protegido(() => {
        estado.definirSom(ligado);
        audio.ligar(ligado);
      });
    }),
    eventos.on('seguranca', () => {
      protegido(() => {
        audio.parar();
      });
    }),
  ];

  return {
    aoSair() {
      protegido(() => {
        audio.pausar();
      });
    },
    aoVoltar() {
      protegido(() => {
        audio.retomar();
      });
    },
    destruir() {
      for (const parar of cancelar) parar();
    },
  };
}
