# ADR-0042 · Só existe o tema claro

- **Status:** aceita em 2026-11-10; desfaz a declaração `color-scheme: dark` da [ADR-0015](./0015-cena-vertical-da-pintura-mestre-e-aviso-de-tema.md)
- **Contexto:** o casal pediu que o convite **não tenha modo escuro**: só o tema claro. O convite nunca teve uma versão escura
  (nenhuma folha de estilo usa `prefers-color-scheme`), mas desde 01/11/2026 ele **declarava** `color-scheme: dark`, no
  `<meta>` e na raiz da CSS. Era um desvio da ADR-0015: como o Chrome com o escurecimento forçado ligado poupava as páginas
  que se diziam escuras, declarar `dark` mantinha o convite igual ao tema claro, ao custo de dizer ao navegador que a página
  é escura (barra de rolagem, controles e fundo padrão no tema escuro). A ADR-0016 já registrou que o navegador do aparelho do
  casal **ignora** tanto o `dark` quanto o `only light`, então a declaração não protegia aquele aparelho.

## O que mudou

- `index.html` e `src/styles/base.css` declaram **`color-scheme: only light`**: é a declaração que o CSS Color Adjust define
  para proibir o navegador de escurecer a página por conta própria, e deixa a barra de rolagem e os controles no tema claro.
  Nada mais no código é dependente do tema: o convite pinta todas as suas cores, e a barra de rolagem já usava
  `scrollbar-color` com as cores dele.
- Não existe `prefers-color-scheme` em nenhuma folha, e a cor da barra do navegador (`theme-color`) é uma só, sem variante para
  o tema escuro.
- O teste `tests/integration/tema-claro.test.ts` guarda isso: `only light` no `<meta>` e na raiz, nenhum `dark` em
  `color-scheme`, nenhum `prefers-color-scheme` em **qualquer** `.css` de `src/styles/` e um só `theme-color`.

## O que não muda

A tinta da carta da [ADR-0016](./0016-tinta-da-carta-contra-o-escurecimento-forcado.md) (cinza claro misturado por diferença ao
papel) **fica**: é a proteção para os navegadores que escurecem as páginas mesmo com `only light`, e dá a mesma tinta marrom
com ou sem o escurecimento.

## Não verificado

Não testei em aparelho real. O `only light` deve ser respeitado pelo Chrome; o navegador interno do WhatsApp e o Samsung
Internet podem escurecer por conta própria, como a ADR-0016 observou, e isso o código não impede. Nesse caso os cartões de
baixo e os botões de pausa e de som ficam escuros (legíveis, mas escuros) e a carta segue legível. Um navegador que respeitava o
`dark` como recusa e ignora o `only light` passaria a escurecer o convite: se o casal ver isso, é preciso saber qual
navegador é.
