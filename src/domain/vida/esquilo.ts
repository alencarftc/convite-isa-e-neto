import {
  type Aleatorio,
  escolherLado,
  type Intervalo,
  type Lado,
  ladoOposto,
  sortearEntre,
  sortearInteiro,
} from './sorteio';

/** Como ele se move: pulinhos de sempre, ou aos disparos (pulos longos, baixos e quase sem respiro). */
interface EstiloDePulo {
  /** Quanto cada pulo avança, como fração da largura da tela. */
  readonly distancia: Intervalo;
  /** Altura do pulo, em pixels. */
  readonly altura: Intervalo;
  /** Duração do voo, em segundos. */
  readonly voo: number;
  /** Tempo parado entre um pulo e outro, em segundos. */
  readonly respiro: Intervalo;
}

/** Parâmetros do esquilo que visita a grama (SPEC-21). Posições em frações da tela, salvo onde diz pixels. */
export interface ParametrosDoEsquilo {
  /** A primeira visita acontece tantos segundos depois do início da vida. */
  readonly primeiroEm: number;
  /** Tempo entre o fim de uma visita e o começo da seguinte, em segundos. */
  readonly intervalo: Intervalo;
  /**
   * Largura do esquilo como fração da largura da tela, por orientação; `computador` vale para o mouse com a tela deitada
   * (09/11/2026): ali a cena é a pintura mestre, o casal e os arbustos ficaram maiores, e o esquilo cresceu com eles.
   */
  readonly largura: {
    readonly vertical: number;
    readonly horizontal: number;
    readonly computador: number;
  };
  /**
   * Distância da base da tela até as patas, como fração da altura da tela, por orientação. `computador` é a fração da
   * altura da PINTURA (contada da borda de baixo dela): no desktop a pintura cobre a janela ancorada pela base, e numa
   * janela larga e baixa a fração da janela cairia sobre a água (09/11/2026).
   */
  readonly chao: {
    readonly vertical: number;
    readonly horizontal: number;
    readonly computador: number;
  };
  /** Quantas paradas ele faz dentro da tela, entre a entrada e a saída (inteiros). */
  readonly paradas: Intervalo;
  /** Onde ele para, como fração da largura da tela: o centro do corpo cai nesta faixa ("ao centro"). */
  readonly centro: Intervalo;
  readonly pulo: EstiloDePulo & {
    /** Duração do pouso, em segundos. */
    readonly pouso: number;
    /** O esquilo achata assim ao pousar (`scaleY`) e volta a 1. */
    readonly achatamento: number;
  };
  readonly corrida: EstiloDePulo;
  /**
   * No computador a tela é larga e o esquilo, pequeno: as distâncias em fração da largura faziam cada pulo cobrir
   * vários corpos dele no mesmo tempo do celular, e ele disparava (09/11/2026). `distancia` encurta cada pulo
   * (multiplica a fração de largura) e `voo` alonga o tempo no ar (multiplica a duração). Num primeiro ajuste os pulos
   * ficaram curtos demais e ele "pulava muito": o ponto de equilíbrio são pulos mais longos e um pouco mais rápidos.
   */
  readonly noComputador: { readonly distancia: number; readonly voo: number };
  /** A chance de cada trecho do caminho ser aos disparos, de 0 a 1. */
  readonly chanceDeCorrida: number;
  /** A chance de a visita ser só uma espiada: entra pouco, olha e volta por onde veio, de 0 a 1. */
  readonly chanceDeEspiar: number;
  /** A chance de sair pelo lado oposto ao da entrada, de 0 a 1. */
  readonly chanceDeSairPeloOutroLado: number;
  /** Quanto fica parado em cada parada, em segundos. */
  readonly parada: Intervalo;
  /** Quantas vezes o rabo sacode em cada parada (inteiros). */
  readonly sacudidasDoRabo: Intervalo;
  /** Quantas vezes se vira para olhar o outro lado e voltar, em cada parada (inteiros). */
  readonly olhadas: Intervalo;
  /** Inclinação do corpo em cada sacudida do rabo, em graus. */
  readonly inclinacaoDaSacudida: number;
}

export interface PuloDoEsquilo {
  readonly tipo: 'pulo';
  /** Para onde pula: 1 vai para a direita da tela, -1 para a esquerda. */
  readonly sentido: 1 | -1;
  /** Quanto avança, em pixels. */
  readonly distancia: number;
  /** Quanto sobe e desce, em pixels. */
  readonly altura: number;
  /** Duração do voo, em segundos. */
  readonly voo: number;
  /** Tempo parado depois do pouso, em segundos. */
  readonly respiro: number;
  /** Foi um pulo de corrida. */
  readonly corrida: boolean;
}

export interface ParadaDoEsquilo {
  readonly tipo: 'parada';
  readonly duracao: number;
  /** Quantas vezes o rabo sacode. */
  readonly sacudidas: number;
  /** Quantas vezes se vira para o outro lado e volta. */
  readonly olhadas: number;
}

export type PassoDoEsquilo = PuloDoEsquilo | ParadaDoEsquilo;

