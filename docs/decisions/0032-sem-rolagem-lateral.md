# ADR-0032 · A página nunca rola de lado

- **Status:** aceita em 2026-11-09
- **Contexto:** o casal pediu: "não deve haver scroll horizontal". A página é feita para ser lida só na vertical, no celular.

## O que foi medido

Em Chrome emulado de celular (375 × 812, 320 × 568, 812 × 375) e no computador (1280 × 720), em todas as etapas (entrada, baú,
memórias, envelope, carta aberta e rolada até o fim da informação, e também pelo caminho do "Pular"), a largura do documento é
igual à da tela, nenhum elemento fora de um recorte passa da borda e `scrollTo(600, …)` não move a página para o lado. Ou seja, **não
reproduzi nenhuma rolagem lateral** na emulação.

## O que mudou

Mesmo assim, o convite ganhou uma garantia que não depende de nenhum elemento ficar certo: `html` e `body` declaram
`touch-action: pan-y pinch-zoom`. O gesto na horizontal deixa de arrastar a página em qualquer navegador de celular (incluindo o
navegador interno do WhatsApp); a rolagem vertical e o zoom por pinça seguem livres (o zoom nunca é bloqueado). Quem precisa do
gesto lateral o pede no próprio elemento (o carrossel de fotos e o selo já fazem isso).

Um teste de integração (`tests/integration/tokens.test.ts`) garante a regra em `base.css` e que `user-scalable` e `maximum-scale`
continuem ausentes.

## O que não foi provado

A prova num Chrome com toque emulado ficou inconclusiva: o arrasto lateral não move a página nem sem a regra (o controle também deu
0), então o emulador não reproduz o gesto real do celular. A regra é o jeito documentado de impedir o gesto, mas **não foi
conferida em aparelho real**. Se a rolagem lateral aparecer num aparelho, preciso do modelo, do navegador (ou do WhatsApp) e da etapa
em que acontece.

## Consequências

- O gesto na horizontal não rola a página; no computador, a barra de rolagem lateral só aparece se algo estourar a largura, e nada
  estoura hoje.
- Uma regra nova de CSS que dependa de gesto lateral na página inteira precisa pedir `touch-action` no próprio elemento.
