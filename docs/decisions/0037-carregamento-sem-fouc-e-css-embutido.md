# ADR-0037 · Carregamento sem FOUC: o CSS no `<head>` e embutido no HTML

- **Status:** aceita em 2026-11-09
- **Contexto:** o casal viu o HTML sem estilo por alguns segundos antes de a página ficar estilizada (FOUC), e pediu um
  carregamento mais rápido para a nota do PageSpeed Insights.

## Causa

O `main.ts` importava os 15 arquivos de CSS. No servidor de desenvolvimento o Vite os injeta **depois de o JavaScript carregar**
(com dezenas de módulos, alguns segundos): a página aparece sem estilo. No build, o CSS era um arquivo à parte (25 kB) que
bloqueia a renderização por uma ida e volta à rede, e o PageSpeed o aponta como recurso bloqueador.

## O que mudou

- `src/styles/index.css` importa os 15 arquivos na ordem da cascata e é ligado no `<head>` do `index.html` (`<link
rel="stylesheet">`): o navegador o descobre com o HTML, antes do JavaScript. O `main.ts` não importa mais CSS.
- `scripts/vite/css-em-linha.ts` (só no build) embute o CSS no próprio `index.html` e o tira da saída: sem requisição a mais, a
  primeira tela já sai estilizada. As fontes citadas como `../fonts/…` passam a `./fonts/…`. O HTML foi de 11 para 40 kB
  (10 kB comprimido); o `size-limit` "HTML com CSS crítico" tem folga (30 kB brotli).
- **O papel da carta voltou:** o código passava ao CSS `url('assets/objects/14-papel-carta.webp')` numa variável (`--papel`), e
  o navegador resolve uma URL de variável em relação ao **arquivo de estilos**, não ao documento. Com o CSS em
  `/src/styles/index.css` o caminho virava `/src/styles/assets/…` e o papel sumia, no celular e no computador, só no servidor
  de desenvolvimento. `montarCarta` completa a URL contra `document.baseURI`.
- `pnpm verificar`: a regra de arquivos citados no HTML ignora `/src/…` (é código-fonte do Vite, não arquivo de `public/`).

## Medido

- Primeira tela estilizada **sem executar JavaScript** (JS bloqueado): `.entrada` com `position: fixed` e fonte dos nomes
  aplicada, no servidor de desenvolvimento e no build.
- Lighthouse 12 no build (celular simulado), cinco rodadas: desempenho **entre 87 e 97** (89 no registro de 26/10; a
  oscilação é do tempo de bloqueio, de 190 a 510 ms, que varia com a máquina), acessibilidade 100, boas práticas 100; recursos
  que bloqueiam a renderização: 0 (a nota do audit é 100); FCP 1,1 s; LCP 1,7 a 1,8 s; CLS 0. O que sobra de desempenho é
  JavaScript (ver abaixo), e não o carregamento do CSS.

## Consequências

- O CSS novo entra em `src/styles/index.css` (e não no `main.ts`). Um CSS que cite arquivo de `public/` usa caminho absoluto
  (`/fonts/…`); URLs que vão para variáveis CSS precisam ser completas.
- Sobram 41 KiB de JavaScript só usado depois do toque (GSAP, Howler e as cenas); separá-los em um carregamento tardio é o
  próximo ganho possível, ainda não feito.
- `public/assets/` tem arquivos soltos que **não são do projeto e não estão no Git** (PDFs, `familia-*.jpg`, um `.zip` de 1,2 MB e
  imagens de referência): num build local eles vão para `dist/`. Como não estão versionados, o build do GitHub Actions não os
  inclui; convém tirá-los da pasta.
