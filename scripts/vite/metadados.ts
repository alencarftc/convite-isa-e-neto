import type { Plugin } from 'vite';

import type { ConfigConvite } from '../../src/domain/config/config-convite';
import type { ConteudoConvite } from '../../src/domain/conteudo/conteudo-convite';

/** Marcador no `index.html` que o plugin troca pelos metadados da prévia (SPEC-10, RF-10.1). */
export const MARCADOR_DOS_METADADOS = '<!--METADADOS-->';

/** A imagem da prévia tem sempre 1200 × 630 px (RF-10.2). */
const LARGURA_DA_PREVIA = 1200;
const ALTURA_DA_PREVIA = 630;

function escaparAtributo(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Metadados do `<head>` (SPEC-10, RF-10.1 e RF-10.3): título, descrição, ícones e a prévia do
 * WhatsApp. `og:url` e `og:image` levam o endereço completo (`https://…`), porque caminho relativo
 * não aparece na prévia. Tudo vem de `content.previa` e `config.publicacao`, uma fonte só.
 */
export function gerarMetadados(conteudo: ConteudoConvite, config: ConfigConvite): string {
  const { titulo, descricao } = conteudo.previa;
  const { url, imagemDaPrevia, icone32, iconeApple } = config.publicacao;
  const t = escaparAtributo(titulo);
  const d = escaparAtributo(descricao);
  return [
    `<title>${t.replaceAll('&quot;', '"')}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="icon" type="image/png" sizes="32x32" href="${escaparAtributo(icone32)}" />`,
    `<link rel="apple-touch-icon" href="${escaparAtributo(iconeApple)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="pt_BR" />',
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${escaparAtributo(url)}" />`,
    `<meta property="og:image" content="${escaparAtributo(url + imagemDaPrevia)}" />`,
    `<meta property="og:image:width" content="${String(LARGURA_DA_PREVIA)}" />`,
    `<meta property="og:image:height" content="${String(ALTURA_DA_PREVIA)}" />`,
  ].join('\n    ');
}

/** Plugin do Vite: troca o marcador do `index.html` pelos metadados gerados. */
export function pluginMetadados(conteudo: ConteudoConvite, config: ConfigConvite): Plugin {
  return {
    name: 'convite-metadados',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(MARCADOR_DOS_METADADOS, gerarMetadados(conteudo, config)),
    },
  };
}
