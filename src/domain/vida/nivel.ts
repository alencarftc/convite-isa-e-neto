/**
 * Quanto de vida a cena tem (SPEC-18, "Níveis"). O nível é escolhido no início e só desce: de
 * `completo` a `leve`, nunca ao contrário, para a cena não oscilar.
 */
export type NivelDeVida = 'completo' | 'leve' | 'desligado';

/** Os níveis em que algo se move: o que cada elemento de vida recebe (`desligado` não inicia nada). */
export type NivelAtivo = Exclude<NivelDeVida, 'desligado'>;

export interface CondicoesDoNivel {
  /** Animação reduzida no aparelho (SPEC-09). */
  readonly reduzido: boolean;
  /** O convidado escolheu "Pausar animação" numa visita anterior (US-13.6). */
  readonly pausadoPeloConvidado: boolean;
  /** Pouca memória ou poucos núcleos (`Capacidades.aparelhoModesto`), ou quadros lentos já medidos. */
  readonly aparelhoModesto: boolean;
}

/** CT-18.1: reduzido ou pausado desliga; aparelho modesto é `leve`; o resto é `completo`. */
export function escolherNivel(condicoes: CondicoesDoNivel): NivelDeVida {
  if (condicoes.reduzido || condicoes.pausadoPeloConvidado) return 'desligado';
  return condicoes.aparelhoModesto ? 'leve' : 'completo';
}

export interface LimitesDeQuadros {
  /** Um quadro mais demorado que isto (em segundos) é "lento". */
  readonly quadroLento: number;
  /** O nível desce quando mais que esta fração dos quadros medidos é lenta. */
  readonly fracaoDeQuadrosLentos: number;
}

/**
 * Decide, com os intervalos entre quadros medidos (em segundos), se a cena aguenta o nível em que
 * está (SPEC-18, "Medição de quadros"). Sem medida não há motivo para descer. CT-18.2.
 */
export function avaliarQuadros(
  intervalos: readonly number[],
  limites: LimitesDeQuadros,
): 'manter' | 'rebaixar' {
  if (intervalos.length === 0) return 'manter';
  const lentos = intervalos.filter((intervalo) => intervalo > limites.quadroLento).length;
  return lentos / intervalos.length > limites.fracaoDeQuadrosLentos ? 'rebaixar' : 'manter';
}
