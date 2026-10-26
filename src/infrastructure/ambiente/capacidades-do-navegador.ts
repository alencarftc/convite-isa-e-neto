import type { Capacidades } from '@/application/ports/capacidades';

/** O pedaço da janela que importa aqui; `window` serve. */
export interface JanelaComNavegador {
  readonly navigator: {
    readonly userAgent: string;
    readonly platform: string;
    readonly maxTouchPoints: number;
  };
  readonly document: { createElement(tag: 'a'): object };
}

/**
 * Capacidades do navegador (SPEC-17). Na dúvida, a resposta é "não baixa": o Google Agenda funciona
 * em qualquer lugar, e um `.ics` que não baixa deixaria o botão sem efeito.
 */
export function criarCapacidadesDoNavegador(janela: JanelaComNavegador): Capacidades {
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
  };
}
