import type { ConfigConvite } from '../../src/domain/config/config-convite';
import type { ConteudoConvite } from '../../src/domain/conteudo/conteudo-convite';
import {
  type ChaveDeImagem,
  CHAVES_CRITICAS,
  urlsDaImagem,
} from '../../src/domain/imagens/catalogo-de-imagens';
import type { Problema } from './problema';

/**
 * Orçamento de peso (SPEC-12, "Orçamento de peso"). Os números são os da spec, por arquivo e por
 * grupo. O JavaScript e o HTML ficam com o `size-limit` (depois do build); aqui vão os arquivos de
 * `public/`, que o convidado baixa.
 */
const KB = 1024;
const MB = 1024 * KB;

/** Limite de cada imagem do manifesto, na orientação em que ela é baixada. */
export const LIMITE_DAS_IMAGENS: Readonly<Record<ChaveDeImagem, number>> = {
  ceu: 300 * KB, // 02
  lago: 150 * KB, // 04
  arvores: 300 * KB, // 05
  primeiroPlano: 250 * KB, // 06
  bauFechado: 150 * KB, // 08
  chave: 50 * KB, // 10
  bauAberto: 150 * KB, // 09
  ceuPorDoSol: 300 * KB, // 03
  balaoA: 80 * KB, // 11a
  balaoB: 80 * KB,
  balaoC: 80 * KB,
  envelopeFechado: 120 * KB, // 12
  envelopeAberto: 120 * KB, // 13
  papelCarta: 150 * KB, // 14
  selo: 40 * KB, // 15
  petalaA: 15 * KB, // 16a
  petalaB: 15 * KB,
  petalaC: 15 * KB,
  casal: 150 * KB, // 17
  cursorChave: 10 * KB, // 48 px, derivado da 10
};

/** Fotos dos balões (SPEC-05, RNF-05.3), prévia do link (SPEC-10, RF-10.2) e fontes (RNF da SPEC-02). */
export const LIMITE_DE_FOTO = 120 * KB;
export const LIMITE_DA_PREVIA = 300 * KB;
export const LIMITE_DE_FONTE = 50 * KB;

/** Áudio, por arquivo (SPEC-08, "Arquivos de áudio"). */
export const LIMITE_DOS_AUDIOS: Readonly<Record<string, number>> = {
  'audio/ambiente.mp3': 400 * KB,
  'audio/fechadura.mp3': 20 * KB,
  'audio/tampa.mp3': 25 * KB,
  'audio/selo.mp3': 20 * KB,
  'audio/musica-1.mp3': 1 * MB + 100 * KB, // "cerca de 1 MB"
  'audio/musica-2.mp3': 3 * MB, // "cerca de 2,9 MB"
};

/** Carregamento crítico: imagens da orientação atual + fontes; a meta é até 1,8 MB com o código. */
export const LIMITE_DO_CRITICO = 1.45 * MB;
/** Experiência inteira, com uma orientação de cada arte (meta da spec: até 8 MB). */
export const LIMITE_DA_EXPERIENCIA = 8 * MB;

/** As duas fontes carregadas já na entrada (pré-carregadas no `<head>`). */
const FONTES_DA_ENTRADA = ['fonts/great-vibes-400.woff2', 'fonts/cormorant-garamond-400.woff2'];

export type TamanhoDe = (caminho: string) => number | undefined;

function formatar(bytes: number): string {
  return bytes >= MB ? `${(bytes / MB).toFixed(2)} MB` : `${(bytes / KB).toFixed(1)} KB`;
}

/** O maior arquivo da imagem entre as orientações: o pior caso que um aparelho baixa. */
function pesoDaImagem(arte: ConfigConvite['imagens'][ChaveDeImagem], tamanhoDe: TamanhoDe): number {
  return Math.max(0, ...urlsDaImagem(arte).map((url) => tamanhoDe(url) ?? 0));
}

/**
 * Peso por arquivo e por grupo (SPEC-12, "Checagem automática"). Arquivo que ainda não existe não
 * tem peso: quem acusa é `arquivo-ausente`.
 */
