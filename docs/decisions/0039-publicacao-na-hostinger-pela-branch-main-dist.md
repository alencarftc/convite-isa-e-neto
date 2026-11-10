# ADR-0039 · Publicação na Hostinger pela branch `main-dist`

- **Status:** aceita em 2026-11-10 (substitui, na parte da hospedagem, o GitHub Pages da SPEC-10 e a seção "Para o domínio
  funcionar" da [ADR-0038](./0038-seo-e-dominio-proprio.md))
- **Contexto:** o casal já paga uma hospedagem na Hostinger e quis publicar o convite lá, em `isabellaeneto.com.br`, com
  atualização automática a cada merge na `main`. O Git do hPanel (Avançado › Git, "Connect with GitHub") copia os arquivos de
  uma branch para uma pasta do site (`public_html` por padrão) e refaz a cópia a cada push naquela branch. **Ele não roda
  build**: ligado à `main`, publica o código-fonte (foi o que aconteceu no primeiro teste: o domínio serviu `src/`, `docs/`,
  `package.json` e uma página que só mostrava "Preparando o bosque…").

## Decisão

- `.github/workflows/publicar.yml`, a cada push na `main` (ou à mão, em `workflow_dispatch`), roda os gates, gera o `dist/` e o
  grava **na raiz** da branch `main-dist`, que contém só o site. O envio é um commit comum por cima da branch (sem
  `force push`); a primeira execução cria a branch (ou, se ela já existir, como a cópia da `main` com código-fonte que o primeiro teste deixou, a atualiza por cima e a raiz passa a ter só o site). Se nada mudou desde a última publicação, não há commit.
- O hPanel acompanha a `main-dist` (Root directory `public_html`) e o auto-deploy da Hostinger faz o resto.
- **Gates:** `pnpm check` sempre barra a publicação. `pnpm verificar` (pendências de conteúdo: fotos, MP3, textos entre
  colchetes) **só avisa** enquanto a variável do repositório `BLOQUEAR_COM_PENDENCIAS` não for `true`; com ela, volta a barrar,
  e a `main-dist` e o site ficam como estavam. O padrão é publicar sempre porque o casal quer o site atualizado a cada merge e
  o domínio ainda não foi enviado às famílias.
- `public/.htaccess` vai para a raiz do site: redireciona http para https e `www` para o endereço sem `www` (sem o domínio
  escrito no arquivo), comprime texto, põe `no-cache` no HTML, `immutable` por um ano no JavaScript (o nome tem o hash) e sete dias
  em imagens, sons e fontes (nome fixo: uma foto trocada depois do envio não fica presa), `nosniff`, `Referrer-Policy` e 404 para
  `.git`. Tudo dentro de `<IfModule>`: um módulo ausente no plano não derruba o site.
- `public/CNAME` (do GitHub Pages) continua no repositório, com o teste que o confere, mas não é necessário na Hostinger.

## Para funcionar (fora do código)

1. Esperar o primeiro merge na `main` com este workflow: ele cria a `main-dist` ou, se ela já existir, a atualiza. Em Settings › Actions › General, o fluxo de
   trabalho precisa poder gravar (a permissão `contents: write` está no próprio job).
2. No hPanel › Avançado › Git: trocar a branch do repositório para `main-dist` (se a trocar não for possível, desconectar e
   conectar de novo; a Hostinger avisa que os arquivos novos sobrescrevem os existentes na pasta).
3. **Limpar o `public_html`:** o deploy a partir da `main` deixou lá `src/`, `docs/`, `scripts/`, `tests/`, `package.json`,
   `AGENTS.md` etc. A Hostinger só sobrescreve o que a nova branch traz; o resto continua público. Apague pelo Gerenciador de
   arquivos antes (ou logo depois) da primeira publicação da `main-dist`.
4. Conferir em `https://isabellaeneto.com.br/`: a página abre o convite, `/robots.txt` e `/sitemap.xml` respondem, `/src/main.ts`
   e `/package.json` dão 404.
5. Antes de mandar o link: criar `BLOQUEAR_COM_PENDENCIAS = true` (Settings › Secrets and variables › Actions › Variables),
   ativar o SSL gratuito com redirecionamento para https e limpar a prévia do WhatsApp no depurador do Facebook.

## Consequências

- O workflow `publicar.yml` não precisa de segredo (usa o `GITHUB_TOKEN`); não há senha de FTP em lugar nenhum.
- Cada publicação é um commit na `main-dist`: o histórico mostra o que foi ao ar e quando; voltar uma versão é reverter o commit.
- O repositório é público: o código-fonte e os documentos já estavam visíveis no GitHub; a limpeza do `public_html` evita
  só o espelho duplicado no domínio e o `main.ts` servido com tipo errado.
- Sem o `BLOQUEAR_COM_PENDENCIAS`, um merge com a arte provisória ou um MP3 ausente vai ao ar; o run mostra um aviso amarelo.
- Se o plano da Hostinger não trouxer o módulo `mod_headers`, `mod_rewrite` ou `mod_deflate`, a parte correspondente do
  `.htaccess` é ignorada (o redirecionamento para https passa então a depender da opção do hPanel).
