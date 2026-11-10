import type { NivelAtivo } from '@/domain/vida/nivel';

/**
 * Um movimento de ambiente da cena viva (SPEC-18, RF-18.2): água, folhas, pássaros, esquilo, casal. A cena
 * viva só conhece este contrato; cada elemento cuida do próprio DOM e do próprio relógio (`RelogioDaVida`).
 * `parar` é definitivo e tira do DOM tudo o que o elemento criou.
 */
export interface ElementoDeVida {
  /** A vida começou, no nível `completo` ou `leve` (o `desligado` nunca inicia nada). */
  iniciar(nivel: NivelAtivo): void;
  /** O aparelho não aguentou: o nível desceu (só desce, nunca sobe). */
  aoMudarNivel(nivel: NivelAtivo): void;
  /** Congela no lugar: a carta cobriu a cena, ou o convidado pediu para pausar. */
  pausar(): void;
  retomar(): void;
  parar(): void;
}
