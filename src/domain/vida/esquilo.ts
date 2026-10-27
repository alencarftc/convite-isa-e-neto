import { type Fase, FASES } from '../fase/fase';
import {
  type Aleatorio,
  escolherLado,
  type Intervalo,
  type Lado,
  ladoOposto,
  sortearEntre,
  sortearInteiro,
} from './sorteio';

/** Parâmetros do esquilo que visita a grama (SPEC-21). Posições em frações da tela, salvo onde diz pixels. */
export interface ParametrosDoEsquilo {
  /** A primeira visita acontece tantos segundos depois do início da vida. */
  readonly primeiroEm: number;
  /** Tempo entre o fim de uma visita e o começo da seguinte, em segundos. */
  readonly intervalo: Intervalo;
  /** Largura do esquilo como fração da largura da tela, por orientação. */
  readonly largura: { readonly vertical: number; readonly horizontal: number };
  /** Distância da base da tela até as patas, como fração da altura da tela, por orientação. */
  readonly chao: { readonly vertical: number; readonly horizontal: number };
  /** Quantos pulos até o ponto de parada. */
  readonly pulos: Intervalo;
  readonly pulo: {
    /** Quanto cada pulo avança, como fração da largura da tela. */
    readonly distancia: Intervalo;
    /** Altura do pulo, em pixels. */
    readonly altura: Intervalo;
    /** Duração do voo e do pouso, em segundos. */
    readonly voo: number;
    readonly pouso: number;
    /** O esquilo achata assim ao pousar (`scaleY`) e volta a 1. */
    readonly achatamento: number;
    /** Tempo parado entre um pulo e outro, em segundos. */
    readonly respiro: Intervalo;
  };
  /** Distância que o esquilo respeita do baú, como fração da largura da tela. */
  readonly folgaDoBau: number;
  /** Quanto ele fica parado olhando em volta, em segundos. */
  readonly parada: Intervalo;
  readonly sacudidasDoRabo: number;
  /** Inclinação do corpo em cada sacudida do rabo, em graus. */
  readonly inclinacaoDaSacudida: number;
}

export interface PuloDoEsquilo {
  /** Quanto avança, em pixels. */
  readonly distancia: number;
  /** Quanto sobe e desce, em pixels. */
  readonly altura: number;
  /** Tempo parado depois do pouso, em segundos. */
  readonly respiro: number;
}

export interface PlanoDaVisita {
  /** O lado da tela por onde entra (e por onde volta). */
  readonly lado: Lado;
  readonly pulosDeIda: readonly PuloDoEsquilo[];
  /** Quanto fica parado, em segundos. */
  readonly parada: number;
  /** Quantas vezes se vira nessa parada (para o outro lado e de volta). */
  readonly olhadas: number;
  readonly pulosDeVolta: readonly PuloDoEsquilo[];
}

export interface CenarioDaVisita {
  readonly larguraDaTela: number;
  /** As bordas do baú na tela, em pixels. */
  readonly bau: { readonly esquerda: number; readonly direita: number };
}

/** Ele se vira para o outro lado e volta a se virar. */
const OLHADAS = 2;
/** Menos pulos que isto não é uma visita (RF-21.2). */
const MINIMO_DE_PULOS = 2;

function sortearPulo(
  aleatorio: Aleatorio,
  parametros: ParametrosDoEsquilo,
  larguraDaTela: number,
): PuloDoEsquilo {
  const { distancia, altura, respiro } = parametros.pulo;
  return {
    distancia: sortearEntre(distancia, aleatorio) * larguraDaTela,
    altura: sortearEntre(altura, aleatorio),
    respiro: sortearEntre(respiro, aleatorio),
  };
}

/**
 * Planeja uma visita: o esquilo entra por um lado, avança aos pulos até um ponto de parada que deixa folga antes
 * do baú, olha em volta e volta por onde veio (SPEC-21). Devolve `null` se não houver espaço para pelo menos dois
 * pulos entre a borda e a folga do baú (telas estreitas): a visita é cancelada e a próxima se agenda normalmente.
 * Se um lado não tem espaço, tenta o outro. CT-21.1 e CT-21.2.
 */
export function planejarVisita(
  aleatorio: Aleatorio,
  parametros: ParametrosDoEsquilo,
  cenario: CenarioDaVisita,
): PlanoDaVisita | null {
  const { larguraDaTela, bau } = cenario;
  const folga = parametros.folgaDoBau * larguraDaTela;
  const primeiro = escolherLado(aleatorio);
  for (const lado of [primeiro, ladoOposto(primeiro)]) {
    // O esquilo parte inteiro fora da tela, encostado na borda: andar `espaco` o leva até a folga antes do baú, com o
    // lado voltado para o baú (a direita, se vem da esquerda) a essa distância dele.
    const espaco =
      lado === 'esquerda' ? bau.esquerda - folga : larguraDaTela - (bau.direita + folga);
    const menorPulo = parametros.pulo.distancia[0] * larguraDaTela;
    if (espaco < MINIMO_DE_PULOS * menorPulo) continue;

    const quantos = sortearInteiro(parametros.pulos, aleatorio);
    const ida: PuloDoEsquilo[] = [];
    let andado = 0;
    for (let i = 0; i < quantos; i += 1) {
      const pulo = sortearPulo(aleatorio, parametros, larguraDaTela);
      if (andado + pulo.distancia > espaco) break;
      ida.push(pulo);
      andado += pulo.distancia;
    }
    if (ida.length < MINIMO_DE_PULOS) continue;

    // A volta cobre o que foi andado até sair da tela, em pulos como os da ida.
    const volta: PuloDoEsquilo[] = [];
    let voltado = 0;
    while (voltado < andado) {
      const pulo = sortearPulo(aleatorio, parametros, larguraDaTela);
      volta.push(pulo);
      voltado += pulo.distancia;
    }
    return {
      lado,
      pulosDeIda: ida,
      parada: sortearEntre(parametros.parada, aleatorio),
      olhadas: OLHADAS,
      pulosDeVolta: volta,
    };
  }
  return null;
}

/** O esquilo só visita antes de o envelope pousar: da entrada até a história (SPEC-21, RF-21.x). */
export function visitaPermitida(fase: Fase): boolean {
  return FASES.indexOf(fase) < FASES.indexOf('carta');
}
