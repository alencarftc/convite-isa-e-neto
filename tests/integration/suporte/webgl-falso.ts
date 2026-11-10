import { vi } from 'vitest';

export interface ChamadaFalsa {
  readonly nome: string;
  readonly argumentos: readonly unknown[];
}

export interface WebGLFalso {
  /** Todas as chamadas feitas ao contexto, na ordem. */
  readonly chamadas: ChamadaFalsa[];
  /** Quantas vezes o método foi chamado. */
  contar(nome: string): number;
  /** Os argumentos da última chamada do método, ou `undefined`. */
  ultima(nome: string): readonly unknown[] | undefined;
  /** O valor que a última chamada de `uniform*` deu ao uniforme de nome `uniforme`. */
  valorDoUniforme(uniforme: string): readonly unknown[] | undefined;
  /** Devolve o `getContext` do canvas ao que era. */
  desinstalar(): void;
}

/**
 * Um contexto WebGL falso: aceita qualquer chamada, registra tudo e responde o mínimo para o motor da
 * ondulação montar o programa (compilou, ligou). O happy-dom não tem WebGL; com isto os testes conferem o ciclo
 * de vida e as chamadas de desenho, não o GLSL (que se confere no navegador).
 */
export function instalarWebGLFalso(): WebGLFalso {
  const chamadas: ChamadaFalsa[] = [];
  const contexto = new Proxy(
    {},
    {
      get(_alvo, nome) {
        if (typeof nome !== 'string') return undefined;
        // Constantes (`gl.TRIANGLES`, `gl.COMPILE_STATUS`…): um número qualquer.
        if (/^[A-Z][A-Z0-9_]*$/.test(nome)) return 1;
        return (...argumentos: unknown[]) => {
          chamadas.push({ nome, argumentos });
          if (nome === 'getShaderParameter' || nome === 'getProgramParameter') return true;
          if (nome === 'getAttribLocation') return 0;
          if (nome === 'getUniformLocation') return { uniforme: argumentos[1] };
          if (nome === 'getExtension') {
            return { loseContext: () => chamadas.push({ nome: 'loseContext', argumentos: [] }) };
          }
          if (nome.startsWith('create')) return {};
          return undefined;
        };
      },
    },
  );
  const anterior = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext');
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: vi.fn(() => contexto),
  });

  return {
    chamadas,
    contar: (nome) => chamadas.filter((chamada) => chamada.nome === nome).length,
    ultima: (nome) => chamadas.filter((chamada) => chamada.nome === nome).at(-1)?.argumentos,
    valorDoUniforme(uniforme) {
      const chamada = chamadas
        .filter(
          (c) =>
            c.nome.startsWith('uniform') &&
            (c.argumentos[0] as { uniforme?: unknown } | undefined)?.uniforme === uniforme,
        )
        .at(-1);
      return chamada?.argumentos.slice(1);
    },
    desinstalar() {
      if (anterior) Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', anterior);
      else Reflect.deleteProperty(HTMLCanvasElement.prototype, 'getContext');
    },
  };
}
