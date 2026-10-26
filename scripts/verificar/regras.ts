import type { ConfigConvite } from '../../src/domain/config/config-convite';

/**
 * Regras do gate de publicação (SPEC-12, "Checagem automática"). São funções
 * puras, para testar sem tocar o disco. O orçamento de peso é conferido pelo
 * `size-limit`; os assets e o <noscript> entram quando existirem.
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

export function verificarTudo(config: ConfigConvite, conteudo: unknown): Problema[] {
  return [...encontrarTextoPendente(conteudo), ...validarDatas(config), ...validarLinks(config)];
}
