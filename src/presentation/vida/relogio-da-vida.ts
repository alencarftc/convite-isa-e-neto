import gsap from 'gsap';

/**
 * O relógio de um elemento de vida (SPEC-18, RF-18.3): uma linha do tempo do GSAP onde entra tudo o que o
 * elemento agenda. Pausar o elemento é pausar o relógio; parar é matar a linha com tudo o que está nela.
 * Como segue o `requestAnimationFrame` do GSAP, a aba em segundo plano pausa de graça e nada se acumula
 * quando ela volta.
 *
 * A linha remove sozinha o que termina (`autoRemoveChildren`) e volta a andar quando recebe um filho depois
 * de ter esvaziado, então os elementos podem agendar a vida inteira sem criar uma animação por vez.
 */
export interface RelogioDaVida {
  /** Instante atual da linha, em segundos: a posição de "agora" para quem monta uma animação à mão. */
  agora(): number;
  /** Faz `acao` daqui a `atraso` segundos de relógio da vida (parado, não conta). */
  depois(atraso: number, acao: () => void): void;
  /** Põe a animação na linha, para começar daqui a `atraso` segundos (0 = já), e a devolve. */
  iniciar<A extends gsap.core.Animation>(animacao: A, atraso?: number): A;
  pausar(): void;
  retomar(): void;
  parar(): void;
}

export function criarRelogioDaVida(): RelogioDaVida {
  const linha = gsap.timeline({ autoRemoveChildren: true });
  let parado = false;

  return {
    agora: () => linha.time(),
    depois(atraso, acao) {
      if (parado) return;
      linha.call(acao, [], linha.time() + atraso);
    },
    iniciar(animacao, atraso = 0) {
      if (parado) {
        animacao.kill();
        return animacao;
      }
      linha.add(animacao, linha.time() + atraso);
      return animacao;
    },
    pausar() {
      linha.pause();
    },
    retomar() {
      linha.resume();
    },
    parar() {
      parado = true;
      linha.kill();
    },
  };
}