export interface PlanoDaVisita {
  /** O lado da tela por onde entra. */
  readonly lado: Lado;
  /** O lado por onde sai: o mesmo da entrada, ou o oposto. */
  readonly ladoDaSaida: Lado;
  /** Do primeiro pulo, de fora da tela, ao último, também para fora dela. */
  readonly passos: readonly PassoDoEsquilo[];
}

export interface CenarioDaVisita {
  readonly larguraDaTela: number;
  /**
   * A largura da pintura que cobre a tela, base das distâncias dos pulos (em fração dela). É a da tela no celular; no
   * computador, numa janela mais alta que larga, a pintura é mais larga que a tela e os pulos acompanham o tamanho dele.
   */
  readonly larguraDaCena?: number;
  readonly larguraDoEsquilo: number;
  /** A visita é no computador: pulos mais curtos e mais lentos (`ParametrosDoEsquilo.noComputador`). */
  readonly computador?: boolean;
}

/** Uma espiada mostra o esquilo inteiro a esta faixa da largura da tela, a partir da borda por onde entra. */
const FAIXA_DA_ESPIADA: Intervalo = [0.02, 0.12];
/** Sobra menor que isto, em fração do menor pulo, é absorvida pelo último pulo, em vez de virar um pulinho à parte. */
const SOBRA_ABSORVIDA = 0.5;

/**
 * Planeja uma visita (SPEC-21): o esquilo entra por um lado, pula até algumas paradas ao centro da tela (de onde vem
 * a graça: o número delas, o ponto de cada uma, o jeito de ir, se é aos pulinhos ou aos disparos, o que faz em cada
 * parada e por onde sai são sorteados), e sai da tela. Com `chanceDeEspiar` a visita é só uma espiada: ele aparece
 * perto da borda, olha e volta por onde veio. Nada aqui depende do baú: ele passa por trás do baú, no desenho.
 * Devolve sempre um plano; `aleatorio` é injetado para o teste fixar a sequência.
 */
export function planejarVisita(
  aleatorio: Aleatorio,
  parametros: ParametrosDoEsquilo,
  cenario: CenarioDaVisita,
): PlanoDaVisita {
  const { larguraDaTela, larguraDoEsquilo } = cenario;
  const larguraDosPulos = cenario.larguraDaCena ?? larguraDaTela;
  const escalaDaDistancia = cenario.computador ? parametros.noComputador.distancia : 1;
  const escalaDoVoo = cenario.computador ? parametros.noComputador.voo : 1;
  const lado = escolherLado(aleatorio);
  const espiar = aleatorio() < parametros.chanceDeEspiar;
  const sairPeloOutro = aleatorio() < parametros.chanceDeSairPeloOutroLado;
  const ladoDaSaida = !espiar && sairPeloOutro ? ladoOposto(lado) : lado;

  // `x` é a borda esquerda do esquilo: ele parte e chega inteiro fora da tela.
  const foraEsquerda = -larguraDoEsquilo;
  const foraDireita = larguraDaTela;
  let x = lado === 'esquerda' ? foraEsquerda : foraDireita;

  const alvos: number[] = [];
  if (espiar) {
    const folga = sortearEntre(FAIXA_DA_ESPIADA, aleatorio) * larguraDaTela;
    alvos.push(lado === 'esquerda' ? folga : larguraDaTela - larguraDoEsquilo - folga);
  } else {
    const quantas = sortearInteiro(parametros.paradas, aleatorio);
    for (let i = 0; i < quantas; i += 1) {
      alvos.push(sortearEntre(parametros.centro, aleatorio) * larguraDaTela - larguraDoEsquilo / 2);
    }
  }
  const saida = ladoDaSaida === 'esquerda' ? foraEsquerda : foraDireita;

  const passos: PassoDoEsquilo[] = [];

  /** Vai de `x` até `alvo` em pulos, todos do mesmo estilo; o último cobre o que falta. */
  function andarAte(alvo: number): void {
    const corrida = aleatorio() < parametros.chanceDeCorrida;
    const estilo = corrida ? parametros.corrida : parametros.pulo;
    const sentido = alvo >= x ? 1 : -1;
    const menor = estilo.distancia[0] * larguraDosPulos * escalaDaDistancia;
    let restante = Math.abs(alvo - x);
    while (restante > 1e-6) {
      let distancia =
        sortearEntre(estilo.distancia, aleatorio) * larguraDosPulos * escalaDaDistancia;
      if (distancia > restante || restante - distancia < menor * SOBRA_ABSORVIDA) {
        distancia = restante;
      }
      passos.push({
        tipo: 'pulo',
        sentido,
        distancia,
        altura: sortearEntre(estilo.altura, aleatorio),
        voo: estilo.voo * escalaDoVoo,
        respiro: sortearEntre(estilo.respiro, aleatorio),
        corrida,
      });
      restante -= distancia;
      x += sentido * distancia;
    }
  }

  for (const alvo of alvos) {
    andarAte(alvo);
    passos.push({
      tipo: 'parada',
      duracao: sortearEntre(parametros.parada, aleatorio),
      sacudidas: sortearInteiro(parametros.sacudidasDoRabo, aleatorio),
      olhadas: sortearInteiro(parametros.olhadas, aleatorio),
    });
  }
  andarAte(saida);

  return { lado, ladoDaSaida, passos };
}
