import type { ConfigConvite } from '../../src/domain/config/config-convite';
import type { ConteudoConvite } from '../../src/domain/conteudo/conteudo-convite';
import { urlsDaImagem } from '../../src/domain/imagens/catalogo-de-imagens';
import { dataPorExtenso, diaDaSemana, horaCurta } from '../../src/domain/tempo/formato-de-data';
import { analisarInstante } from '../../src/domain/tempo/tempo';

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

/**
 * Os textos que citam o prazo e a data do casamento precisam bater com `config` (SPEC-07, SPEC-11):
 * o botão de confirmar some pela data de `config`, mas quem lê é o texto de `content`.
 */
export function validarConsistenciaDeDatas(
  config: ConfigConvite,
  conteudo: Pick<ConteudoConvite, 'botoes' | 'carta' | 'contagem'>,
): Problema[] {
  // Data inválida já é acusada por `validarDatas`; aqui não há o que comparar.
  let prazoEmMs: number;
  let casamento: number;
  try {
    prazoEmMs = analisarInstante(config.prazoConfirmacao);
    casamento = analisarInstante(config.casamento);
  } catch {
    return [];
  }
  const problemas: Problema[] = [];
  const prazo = dataPorExtenso(prazoEmMs);

  for (const [nome, texto] of [
    ['content.botoes.prazo', conteudo.botoes.prazo],
    ['content.botoes.encerrado', conteudo.botoes.encerrado],
  ] as const) {
    if (!texto.includes(prazo)) {
      problemas.push({
        regra: 'datas-nos-textos',
        mensagem: `${nome} precisa citar o prazo de config.prazoConfirmacao ("${prazo}"): "${texto}"`,
      });
    }
  }

  const dataDaCarta = `${diaDaSemana(casamento)} · ${dataPorExtenso(casamento)} · ${horaCurta(casamento)}`;
  if (conteudo.carta.data !== dataDaCarta.toUpperCase()) {
    problemas.push({
      regra: 'datas-nos-textos',
      mensagem: `content.carta.data precisa ser "${dataDaCarta.toUpperCase()}" (de config.casamento): "${conteudo.carta.data}"`,
    });
  }

  if (!conteudo.contagem.noDia.includes(horaCurta(casamento))) {
    problemas.push({
      regra: 'datas-nos-textos',
      mensagem: `content.contagem.noDia precisa citar o horário do casamento ("${horaCurta(casamento)}"): "${conteudo.contagem.noDia}"`,
    });
  }
  return problemas;
}

/** O endereço publicado precisa ser completo, com https:// e barra no fim (SPEC-10, RF-10.1). */
export function validarPublicacao(config: ConfigConvite): Problema[] {
  const { url } = config.publicacao;
  if (url.startsWith('https://') && url.endsWith('/') && !TEXTO_PENDENTE.test(url)) return [];
  return [
    {
      regra: 'publicacao',
      mensagem: `config.publicacao.url precisa ser um endereço completo com https:// e barra no fim: "${url}"`,
    },
  ];
}

export interface ArquivoDeTexto {
  readonly caminho: string;
  readonly texto: string;
}

const URL_NO_TEXTO = /https?:\/\/[^\s'"`)<>\\]+/g;

/**
 * O convite só fala com serviços que a spec aprova (formulário, mapa e o próprio endereço): nada de
 * fontes, scripts ou análise de visitas de terceiros (CA-01.3.2, SPEC-10, RNF-10.3). Devolve cada
 * endereço externo achado que não comece por um dos `permitidos`.
 */
export function encontrarUrlsExternas(
  arquivos: readonly ArquivoDeTexto[],
  permitidos: readonly string[],
): Problema[] {
  return arquivos.flatMap(({ caminho, texto }) =>
    (texto.match(URL_NO_TEXTO) ?? [])
      .filter((url) => !permitidos.some((permitido) => url.startsWith(permitido)))
      .map((url) => ({
        regra: 'servico-externo',
        mensagem: `${caminho}: endereço externo não previsto: "${url}"`,
      })),
  );
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
  const publicacao = (['imagemDaPrevia', 'icone32', 'iconeApple'] as const).map((chave) => ({
    origem: `config.publicacao.${chave}`,
    url: config.publicacao[chave],
  }));
  return [...imagens, ...fotos, ...audios, ...publicacao]
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
  /** Arquivos do código (`index.html`, `src/**`) onde procurar endereços externos. */
  readonly arquivosDoCodigo?: readonly ArquivoDeTexto[];
}

export function verificarTudo({
  config,
  conteudo,
  arquivosDeAudio,
  existe,
  arquivosDoCodigo = [],
}: EntradasDoGate): Problema[] {
  return [
    ...encontrarTextoPendente(conteudo),
    ...validarDatas(config),
    ...validarLinks(config),
    ...validarPublicacao(config),
    ...encontrarUrlsExternas(arquivosDoCodigo, [
      'http://www.w3.org/2000/svg',
      config.links.formulario,
      config.links.mapa,
      config.publicacao.url,
    ]),
    ...validarConsistenciaDeDatas(config, conteudo),
    ...validarArteDefinitiva(config, conteudo),
    ...validarArquivos(config, conteudo, arquivosDeAudio, existe),
  ];
}
