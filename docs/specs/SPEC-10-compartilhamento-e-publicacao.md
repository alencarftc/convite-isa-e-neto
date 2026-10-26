# SPEC-10 · Compartilhamento e publicação

> Espelho local da sub-aba "SPEC-10 · Compartilhamento e publicação" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon
> Onde esta spec diz `.js`, leia `.ts` ([ADR-0001](../decisions/0001-typescript-e-clean-architecture.md)). O workflow efetivamente usado no repositório está em `.github/workflows/` e segue os gates de [`qualidade.md`](../qualidade.md); o esboço abaixo é a referência original.

**Histórias:** US-10.1 a US-10.4 · **Prioridade:** Must (US-10.2 Should, US-10.4 Could) · **Pontos:** 8

## Resumo

O convite é publicado no GitHub Pages por uma automação do GitHub Actions a cada envio para a branch `main`. A prévia do link no WhatsApp mostra imagem, título e descrição próprios. Como o WhatsApp guarda a prévia, tudo o que aparece nela, inclusive o endereço final, precisa estar decidido antes do primeiro envio. O convite não aparece em buscadores, porque traz endereço e nomes de família.

## Escopo

**Dentro:** metadados da prévia, imagem da prévia, ícones, bloqueio de indexação, automação de publicação, configuração do GitHub Pages, cache, domínio próprio opcional e o procedimento de lançamento.

**Fora:** o conteúdo do convite (SPEC-02 a SPEC-07) e os testes antes do envio (SPEC-12).

## Comportamento

| Momento | O que acontece |
| --- | --- |
| Você envia código para `main` | O GitHub Actions instala, faz o build e publica; em até 5 min o site novo está no ar |
| O build falha | Nada é publicado; a versão anterior continua no ar e o GitHub mostra o erro |
| Alguém cola o link no WhatsApp | O WhatsApp lê os metadados e mostra a prévia: imagem 1200 × 630, título e descrição |
| A prévia precisa mudar depois de enviada | O WhatsApp pode continuar mostrando a antiga. Novos envios usam o link com `?v=2`, que o WhatsApp trata como outro endereço |
| Alguém salva na tela inicial do iPhone | Aparece o ícone do selo com I&D (180 px) |

## Requisitos funcionais

- **RF-10.1** O `<head>` traz os metadados da seção "Integrações e metadados" da aba principal, com `og:image` e `og:url` em endereço completo (`https://…`).
- **RF-10.2** A imagem da prévia (`og-image.jpg`) é JPEG de 1200 × 630 px, com até 300 KB: a imagem 1 em 16:9 recortada, o selo com I&D e "Isabella & David" em Great Vibes. Os textos são aplicados numa ferramenta de edição, não pelo gerador.
- **RF-10.3** Ícones: `favicon-32.png` e `apple-touch-icon.png` (180 px), com o selo e as iniciais; `<meta name="theme-color" content="#91A8D0">`.
- **RF-10.4** `<meta name="robots" content="noindex, nofollow">` e um `robots.txt` com `Disallow: /`, para o convite não aparecer em buscas.
- **RF-10.5** A publicação usa o fluxo oficial do GitHub Pages com Actions (arquivo abaixo); em Settings › Pages, a fonte é "GitHub Actions".
- **RF-10.6** Arquivos em `public/` que mudarem depois do envio ganham um sufixo de versão no nome (por exemplo, `og-image-v2.jpg`), porque o GitHub Pages guarda arquivos em cache por alguns minutos e o WhatsApp por muito mais. O JavaScript e o CSS já saem com nomes únicos pelo Vite.
- **RF-10.7** Endereço proposto: `https://alencarftc.github.io/convite-isabella-david/` *(proposta; depende do nome do repositório)*. O repositório real é `alencarftc/convite-isa-e-neto`, então o endereço provável é `https://alencarftc.github.io/convite-isa-e-neto/` (a confirmar antes do primeiro envio).
- **RF-10.8** Domínio próprio *(Could)*: arquivo `public/CNAME` com o domínio, registro CNAME no provedor apontando para `alencarftc.github.io` e "Enforce HTTPS" ligado. Precisa ser decidido antes do primeiro envio.

