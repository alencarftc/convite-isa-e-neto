import { vi } from 'vitest';

/**
 * Animações do navegador (`Element.animate`, ADR-0044) falsas: o happy-dom não as roda, então o teste confere o que foi pedido
 * (quadros e opções) e o estado em que a cena as deixou (rodando, pausada, terminada ou cancelada). `terminar()` faz de conta que a
 * animação chegou ao fim: dispara o `onfinish`, como o navegador faria.
 */
export interface AnimacaoFalsa {
  readonly elemento: Element;
  readonly quadros: Keyframe[];
  readonly opcoes: KeyframeAnimationOptions;
  estado: 'running' | 'paused' | 'finished' | 'cancelled';
  onfinish: (() => void) | null;
  /** Quantas vezes `commitStyles()` foi chamado (o estado atual vai para o estilo do elemento). */
  estilosGuardados: number;
  /** O tempo da animação em milissegundos (o teste o escolhe; a cena o lê ao pausar e o devolve ao retomar). */
  currentTime: number;
  /** O `playState` do navegador: cancelada vira `idle`. */
  readonly playState: 'running' | 'paused' | 'finished' | 'idle';
  pause(): void;
  play(): void;
  cancel(): void;
  commitStyles(): void;
  terminar(): void;
}

export interface AnimacoesFalsas {
  /** Todas as animações pedidas, na ordem. */
  readonly todas: AnimacaoFalsa[];
  /** As animações pedidas a um elemento. */
  doElemento(elemento: Element): AnimacaoFalsa[];
  /** As que ainda estão vivas (rodando ou pausadas). */
  vivas(): AnimacaoFalsa[];
  /** Termina todas as que estão rodando (ou as de um elemento), como se o tempo delas tivesse passado. */
  terminarTodas(elemento?: Element): void;
}

/** Põe um `animate` falso em todo elemento; `vi.restoreAllMocks()` (no `afterEach`) o tira. */
export function instalarAnimacoesFalsas(): AnimacoesFalsas {
  const todas: AnimacaoFalsa[] = [];
  vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(function falso(
    this: HTMLElement,
    quadros: Keyframe[] | PropertyIndexedKeyframes | null,
    opcoes?: number | KeyframeAnimationOptions,
  ) {
    const animacao: AnimacaoFalsa = {
      elemento: this,
      quadros: Array.isArray(quadros) ? quadros : [],
      opcoes: typeof opcoes === 'object' ? opcoes : {},
      estado: 'running',
      onfinish: null,
      currentTime: 0,
      estilosGuardados: 0,
      commitStyles() {
        animacao.estilosGuardados += 1;
      },
      get playState() {
        return animacao.estado === 'cancelled' ? 'idle' : animacao.estado;
      },
      pause() {
        if (animacao.estado === 'running') animacao.estado = 'paused';
      },
      play() {
        // Como no navegador, tocar uma animação terminada a faz recomeçar.
        if (animacao.estado !== 'cancelled') animacao.estado = 'running';
      },
      cancel() {
        animacao.estado = 'cancelled';
      },
      terminar() {
        if (animacao.estado !== 'running') return;
        animacao.estado = 'finished';
        animacao.onfinish?.();
      },
    };
    todas.push(animacao);
    return animacao as unknown as Animation;
  });
  return {
    todas,
    doElemento: (elemento) => todas.filter((animacao) => animacao.elemento === elemento),
    vivas: () => todas.filter((a) => a.estado === 'running' || a.estado === 'paused'),
    terminarTodas(elemento) {
      for (const animacao of todas) {
        if (!elemento || animacao.elemento === elemento) animacao.terminar();
      }
    },
  };
}

/** Simula um navegador sem `Element.animate` (o piso de compatibilidade); devolve a função que o restaura. */
export function semAnimate(): () => void {
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    value: undefined,
    configurable: true,
    writable: true,
  });
  return () => {
    Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  };
}
