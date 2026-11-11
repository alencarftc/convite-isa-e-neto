# ADR-0050 · Sem mistura de cores em camada grande, e menos trabalho por quadro

- **Status:** aceita em 2026-11-11
- **Contexto:** o convite piscava no Motorola Edge 70 Fusion+ (144 Hz, Android 16) e não no Galaxy A54. As ADR-0043 a 0049 tiraram uma causa
  de cada vez (camadas permanentes, `will-change`, movimento de peças grandes por JavaScript, deriva pausada), e cada uma ajudou um pouco sem
  resolver. O que quebrou o impasse foi o painel de diagnóstico (`?painel`, ao vivo, no aparelho): `wc: carta` e `congelar GSAP` pararam o piscar
  do convite aberto, e depois **desligar a mistura `soft-light` o parou de vez**.

## O padrão

O convite pedia à GPU do celular mais do que ela aguenta com folga, e o jeito mais caro de pedir é a **mistura de cores
(`mix-blend-mode`) numa camada grande**. Uma peça em mistura obriga o navegador a desenhar tudo o que está embaixo dela num buffer à parte, do
tamanho da tela, e a refazê-lo em cada quadro em que algo embaixo muda. A luz do pôr do sol era uma camada de **tela cheia em `soft-light`
sobre a cena inteira** (cinco imagens de 941×1672, o canvas da água e os espaços da vida), com a opacidade reescrita pelo GSAP durante os 26 s da
história: o buffer era refeito a cada quadro. Somavam-se uma subida da cena por JavaScript, a água redesenhada a 144 quadros por segundo, dois
céus opacos empilhados atrás de uma pintura que os cobre e dez camadas de tela cheia em deriva. Cada conserto anterior liberava uma parte do
orçamento da GPU, mas a mistura continuava lá; por isso nenhum interruptor sozinho bastava.

## O que mudou

**A causa:**

- **`soft-light` sai.** `.camada--luz` é um degradê comum (14% e 5% de opacidade no lugar de 45% e 15%: o `soft-light` clareia e esquenta
  cerca de um terço do que uma sobreposição normal faria). Conferido lado a lado no navegador, no estado final: indistinguível. O mesmo vale
  para o tom das fotos em círculo (`.foto-em-circulo::after`, opacidade 0,08). A única mistura que resta é `difference` nos blocos de texto
  da carta (ADR-0016, a tinta que resiste a navegadores que escurecem a página), dentro de uma carta isolada e com camada própria.
- **A carta ganha `will-change: transform, opacity` pelo JavaScript** a partir do envelope (`darCamadaACarta`): é a única peça que o pede (o
  teste ao vivo `wc: carta` parou o piscar).

**Menos trabalho por quadro, sem mudar o que se vê:**

- O pôr do sol (céu e luz) roda no navegador (`Element.animate`), em `bosque/luz-do-por-do-sol.ts`; ao chegar a 1, o céu de baunilha (que ficou
  inteiramente coberto, as duas imagens são opacas) sai do desenho: uma camada de tela cheia a menos.
- A subida da cena e do chão e o desdobrar da carta rodam no navegador (a transição envelope→convite), com o GSAP só de reserva.
- A deriva do celular não anima a camada que se moveria menos de 1 px (o céu: 0,07 px), e pausar a deriva a cancela (ADR-0049).
- A água se redesenha a 30 quadros por segundo em qualquer nível (`vida.completo.quadrosDaAgua`), e não a cada quadro da tela.
- O GSAP tem teto de 60 quadros por segundo (`movimento.quadrosMaximosDoGsap`): em 120 ou 144 Hz não reescreve o estilo de dezenas de peças a
  cada quadro da tela. O que o navegador anima sozinho segue na taxa da tela.

**Garantias** (`tests/integration/padroes-de-renderizacao.test.ts`, que falhava antes das mudanças): só `difference` e só dentro da carta; nenhuma
camada da cena, da vida, do chão ou da carta aberta mistura, tem `filter` ou máscara; nenhum `backdrop-filter`; o único desfoque é o do fundo do
carrossel; `will-change` nunca na CSS e só no JavaScript da carta; o código não escreve mistura; teto do GSAP ≤ 60 e da água ≤ 30. Mais os
testes de cada cena (`luz-do-por-do-sol`, `bosque`, `carta`, `historia`, `agua`) e `painel-de-diagnostico`.

## Conferido e não conferido

No navegador do app, em modo celular, o fluxo inteiro: durante o baú só as sete camadas com deriva visível rodam; com o envelope na tela, o
céu de baunilha está oculto, o pôr do sol em 1 e **nenhuma animação do navegador em curso**; depois do selo, a cena sobe, a carta abre e nada fica
animado. A luz nova foi comparada à antiga no Chrome. **Não** medi o piscar no aparelho depois da última rodada (só o celular dela mostra).

## Se voltar a piscar

`?painel` no `pnpm dev:rede` esconde peça por peça ao vivo. Os suspeitos que sobram são, nesta ordem: a mistura `difference` do texto da carta
(um só bloco de mistura em volta do texto, no lugar de 14), as pétalas (cinco tweens do GSAP por pétalas, até 16), o desfoque do fundo do
carrossel e o canvas da água (limitá-lo à região do lago).
