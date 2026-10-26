import type { ConfigConvite } from '../../src/domain/config/config-convite';
import type { ConteudoConvite } from '../../src/domain/conteudo/conteudo-convite';
import { urlsDaImagem } from '../../src/domain/imagens/catalogo-de-imagens';

/**
 * Regras do gate de publicação (SPEC-12, "Checagem automática"). São funções
 * puras, para testar sem tocar o disco. O orçamento de peso é conferido pelo
 * `size-limit`; o <noscript> entra quando existir (SPEC-09).
 */
export interface Problema {
  readonly regra: string;
  readonly mensagem: string;
}

const TEXTO_PENDENTE = /\[[^\]]+\]/;
const DATA_COM_FUSO_BRASILIA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/;

/** Texto entre colchetes, como `[verso do louvor]`, é pendência de conteúdo. */
export function encontrarTextoPendente(valor: unknown, caminho = 'content'): Problema[] {
  if (typeof valor === 'string') {
    return TEXTO_PENDENTE.test(valor)
      ? [{ regra: 'texto-pendente', mensagem: `${caminho}: "${valor}"` }]
      : [];
  }
  if (Array.isArray(valor)) {
    return valor.flatMap((item: unknown, indice) =>
      encontrarTextoPendente(item, `${caminho}[${indice}]`),
    );
  }
  if (typeof valor === 'object' && valor !== null) {
    return Object.entries(valor).flatMap(([chave, item]) =>
      encontrarTextoPendente(item, `${caminho}.${chave}`),
    );
  }
  return [];
}

export function validarDatas(config: ConfigConvite): Problema[] {
  const datas = { casamento: config.casamento, prazoConfirmacao: config.prazoConfirmacao };
  const problemas: Problema[] = [];

  for (const [nome, valor] of Object.entries(datas)) {
    if (!DATA_COM_FUSO_BRASILIA.test(valor) || Number.isNaN(Date.parse(valor))) {
      problemas.push({
        regra: 'datas',
        mensagem: `config.${nome} precisa ser uma data válida com fuso -03:00: "${valor}"`,
      });
    }
  }

  if (
    problemas.length === 0 &&
    Date.parse(config.prazoConfirmacao) >= Date.parse(config.casamento)
  ) {
    problemas.push({
      regra: 'datas',
      mensagem: 'config.prazoConfirmacao precisa ser anterior a config.casamento',
    });
  }
  return problemas;
}

export function validarLinks(config: ConfigConvite): Problema[] {
  return Object.entries(config.links)
    .filter(([, url]) => !url.startsWith('https://'))
    .map(([nome, url]) => ({
      regra: 'links',
      mensagem: `config.links.${nome} precisa começar com https://: "${url}"`,
    }));
}

/** Arte provisória (SVG gerado por `pnpm arte:provisoria`) não pode ir para o ar (docs/decisions/0006). */
export function validarArteDefinitiva(
  config: ConfigConvite,
  conteudo: Pick<ConteudoConvite, 'baloes'>,
): Problema[] {
  const arquivos = [
    ...Object.entries(config.imagens).flatMap(([chave, arte]) =>
      urlsDaImagem(arte).map((url) => ({ origem: `config.imagens.${chave}`, url })),
    ),
    ...conteudo.baloes.map((balao, indice) => ({
      origem: `content.baloes[${String(indice)}].foto`,
      url: balao.foto,
    })),
  ];
  return arquivos
    .filter(({ url }) => url.includes('/provisorio/'))
    .map(({ origem, url }) => ({
      regra: 'arte-provisoria',
      mensagem: `${origem} ainda aponta para a arte provisória: "${url}"`,
    }));
}

/** Todo arquivo citado precisa existir em `public/` (imagens do manifesto e os MP3). */
export function validarArquivos(
  config: ConfigConvite,
  conteudo: Pick<ConteudoConvite, 'baloes'>,
  arquivosDeAudio: readonly string[],
  existe: (caminho: string) => boolean,
): Problema[] {
  const imagens = Object.entries(config.imagens).flatMap(([chave, arte]) =>
    urlsDaImagem(arte).map((url) => ({ origem: `config.imagens.${chave}`, url })),
  );
  const fotos = conteudo.baloes.map((balao, indice) => ({
    origem: `content.baloes[${String(indice)}].foto`,
    url: balao.foto,
  }));
  const audios = arquivosDeAudio.map((url) => ({ origem: 'áudio', url }));
  return [...imagens, ...fotos, ...audios]
    .filter(({ url }) => !existe(url))
    .map(({ origem, url }) => ({
      regra: 'arquivo-ausente',
      mensagem: `${origem}: "public/${url}" não existe`,
    }));
}

export interface EntradasDoGate {
  readonly config: ConfigConvite;
  readonly conteudo: ConteudoConvite;
  readonly arquivosDeAudio: readonly string[];
  /** `true` se o arquivo existe em `public/`. */
  readonly existe: (caminho: string) => boolean;
}

export function verificarTudo({
  config,
  conteudo,
  arquivosDeAudio,
  existe,
}: EntradasDoGate): Problema[] {
  return [
    ...encontrarTextoPendente(conteudo),
    ...validarDatas(config),
    ...validarLinks(config),
    ...validarArteDefinitiva(config, conteudo),
    ...validarArquivos(config, conteudo, arquivosDeAudio, existe),
  ];
}
