import {
  type Aleatorio,
  escolherLado,
  type Intervalo,
  type Lado,
  ladoOposto,
  sortearEntre,
  sortearInteiro,
} from './sorteio';

/** Parâmetros dos bandos de pássaros que cruzam o céu (SPEC-20, tabela "Pássaros"). */
export interface ParametrosDePassaros {
  /** Tempo entre o começo de um bando e o do seguinte, em segundos. */
  readonly intervalo: Intervalo;
  readonly tamanhoDoBando: Intervalo;
  /** Quanto cada pássaro se afasta do líder, em pixels. */
  readonly desvio: { readonly x: number; readonly y: number };
  /** Faixa do céu por onde voam, em fração da altura da tela. */
  readonly faixa: Intervalo;
  /** Duração da travessia, em segundos. */
  readonly travessia: Intervalo;
  /** Ondulação vertical do voo: amplitude em pixels e ciclos na travessia. */
  readonly ondulacao: { readonly amplitude: number; readonly ciclos: Intervalo };
  /** Batida das asas: período em segundos e escala vertical no ponto mais baixo (negativa = asas para baixo). */
  readonly asas: { readonly periodo: Intervalo; readonly escalaMinima: number };
  /** Parte dos bandos que plana no meio do caminho, por quanto tempo e com que escala. */
  readonly planar: {
    readonly chance: number;
    readonly duracao: number;
    readonly escala: number;
  };
  /** Largura de cada pássaro, em pixels. */
  readonly largura: Intervalo;
}

export interface PlanoDoPassaro {
  /** Posição em relação ao líder do bando, em pixels. */
  readonly desvio: { readonly x: number; readonly y: number };
  readonly largura: number;
  /** Tempo de uma batida de asas, em segundos. */
  readonly periodo: number;
  /** Defasagem da batida, de 0 a 1 do período: os pássaros não batem juntos. */
  readonly fase: number;
  /** Duração da travessia deste pássaro: os menores (mais longe) são um pouco mais lentos. */
  readonly duracao: number;
}

export interface PlanoDoBando {
  readonly entra: Lado;
  readonly sai: Lado;
  /** Altura do voo, como fração da altura da tela. */
  readonly faixa: number;
  readonly duracao: number;
  readonly ondulacao: { readonly amplitude: number; readonly ciclos: number };
  /** O bando para de bater as asas no meio do caminho. */
  readonly planar: boolean;
  readonly passaros: readonly PlanoDoPassaro[];
}

/** Os mais distantes (menores) levam até 15% a mais para atravessar. */
const LENTIDAO_DOS_DISTANTES = 0.15;

/**
 * Sorteia um bando: de que lado entra, por onde voa, quantos são e como cada um se afasta do líder (SPEC-20).
 * Entra por um lado e sai pelo oposto. CT-20.2.
 */
export function planejarBando(
  aleatorio: Aleatorio,
  parametros: ParametrosDePassaros,
): PlanoDoBando {
  const entra = escolherLado(aleatorio);
  const duracao = sortearEntre(parametros.travessia, aleatorio);
  const quantidade = sortearInteiro(parametros.tamanhoDoBando, aleatorio);
  const [menor, maior] = parametros.largura;
  const passaros = Array.from({ length: quantidade }, (): PlanoDoPassaro => {
    const largura = sortearEntre(parametros.largura, aleatorio);
    // 0 = o menor possível (distante), 1 = o maior (perto).
    const proximidade = maior > menor ? (largura - menor) / (maior - menor) : 1;
    return {
      desvio: {
        x: (aleatorio() * 2 - 1) * parametros.desvio.x,
        // Os distantes ficam um pouco mais altos.
        y:
          (aleatorio() * 2 - 1) * parametros.desvio.y -
          (1 - proximidade) * parametros.desvio.y * 0.5,
      },
      largura,
      periodo: sortearEntre(parametros.asas.periodo, aleatorio),
      fase: aleatorio(),
      duracao: duracao * (1 + (1 - proximidade) * LENTIDAO_DOS_DISTANTES),
    };
  });
  return {
    entra,
    sai: ladoOposto(entra),
    faixa: sortearEntre(parametros.faixa, aleatorio),
    duracao,
    ondulacao: {
      amplitude: parametros.ondulacao.amplitude,
      ciclos: sortearInteiro(parametros.ondulacao.ciclos, aleatorio),
    },
    planar: aleatorio() < parametros.planar.chance,
    passaros,
  };
}
