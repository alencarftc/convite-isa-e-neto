import type { Temporizador } from '@/application/ports/temporizador';

/** Temporizador real: `esperar` resolve depois do tempo, em segundos (como no GSAP). */
export function criarTemporizador(): Temporizador {
  return {
    esperar: (segundos) =>
      new Promise((resolver) => {
        setTimeout(resolver, segundos * 1000);
      }),
  };
}
