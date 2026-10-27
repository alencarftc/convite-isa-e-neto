import type { Orientacao } from '../tela/orientacao';
import {
  type Aleatorio,
  escolherItem,
  type Intervalo,
  sortearEntre,
  sortearInteiro,
} from './sorteio';

/** Parâmetros das folhas que caem da copa (SPEC-20, tabela "Folhas"). Posições em frações da tela. */
export interface ParametrosDeFolha {
  /** Tempo entre uma folha e a seguinte, em segundos. */
  readonly intervalo: Intervalo;
  /** Quanto dura a queda de uma folha de trás, em segundos. */
  readonly duracao: Intervalo;
  /** Vai e vem lateral, em pixels de cada lado. */
  readonly balanco: Intervalo;
  /** Quantas vezes a folha troca de lado durante a queda. */
  readonly trocasDeLado: Intervalo;
  /** Giro total máximo, em graus. */
  readonly giro: number;
  /** Largura da folha como fração da largura da tela. */
  readonly largura: { readonly fundo: Intervalo; readonly frente: Intervalo };
  /** Parte das folhas que passa pela frente do baú, maiores e mais rápidas. */
  readonly fracaoNaFrente: number;
  /** A folha da frente cai tantas vezes mais depressa. */
  readonly aceleracaoNaFrente: number;
  /** A copa da árvore da direita, de onde as folhas se soltam, por orientação. */
  readonly copa: Readonly<Record<Orientacao, { readonly x: Intervalo; readonly y: Intervalo }>>;
  /** Altura em que a folha some, como fração da altura da tela (o chão do primeiro plano). */
  readonly chao: Intervalo;
  /** A folha esmaece nesta fração final da queda. */
  readonly esmaecerNoFim: number;
  /** A folha aparece por esmaecimento nesse tempo, em segundos, logo que se solta. */
  readonly aparece: number;
  /** A folha "vira" no balanço: inclinação em graus de cada lado. */
  readonly inclinacao: number;
  /** Largura mínima de uma folha, em pixels (telas estreitas não a deixam virar um ponto). */
  readonly larguraMinima: number;
}

export type VariacaoDeFolha = 'a' | 'b' | 'c';

export interface PlanoDaFolha {
  /** Onde a folha se solta, em frações da tela. */
  readonly origem: { readonly x: number; readonly y: number };
  /** Altura em que a queda termina, como fração da altura da tela. */
  readonly chao: number;
  readonly duracao: number;
  /** Quanto ela se desvia para cada lado, em pixels. */
  readonly balanco: number;
  readonly trocasDeLado: number;
  /** Giro total em graus, com sinal. */
  readonly giro: number;
  /** Vai pela frente do baú (maior e mais rápida) em vez de por trás. */
  readonly frente: boolean;
  readonly espelhada: boolean;
  /** Largura como fração da largura da tela. */
  readonly largura: number;
  readonly variacao: VariacaoDeFolha;
}

const VARIACOES: readonly VariacaoDeFolha[] = ['a', 'b', 'c'];

/**
 * Sorteia uma folha: de onde se solta, até onde cai, quanto balança e gira, e se passa por trás ou pela
 * frente do baú (SPEC-20). O `aleatorio` é injetado: os testes passam uma sequência fixa. CT-20.1.
 */
export function planejarFolha(
  aleatorio: Aleatorio,
  parametros: ParametrosDeFolha,
  orientacao: Orientacao,
): PlanoDaFolha {
  const frente = aleatorio() < parametros.fracaoNaFrente;
  const copa = parametros.copa[orientacao];
  const duracao = sortearEntre(parametros.duracao, aleatorio);
  return {
    origem: { x: sortearEntre(copa.x, aleatorio), y: sortearEntre(copa.y, aleatorio) },
    chao: sortearEntre(parametros.chao, aleatorio),
    duracao: frente ? duracao / parametros.aceleracaoNaFrente : duracao,
    balanco: sortearEntre(parametros.balanco, aleatorio),
    trocasDeLado: sortearInteiro(parametros.trocasDeLado, aleatorio),
    // De 40% do giro máximo ao máximo, para um dos dois lados.
    giro:
      (aleatorio() < 0.5 ? -1 : 1) *
      sortearEntre([parametros.giro * 0.4, parametros.giro], aleatorio),
    frente,
    espelhada: aleatorio() < 0.5,
    largura: sortearEntre(frente ? parametros.largura.frente : parametros.largura.fundo, aleatorio),
    variacao: escolherItem(VARIACOES, aleatorio) ?? 'a',
  };
}
