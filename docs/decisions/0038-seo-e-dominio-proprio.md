# ADR-0038 · SEO, prévia e o domínio isabellaeneto.com.br

- **Status:** aceita em 2026-11-09 (textos novos de SEO ainda sem a aprovação do casal)
- **Contexto:** o endereço do convite será **isabellaeneto.com.br**, e o casal pediu os metadados da prévia e de SEO. Até aqui o
  convite era privado por desenho (SPEC-10): `noindex, nofollow` no HTML e `Disallow: /` no `robots.txt`, porque a página traz
  nomes de família e o endereço da festa.

## O que mudou

- `config.publicacao.url` é `https://isabellaeneto.com.br/` (define `og:url`, `og:image`, o endereço canônico, o sitemap e o
  link da agenda). `public/CNAME` traz o domínio para o GitHub Pages.
- **Indexável** (`config.publicacao.indexavel: true`): `index, follow, max-image-preview:large`. É uma **mudança na decisão
  original**, a pedido do casal; `false` devolve o `noindex, nofollow` e o `Disallow: /` (os testes cobrem os dois lados).
- `scripts/vite/metadados.ts` gera, de `content` e `config`: descrição para busca, `robots`, `canonical`, `og:site_name`,
  `og:image:type`, `og:image:alt`, Twitter Card (`summary_large_image`) e **dados estruturados** `schema.org/Event` (nome, data
  com fuso `-03:00`, local e endereço). O `og:description` segue o texto curto que o casal aprovou ("Uma carta foi escrita para
  você. Toque para abrir."); o trecho que o Google mostra é um texto novo, descritivo (`previa.descricaoParaBusca`, 22/01/2027,
  17h, Sítio Olinda). O JSON-LD escapa o `<`, e um `</script>` no texto não fecha o bloco.
- `robots.txt` e `sitemap.xml` são **emitidos no build** a partir de `config` (o `public/robots.txt` fixo saiu: os dois
  brigariam).

## Medido

Lighthouse 12 (celular simulado): **SEO 100** (era 66, só por causa do `noindex`), acessibilidade 100, boas práticas 100; `is-crawlable`,
`meta-description`, `canonical` e `robots-txt` passam. O build emite `robots.txt`, `sitemap.xml`, `CNAME` e o JSON-LD no `index.html`.
O Lighthouse não avalia dados estruturados; vale validar o JSON-LD no [Teste de Resultados Ricos](https://search.google.com/test/rich-results)
depois de publicar.

## Para o domínio funcionar (fora do código)

1. No repositório: Settings › Pages › Custom domain = `isabellaeneto.com.br`, e marcar "Enforce HTTPS" quando o certificado sair.
2. No DNS do domínio (registro.br ou onde estiver): quatro registros `A` para o apex apontando para os IPs do GitHub Pages
   (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`) e um `CNAME` de `www` para
   `alencarftc.github.io`. A propagação pode levar horas.
3. O WhatsApp guarda a prévia do link: só mande depois de o endereço novo abrir, e confira o link no
   [depurador do Facebook](https://developers.facebook.com/tools/debug/) para limpar o cache.

## Consequências

- O convite fica pesquisável: nomes dos pais, local e endereço aparecem em buscas. Se o casal preferir o convite só por link,
  basta `indexavel: false`.
- Os textos de SEO (`descricaoParaBusca`, `descricaoDaImagem`, `nomeDoEvento`) são novos e estão fora do espelho de
  `requisitos.md`; o teste de conteúdo os lista como "ainda sem aprovação".