## Requisitos não funcionais

- **RNF-10.1** Publicação em até 5 min após o envio do código.
- **RNF-10.2** Site sempre em `https`.
- **RNF-10.3** Nenhum serviço de análise de visitas, para não coletar dados dos convidados *(proposta)*.

## Desenho técnico

**Automação de publicação**

```yaml
# .github/workflows/publicar.yml
name: Publicar convite
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run verificar     # checagens da SPEC-12
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

As versões das ações (`@v4`, `@v3`) são as que eu conheço; confira na documentação do GitHub Pages se há versão mais nova ao criar o repositório.

**Cabeçalho (complemento ao da aba principal)**

```html
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" type="image/png" sizes="32x32" href="favicon/favicon-32.png">
  <link rel="apple-touch-icon" href="favicon/apple-touch-icon.png">
  <!-- og:*, title, description e theme-color: aba principal, "Integrações e metadados" -->
</head>
```

`viewport-fit=cover` permite usar a área inteira da tela no iPhone e posicionar o botão de som com `env(safe-area-inset-top)`.

## Procedimento de lançamento

- [ ] Nome do repositório (ou domínio próprio) decidido; `og:url` e `og:image` apontando para o endereço final
- [ ] Textos e links congelados e conferidos com o documento de requisitos
- [ ] Imagem da prévia final publicada
- [ ] Link colado numa conversa de teste no WhatsApp (iPhone e Android): imagem, título e descrição corretos
- [ ] Checklist de testes da SPEC-12 completo
- [ ] Versão marcada no repositório (`git tag v1.0`)
- [ ] Envio aos convidados, uma mensagem por família
- [ ] Depois do envio: só correções críticas; mudança na prévia exige o link com `?v=2` nos envios seguintes

## Conteúdo e assets

- `og-image.jpg`, `favicon/favicon-32.png`, `favicon/apple-touch-icon.png`, `robots.txt`, `CNAME` (se houver domínio).
- Título e descrição da prévia, aprovados em "Textos do convite".

## Casos de borda

| Situação | Reação |
| --- | --- |
| Prévia sem imagem no WhatsApp | Conferir se `og:image` tem `https://` e endereço completo e se a imagem tem até 300 KB; colar o link com `?v=2` para forçar nova leitura |
| Repositório renomeado depois do envio | O endereço antigo para de funcionar. Não renomear depois do envio |
| Publicação com erro na noite anterior ao envio | A versão anterior continua no ar; corrigir e publicar de novo |
| Domínio próprio sem `https` nos primeiros minutos | O GitHub emite o certificado sozinho; esperar antes de enviar o link |

## Casos de teste

- **CT-10.1** Colar o link publicado numa conversa de teste no WhatsApp, no iPhone e no Android: imagem, título e descrição corretos. *(CA-10.1.1, CA-10.1.2)*
- **CT-10.2** Abrir no navegador do computador e conferir o ícone na aba; no iPhone, salvar na tela inicial e conferir o ícone. *(CA-10.2.1)*
- **CT-10.3** Fazer uma alteração pequena, enviar para `main` e cronometrar até aparecer no ar. *(CA-10.3.1)*
- **CT-10.4** Enviar um commit que quebra o build (por exemplo, um colchete pendente em `content.js`) e conferir que o site no ar não muda. *(CA-10.3.2)*
- **CT-10.5** Buscar o endereço num buscador alguns dias depois: o convite não aparece. *(RF-10.4)*

## Questões em aberto

- Nome do repositório, que define o endereço. *(O repositório existente é `convite-isa-e-neto`.)*
- Domínio próprio: sim ou não (o convite base usava convite.saraefelipe.com.br).
- Texto da mensagem de WhatsApp que acompanha o link no envio.
