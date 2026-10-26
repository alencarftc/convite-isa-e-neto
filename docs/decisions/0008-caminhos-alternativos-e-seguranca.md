# ADR-0008 · Caminhos alternativos, modo de segurança e `<noscript>`

- **Status:** aceita em 2026-10-26
- **Contexto:** a SPEC-09 pede que o convite chegue a quem não vê animação, usa teclado ou leitor de
  tela, está com o aparelho falhando ou está sem JavaScript. Boa parte já nasceu nas specs anteriores
  (orquestrador, `skip()` de cada cena, estado `reduzido`); faltava fechar as pontas.

## Decisão

1. **Um evento para "foi direto ao final":** `convite:pulado`, emitido pelo orquestrador depois de
   levar as cenas ao estado final (Pular, atalho de teclado, animação reduzida). O áudio escuta esse
   evento para entrar na música 2; o toque de entrada só libera o som. Assim os três caminhos usam o
   mesmo gatilho, e o orquestrador continua sem conhecer o áudio.
2. **Atalho "Ir direto ao convite"** (`montarAtalhoParaOConvite`): primeiro elemento focável do
   `<body>`, `visualmente-oculto` até receber foco. Se o som ainda não foi liberado, o clique emite
   `entrada:tocou` (`pular`) antes de `orquestrador.pular()`, para o gesto liberar o áudio.
3. **Modo de segurança: primeiro `skip()` em tudo, depois o aviso `seguranca`.** O aviso para o áudio e
   leva o foco ao título da carta, que já está sem `inert` (RF-09.8). A CSS esconde cena, entrada,
   envelope e história por `body[data-fase='seguranca']`, sem depender do GSAP.
4. **Foco acompanha o caminho completo:** baú quando passa a aceitar o toque, botão de avançar na
   história, envelope ao pousar e título da carta ao abrir (RF-09.6). Elementos ainda não revelados
   ficam `disabled`, `hidden` ou `inert`.
5. **Animação reduzida também para a entrada:** a névoa fica parada e os nomes só esmaecem; o
   restante (balões, envelope, profundidade, cartões ao rolar) nunca roda, porque o orquestrador vai
   direto ao final.
6. **`<noscript>` gerado, não escrito:** um plugin do Vite (`scripts/vite/noscript.ts`) troca o marcador
   `<!--NOSCRIPT-->` do `index.html` por um bloco montado de `content` e `config` (carta, traje,
   mensagem e os dois links), e os testes conferem que cada texto de `content.carta` está lá. É a
   única exceção à regra de não escrever texto no HTML (CA-01.2.3) e não duplica a fonte.
7. **Contraste vira teste:** `razaoDeContraste` (WCAG, domínio) e `tests/integration/tokens.test.ts`
   conferem as combinações de texto e fundo dos tokens (texto sobre marfim ≥ 7, suave sobre marfim e
   texto sobre bege ≥ 4,5, botão principal ≥ 7) e que corpo de texto tem pelo menos 18 px.

## Consequências

- Uma mudança de cor nos tokens que quebre o contraste falha o `pnpm test`, não a revisão visual.
- Se o JavaScript do site falhar por inteiro (o bundle não carrega), o `<noscript>` não aparece, pois
  o JavaScript está ligado; esse cenário depende da carta estar no HTML estático, o que fica como
  melhoria possível (a carta hoje é montada pela `init()` da cena, ADR-0007).
- Com animação reduzida, as cinco frases e fotos da história não aparecem: decisão de 25/10/2026,
  ainda em aberto na spec (estática abaixo da carta?).
