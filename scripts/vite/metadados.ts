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

/** A barra invertida e u003c: o escape JSON do sinal de menor. */
const ESCAPE_DO_MENOR = String.fromCharCode(0x5c) + 'u003c';

/** JSON para dentro de um `<script>`: o `<` é escapado, e um `</script>` no texto não fecha o bloco antes da hora. */
function jsonParaScript(valor: unknown): string {
  return JSON.stringify(valor).replaceAll('<', ESCAPE_DO_MENOR);
}

/** Separa "R. Nações Unidas, 407 · Benevides, PA" em rua, cidade e estado (o formato de `content.carta.endereco`). */
export function separarEndereco(endereco: string): { rua: string; cidade: string; estado: string } {
  const [rua = endereco, resto = ''] = endereco.split(' · ');
  const [cidade = '', estado = ''] = resto.split(', ');
  return { rua, cidade, estado };
}

/**
 * Dados estruturados do Google (`schema.org/Event`, 09/11/2026): o convite como evento (sem dizer "casamento": é a surpresa, ADR-0040), com data, local e endereço, para
 * o convite poder aparecer com data e lugar nos resultados. Só usa o que `content` e `config` já têm.
 */
export function gerarDadosEstruturados(conteudo: ConteudoConvite, config: ConfigConvite): object {
  const { local, endereco } = conteudo.carta;
  const { rua, cidade, estado } = separarEndereco(endereco);
  const { url, imagemDaPrevia } = config.publicacao;
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: conteudo.previa.nomeDoEvento,
    description: conteudo.previa.descricaoParaBusca,
    startDate: config.casamento,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url,
    image: [url + imagemDaPrevia],
    location: {
      '@type': 'Place',
      name: local,
      address: {
        '@type': 'PostalAddress',
        streetAddress: rua,
        addressLocality: cidade,
        addressRegion: estado,
        addressCountry: 'BR',
      },
    },
  };
}

/**
 * Metadados do `<head>` (SPEC-10, RF-10.1 e RF-10.3; SEO em 09/11/2026): título, descrição para buscadores, `robots`,
 * endereço canônico, ícones, a prévia do WhatsApp e das redes (Open Graph e Twitter Card) e os dados estruturados do
 * evento. `og:url` e `og:image` levam o endereço completo (`https://…`), porque caminho relativo não aparece na prévia.
 * Tudo vem de `content.previa`, `content.carta` e `config.publicacao`: uma fonte só.
 */
export function gerarMetadados(conteudo: ConteudoConvite, config: ConfigConvite): string {
  const { titulo, descricao, descricaoParaBusca, descricaoDaImagem } = conteudo.previa;
  const { url, imagemDaPrevia, icone32, iconeApple, indexavel } = config.publicacao;
  const t = escaparAtributo(titulo);
  const d = escaparAtributo(descricao);
  const busca = escaparAtributo(descricaoParaBusca);
  const alt = escaparAtributo(descricaoDaImagem);
  const imagem = escaparAtributo(url + imagemDaPrevia);
  return [
    `<title>${t.replaceAll('&quot;', '"')}</title>`,
    `<meta name="description" content="${busca}" />`,
    indexavel
      ? '<meta name="robots" content="index, follow, max-image-preview:large" />'
      : '<meta name="robots" content="noindex, nofollow" />',
    `<link rel="canonical" href="${escaparAtributo(url)}" />`,
    `<link rel="icon" type="image/png" sizes="32x32" href="${escaparAtributo(icone32)}" />`,
    `<link rel="apple-touch-icon" href="${escaparAtributo(iconeApple)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${escaparAtributo(conteudo.entrada.nomes)}" />`,
    '<meta property="og:locale" content="pt_BR" />',
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${escaparAtributo(url)}" />`,
    `<meta property="og:image" content="${imagem}" />`,
    '<meta property="og:image:type" content="image/jpeg" />',
    `<meta property="og:image:width" content="${String(LARGURA_DA_PREVIA)}" />`,
    `<meta property="og:image:height" content="${String(ALTURA_DA_PREVIA)}" />`,
    `<meta property="og:image:alt" content="${alt}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${imagem}" />`,
    `<meta name="twitter:image:alt" content="${alt}" />`,
    `<script type="application/ld+json">${jsonParaScript(gerarDadosEstruturados(conteudo, config))}</script>`,
  ].join('\n    ');
}

/** `robots.txt`: libera tudo e aponta o mapa do site; com `indexavel` falso, proíbe tudo (o comportamento de antes). */
export function gerarRobots(config: ConfigConvite): string {
  const { url, indexavel } = config.publicacao;
  return indexavel
    ? `User-agent: *\nAllow: /\n\nSitemap: ${url}sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
}

/** `sitemap.xml`: uma página só, o convite. */
export function gerarSitemap(config: ConfigConvite): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${escaparAtributo(config.publicacao.url)}</loc>\n  </url>\n</urlset>\n`;
}

/**
 * Plugin do Vite: troca o marcador do `index.html` pelos metadados gerados e, no build, emite o `robots.txt` e (com
 * `indexavel`) o `sitemap.xml` com o endereço de `config.publicacao.url`.
 */
export function pluginMetadados(conteudo: ConteudoConvite, config: ConfigConvite): Plugin {
  return {
    name: 'convite-metadados',
    transformIndexHtml: {
      order: 'pre',
      // Substituição por função: com texto, `$&` e `$'` do conteúdo seriam lidos como padrões.
      handler: (html) =>
        html.replace(MARCADOR_DOS_METADADOS, () => gerarMetadados(conteudo, config)),
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: gerarRobots(config) });
      if (config.publicacao.indexavel) {
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: gerarSitemap(config) });
      }
    },
  };
}
