import type { Capacidades } from '@/application/ports/capacidades';

/** O pedaço da janela que importa aqui; `window` serve. */
export interface JanelaComNavegador {
  readonly navigator: {
    readonly userAgent: string;
    readonly platform: string;
    readonly maxTouchPoints: number;
    /** Só o Chrome informa (em GB, arredondado para baixo a potências de dois). */
    readonly deviceMemory?: number;
    readonly hardwareConcurrency?: number;
  };
  readonly document: { createElement(tag: string): object };
}

/** Memória (GB) e núcleos até os quais o aparelho conta como modesto (SPEC-18, "Níveis"). */
const MEMORIA_MODESTA = 2;
const NUCLEOS_MODESTOS = 4;

/**
 * Capacidades do navegador (SPEC-17, SPEC-18). Na dúvida, a resposta é a conservadora: "não baixa"
 * (o Google Agenda funciona em qualquer lugar, e um `.ics` que não baixa deixaria o botão sem
 * efeito) e "sem WebGL" (a cena fica parada, como a pintura).
 */
export function criarCapacidadesDoNavegador(janela: JanelaComNavegador): Capacidades {
  let webgl: boolean | undefined;

  function sondarWebGL(): boolean {
    try {
      const canvas = janela.document.createElement('canvas') as Partial<
        Pick<HTMLCanvasElement, 'getContext'>
      >;
      // WebGL 1, que existe no piso de compatibilidade; `failIfMajorPerformanceCaveat` recusa o
      // renderizador por software, que seria pior que a imagem parada.
      const contexto = canvas.getContext?.('webgl', { failIfMajorPerformanceCaveat: true });
      if (!contexto) return false;
      // O contexto da sonda é descartado na hora: os navegadores limitam os contextos vivos.
      contexto.getExtension('WEBGL_lose_context')?.loseContext();
      return true;
    } catch {
      return false;
    }
  }

  return {
    baixaArquivos() {
      try {
        const { userAgent, platform, maxTouchPoints } = janela.navigator;
        // O iPad novo se apresenta como Mac, mas é o único "Mac" com tela de toque.
        const apple =
          /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
        return !apple && 'download' in janela.document.createElement('a');
      } catch {
        return false;
      }
    },

    suportaWebGL() {
      webgl ??= sondarWebGL();
      return webgl;
    },

    aparelhoModesto() {
      try {
        const { deviceMemory, hardwareConcurrency } = janela.navigator;
        return (
          (deviceMemory !== undefined && deviceMemory <= MEMORIA_MODESTA) ||
          (hardwareConcurrency !== undefined && hardwareConcurrency <= NUCLEOS_MODESTOS)
        );
      } catch {
        return false;
      }
    },
  };
}
