# ADR-0016 · A tinta da carta contra o escurecimento forçado

- **Status:** aceita em 2026-11-01
- **Contexto:** a [ADR-0015](./0015-cena-vertical-da-pintura-mestre-e-aviso-de-tema.md) declarou `color-scheme: dark` para o
  celular não escurecer o convite. O casal testou e mandou uma captura do aparelho dele: o texto da carta continuava
  quase invisível (claro sobre o papel creme) e os botões de pausa e de som estavam escuros. O navegador do aparelho
  **ignora** o `color-scheme`, tanto o `only light` da ADR-0012 quanto o `dark` da 0015, e escurece as páginas por conta
  própria. A captura mostra o desenho de um algoritmo no estilo do Chrome: o texto escuro vira claro, os fundos claros
  viram escuros, o dourado médio fica como está e as imagens não mudam. Por isso o papel, que é imagem, continuou
  creme, e o texto, que é cor, ficou claro sobre ele.

## O que mudou

Esse tipo de algoritmo só inverte o texto com brilho abaixo de cerca de 150 e os fundos com brilho acima de cerca de 205.
O texto da carta deixou de ser uma cor escura:

- cada bloco de texto da carta usa um **cinza claro** (`--cor-tinta-sobre-papel`, `#bcbcb5`, brilho 187) com
  `mix-blend-mode: difference` sobre o papel. A diferença entre o papel creme (`#f6ead7`) e esse cinza é exatamente a
  tinta marrom (`#3a2e22`), então o texto aparece escuro e igual ao de antes, **com ou sem** o escurecimento forçado. Os
  rótulos finos usam `--cor-tinta-suave-sobre-papel` (`#a9aca7`), que dá `#4d3e30`;
- o "Role para ler" segue a mesma regra; os filetes dourados ficam de fora da mistura;
- dentro da mistura o dourado viraria azul, então o "&" do título e o separador dos pais, que ficam dentro de um bloco,
  passaram a usar a tinta. **O "&" da carta deixou de ser dourado** (RF-06.10 dizia dourado);
- com cores forçadas do sistema (`forced-colors: active`, alto contraste) vale `canvastext`, sem mistura.

Reproduzido no Chrome com `--enable-features=WebContentsForceDark` e **sem** o aviso de tema (o caso do casal): antes, o
texto sumia como na captura; depois, a carta inteira (versículo, nomes, convite, data, local, assinatura) fica legível,
e no Chrome normal fica igual. O teste `tokens.test.ts` guarda a conta: a diferença para o papel dá a tinta e o cinza
passa do limite de inversão.

## O que continua escurecendo

Os cartões da parte de baixo (contagem, mensagem, traje, botões) e os botões de pausa e de som continuam escuros no
aparelho dele: têm fundo e texto em cores, que o algoritmo inverte juntas, então ficam legíveis, só que escuras. O
`color-scheme: dark` da ADR-0015 fica (não atrapalha e vale para os navegadores que o respeitam).

## Consequências

- Cada bloco da carta é uma camada própria de composição (mistura): não medi o efeito em aparelho real.
- Se outro navegador do casal usar um algoritmo diferente (por exemplo, um filtro que inverte tudo, inclusive o cinza
  claro), a carta poderia sumir de novo: nesse caso é preciso saber qual navegador é.