export function validarPeso(
  config: ConfigConvite,
  conteudo: Pick<ConteudoConvite, 'baloes'>,
  arquivosDeAudio: readonly string[],
  fontes: readonly string[],
  tamanhoDe: TamanhoDe,
): Problema[] {
  const problemas: Problema[] = [];
  const conferir = (origem: string, caminho: string, limite: number) => {
    const tamanho = tamanhoDe(caminho);
    if (tamanho !== undefined && tamanho > limite) {
      problemas.push({
        regra: 'peso',
        mensagem: `${origem}: "public/${caminho}" tem ${formatar(tamanho)} e o limite é ${formatar(limite)}`,
      });
    }
  };

  for (const [chave, arte] of Object.entries(config.imagens) as [
    ChaveDeImagem,
    ConfigConvite['imagens'][ChaveDeImagem],
  ][]) {
    for (const url of urlsDaImagem(arte)) {
      conferir(`config.imagens.${chave}`, url, LIMITE_DAS_IMAGENS[chave]);
    }
  }
  conteudo.baloes.forEach((balao, indice) => {
    conferir(`content.baloes[${String(indice)}].foto`, balao.foto, LIMITE_DE_FOTO);
  });
  conferir('config.publicacao.imagemDaPrevia', config.publicacao.imagemDaPrevia, LIMITE_DA_PREVIA);
  for (const fonte of fontes) conferir('fonte', fonte, LIMITE_DE_FONTE);
  for (const audio of arquivosDeAudio) {
    const limite = LIMITE_DOS_AUDIOS[audio];
    if (limite !== undefined) conferir('áudio', audio, limite);
  }

  const critico =
    CHAVES_CRITICAS.reduce(
      (soma, chave) => soma + pesoDaImagem(config.imagens[chave], tamanhoDe),
      0,
    ) + FONTES_DA_ENTRADA.reduce((soma, fonte) => soma + (tamanhoDe(fonte) ?? 0), 0);
  if (critico > LIMITE_DO_CRITICO) {
    problemas.push({
      regra: 'peso',
      mensagem: `carregamento crítico (imagens e fontes da entrada) tem ${formatar(critico)} e o limite é ${formatar(LIMITE_DO_CRITICO)}`,
    });
  }

  const todos = [
    ...Object.values(config.imagens).map((arte) => pesoDaImagem(arte, tamanhoDe)),
    ...conteudo.baloes.map((balao) => tamanhoDe(balao.foto) ?? 0),
    ...arquivosDeAudio.map((audio) => tamanhoDe(audio) ?? 0),
    ...fontes.map((fonte) => tamanhoDe(fonte) ?? 0),
  ].reduce((soma, peso) => soma + peso, 0);
  if (todos > LIMITE_DA_EXPERIENCIA) {
    problemas.push({
      regra: 'peso',
      mensagem: `a experiência inteira tem ${formatar(todos)} e o limite é ${formatar(LIMITE_DA_EXPERIENCIA)}`,
    });
  }
  return problemas;
}

/**
 * Referências a arquivos de `public/` (caminhos que começam com `/`) em CSS e HTML, como as fontes:
 * todas precisam existir (SPEC-12, "Assets ausentes").
 */
export function encontrarArquivosCitados(
  arquivos: readonly { readonly caminho: string; readonly texto: string }[],
): { origem: string; caminho: string }[] {
  const citados: { origem: string; caminho: string }[] = [];
  for (const { caminho: origem, texto } of arquivos) {
    if (!/\.(css|html)$/.test(origem)) continue;
    for (const [, caminho] of texto.matchAll(
      /(?:url\(\s*['"]?|href=")\/([^'")\s]+\.[a-z0-9]+)/gi,
    )) {
      if (caminho) citados.push({ origem, caminho });
    }
  }
  return citados;
}

export function validarArquivosCitados(
  arquivos: readonly { readonly caminho: string; readonly texto: string }[],
  existe: (caminho: string) => boolean,
): Problema[] {
  return encontrarArquivosCitados(arquivos)
    .filter(({ caminho }) => !existe(caminho))
    .map(({ origem, caminho }) => ({
      regra: 'arquivo-ausente',
      mensagem: `${origem}: cita "/${caminho}", que não existe em public/`,
    }));
}
