# ADR-0044 · A deriva e a aproximação da cena são animações do navegador, não do GSAP

- **Status:** aceita em 2026-11-10
- **Contexto:** no Motorola Edge 70 Fusion+ (Android 16, tela de 144 Hz) o convite piscava, imagem por imagem, no baú à espera, ao tocar
  no selo e na rolagem do convite. No Galaxy A54 não. O defeito existe **desde a versão de 27/10** (a mais antiga testada, sem água,
  folhas, esquilo, mistura de cores, carrossel nem pétalas), então não vem de nenhuma função acrescentada depois.

## O que o laboratório mostrou

Uma página de laboratório (cena com a pintura fixa atrás de um texto que rola, 18 interruptores) foi aberta no aparelho:

- Com **uma camada só**, tudo ligado (`will-change`, `clip-path`, `dvh`, deriva e escala por JavaScript, céu piscando, `soft-light`,
  sombra, `mix-blend-mode: difference`, WebGL) funciona sem piscar.
- Com **quatro camadas grandes empilhadas**, a **escala da cena** e a **deriva das camadas** animadas **por JavaScript** (o jeito do
  GSAP: o estilo é reescrito a cada quadro) fazem a tela piscar, com ou sem `will-change`.
- As **mesmas animações por CSS** (`@keyframes`, que o navegador roda sozinho, fora da thread do JavaScript) **não piscam**, nem
  somadas entre si nem com `soft-light`. A subida da cena (só `translate` de um invólucro) também não piscou por JavaScript.

O que decide, portanto, não é o número de camadas nem o `will-change`: é **quem calcula a escala e o deslocamento de várias camadas
grandes a cada quadro**.

## O que mudou

- A **deriva do celular** (`profundidade.ts`) é uma `Element.animate` por camada (ida e volta sem fim, mesma curva, período e
  defasagem de antes), e pausar e retomar são `pause()` e `play()`.
- A **aproximação da cena** na revelação do bosque (de `escalaInicialDoBosque` a 1, em `duracoes.nevoa`) também é uma `Element.animate`;
  ao fim da revelação ela sai e fica a escala 1 no estilo, como o GSAP deixava. A linha do tempo continua durando `duracoes.nevoa`.
- `src/presentation/animacao/`: `curva-css.ts` (a curva do GSAP vira a Bézier do CSS: `power1` é a quadrática, `power2` a cúbica,
  `power3` a quártica) e `animar-no-navegador.ts` (engole o `AbortError` que cancelar rejeita em `finished`).
- **Sem `Element.animate`** (navegador antigo, piso de compatibilidade) o GSAP faz o mesmo de antes. O desktop com mouse não muda
  (`quickTo` só se move quando o convidado move o mouse).

## Não verificado

Não medi o piscar no aparelho depois da mudança. Ficam por GSAP, e podem piscar se o mesmo princípio valer para elas: a subida da cena
no selo, o desdobramento da carta, as pétalas, as folhas, o esquilo, os pássaros, a água (WebGL) e o zoom do carrossel. Se o piscar
persistir, o próximo passo é levar essas animações para o navegador também, na ordem do que o aparelho mostrar (`?sem=petalas`,
`?sem=vida`, `?sem=js` no `pnpm dev:rede` ajudam a achar qual).
