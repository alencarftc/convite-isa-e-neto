import { type Aleatorio, type Intervalo, sortearEntre, sortearInteiro } from './sorteio';

/** Parâmetros das pétalas azuis que caem sem parar sobre o convite aberto (08/11/2026). Posições em frações da tela. */
export interface ParametrosDasPetalas {
  /** Quanto tempo depois de o convidado tocar no selo a primeira pétala cai, em segundos; o pulo pela entrada leva `primeiroEmAoPular`. */
  readonly primeiroEm: number;
  readonly primeiroEmAoPular: number;
  /** Tempo entre uma pétala e a seguinte, em segundos. */
  readonly intervalo: Intervalo;
  /** Quanto dura a queda de uma pétala de ponta a ponta, em segundos; as maiores (mais perto) caem mais depressa. */
  readonly duracao: Intervalo;
  /** Vai e vem lateral, em pixels de cada lado. */
  readonly balanco: Intervalo;
  /** Quantas vezes a pétala troca de lado durante a queda. */
  readonly trocasDeLado: Intervalo;
  /** Giro total máximo, em graus. */
  readonly giro: number;
  /** Largura da pétala em pixels; as menores parecem mais longe. */
  readonly largura: Intervalo;
  /** Opacidade da pétala mais próxima; as de longe são mais fracas. */
  readonly opacidade: number;
  /** A pétala aparece e some nesta fração do início e do fim da queda. */
  readonly esmaecer: number;
  /** Período do "bater de asa" (a pétala vira de lado), em segundos. */
  readonly virar: Intervalo;
  /** Quantas pétalas no ar, no máximo, por nível. */
  readonly maximo: { readonly completo: number; readonly leve: number };
  /**
   * No computador a tela é bem maior e a mesma chuva parecia rala (09/11/2026): o tempo entre pétalas fica
   * `fatorDoIntervalo` vezes o sorteado (menor que 1 acelera) e o limite no ar, `fatorDoMaximo` vezes o do nível.
   */
  readonly noComputador: { readonly fatorDoIntervalo: number; readonly fatorDoMaximo: number };
}

export interface PlanoDaPetala {
  /** Onde ela começa, como fração da largura da tela. */
  readonly x: number;
  /** Largura em pixels. */
  readonly largura: number;
  readonly duracao: number;
  readonly balanco: number;
  readonly trocasDeLado: number;
  /** Giro total em graus, com sinal. */
  readonly giro: number;
  readonly opacidade: number;
  readonly periodoDoVirar: number;
  readonly espelhada: boolean;
  /** Qual das variações de imagem ela usa. */
  readonly variacao: number;
}

/**
 * Sorteia uma pétala: onde cai, o tamanho, a velocidade, quanto balança e gira. Uma "proximidade" sorteada amarra o
 * tamanho, a velocidade e a opacidade: a pétala pequena é lenta e fraca, como se estivesse longe, e a grande, mais
 * rápida e mais nítida. O `aleatorio` é injetado (o domínio não tem `Math.random`).
 */
export function planejarPetala(
  aleatorio: Aleatorio,
  parametros: ParametrosDasPetalas,
  variacoes: number,
): PlanoDaPetala {
  const proximidade = aleatorio();
  const [larguraMinima, larguraMaxima] = parametros.largura;
  const [duracaoMinima, duracaoMaxima] = parametros.duracao;
  return {
    x: aleatorio(),
    largura: larguraMinima + (larguraMaxima - larguraMinima) * proximidade,
    duracao: duracaoMaxima - (duracaoMaxima - duracaoMinima) * proximidade,
    balanco: sortearEntre(parametros.balanco, aleatorio),
    trocasDeLado: sortearInteiro(parametros.trocasDeLado, aleatorio),
    giro: (aleatorio() < 0.5 ? -1 : 1) * parametros.giro * (0.4 + 0.6 * aleatorio()),
    opacidade: 0.5 + (parametros.opacidade - 0.5) * proximidade,
    periodoDoVirar: sortearEntre(parametros.virar, aleatorio),
    espelhada: aleatorio() < 0.5,
    variacao: Math.max(0, Math.min(variacoes - 1, Math.floor(aleatorio() * variacoes))),
  };
}
