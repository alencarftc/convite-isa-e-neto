import type { Orientacao } from '../tela/orientacao';

/**
 * Imagens críticas: sem elas o bosque aparece pela metade, então a entrada espera por elas
 * (SPEC-02, RF-02.3). Os números são os da tabela de assets em docs/documentacao.md.
 */
export const CHAVES_CRITICAS = [
  'ceu', // 02 · céu baunilha
  'lago', // 04 · lago e mata ao fundo
  'arvores', // 05 · árvores de moldura
  'primeiroPlano', // 06 · grama e rosas azuis
  'bauFechado', // 08
  'chave', // 10
] as const;

/**
 * Carregamento secundário, na ordem em que as imagens são usadas (SPEC-02, "Ordem do carregamento
 * secundário"). Cada grupo baixa em paralelo; um grupo só começa quando o anterior termina. Os
 * sons e as músicas da tabela original ficam com o áudio (SPEC-08), que os cria no toque.
 * Cada spec de cena acrescenta as suas imagens aqui, no grupo certo.
 */
export const FILA_SECUNDARIA = [
  ['bauAberto', 'petalaA', 'petalaB', 'petalaC'], // 09 e 16 · baú
  ['folhaA', 'folhaB', 'folhaC', 'esquiloEncolhido', 'esquiloEsticado'], // 20a–c e 21a–b · cena viva (épico 13)
  ['ceuPorDoSol'], // 03 · história
  ['envelopeFechado', 'envelopeAberto', 'selo', 'papelCarta', 'papelMiolo', 'chao'], // 12, 13, 15, 14 e o chão · carta
  ['casal'], // 17 · convite
] as const;

type ChaveCritica = (typeof CHAVES_CRITICAS)[number];
type ChaveSecundaria = (typeof FILA_SECUNDARIA)[number][number];

export type ChaveDeImagem = ChaveCritica | ChaveSecundaria;

/**
 * Uma arte única, ou uma por orientação (9:16 na vertical, 16:9 na horizontal; SPEC-03, RF-03.1). `computador` é uma
 * terceira, de quem usa mouse (09/11/2026): no desktop a cena é a pintura mestre 16:9 inteira, como a vertical é a 9:16, e
 * vale em qualquer formato de janela (a janela estreita do navegador não troca a pintura pela do celular, a cena se
 * adapta). Sem a variante, o computador usa a arte horizontal; os celulares e os tablets seguem a orientação.
 */
export type ArteDaImagem =
  | string
  | {
      readonly vertical: string;
      readonly horizontal: string;
      readonly computador?: string;
    };

/** Caminho da imagem na orientação pedida; no computador, a variante dele, ou a horizontal se a arte não a tem. */
export function urlDaImagem(
  arte: ArteDaImagem,
  orientacao: Orientacao,
  computador = false,
): string {
  if (typeof arte === 'string') return arte;
  if (computador) return arte.computador ?? arte.horizontal;
  return arte[orientacao];
}

/** Todos os arquivos da imagem (um, dois ou três). */
export function urlsDaImagem(arte: ArteDaImagem): readonly string[] {
  if (typeof arte === 'string') return [arte];
  return arte.computador === undefined
    ? [arte.vertical, arte.horizontal]
    : [arte.vertical, arte.horizontal, arte.computador];
}
