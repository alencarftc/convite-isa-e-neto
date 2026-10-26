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
  ['bauAberto'], // 09 · baú e história
  ['ceuPorDoSol'], // 03 · história
] as const;

type ChaveCritica = (typeof CHAVES_CRITICAS)[number];
type ChaveSecundaria = (typeof FILA_SECUNDARIA)[number][number];

export type ChaveDeImagem = ChaveCritica | ChaveSecundaria;

/** Uma arte única, ou uma por orientação (9:16 na vertical, 16:9 na horizontal; SPEC-03, RF-03.1). */
export type ArteDaImagem = string | { readonly vertical: string; readonly horizontal: string };

/** Caminho da imagem na orientação pedida. */
export function urlDaImagem(arte: ArteDaImagem, orientacao: Orientacao): string {
  return typeof arte === 'string' ? arte : arte[orientacao];
}

/** Todos os arquivos da imagem (um ou dois). */
export function urlsDaImagem(arte: ArteDaImagem): readonly string[] {
  return typeof arte === 'string' ? [arte] : [arte.vertical, arte.horizontal];
}
