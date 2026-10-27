import gsap from 'gsap';

/**
 * Relógio manual do GSAP: o teste decide quando o tempo passa. Tira o `updateRoot` do ticker, para a linha
 * do tempo global só andar quando `avancar` manda (o `vi.useFakeTimers` não alcança o GSAP, que guarda o
 * relógio do navegador ao ser carregado). `restaurar` devolve o ticker ao normal: chame no `afterEach`.
 */
export function criarRelogioManual(): {
  avancar: (segundos: number, passo?: number) => void;
  restaurar: () => void;
} {
  gsap.ticker.remove(gsap.updateRoot);
  return {
    avancar(segundos, passo = 0.05) {
      let restante = segundos;
      while (restante > 1e-9) {
        const parte = Math.min(passo, restante);
        gsap.updateRoot(gsap.globalTimeline.time() + parte);
        restante -= parte;
      }
    },
    restaurar() {
      gsap.ticker.add(gsap.updateRoot);
    },
  };
}
