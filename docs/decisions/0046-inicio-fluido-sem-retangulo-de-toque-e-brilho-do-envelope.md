# ADR-0046 · Landing que entra de uma vez, início fluido, cena estável com a barra do navegador, sem retângulo de toque e um glow atrás do envelope

- **Status:** aceita em 2026-11-11
- **Contexto:** depois das ADRs [0043](./0043-carrossel-sem-camadas-permanentes.md), [0044](./0044-animacoes-da-cena-pelo-navegador.md) e
  [0045](./0045-sem-will-change-nas-camadas-de-tela-cheia.md) o convite parou de piscar no Motorola Edge 70 Fusion+, exceto uma troca
  de fotos do carrossel que ainda piscava de leve. O casal pediu também: a transição do início mais fluida (parecia pesada), sem o
  retângulo azul ao tocar no baú e no selo, a confirmação de que o modo escuro saiu, a luz do baú entrando de forma mais suave (surgia
  "seca" quando a cena aparecia) e um efeito de glow atrás do envelope flutuante (o primeiro, de brilho "valioso", não agradou).

## O que mudou

- **Carrossel:** a troca das fotos (a que chega assenta, a que sai desliza e some) e o zoom lento passam a ser `Element.animate`, como
  a deriva e a aproximação da cena (ADR-0044). Quando uma troca termina, o estado final vai para o estilo e a animação é cancelada; uma
  troca interrompida por outra vai direto ao fim; o zoom pausa fora da tela e um zoom terminado não recomeça. Sem `animate` ou com
  animação reduzida, a troca é instantânea. O `will-change` dinâmico da ADR-0043 deixou de ser preciso: o navegador promove a camada
  enquanto a animação anda.
- **Início:** a névoa da entrada (duas camadas de tela cheia) respira por `Element.animate` (deslocamento de 4% e opacidade de 0,85 a
  1,0) e se abre por `Element.animate` partindo de onde a respiração estava (`commitStyles()` e cancelamento), no lugar do GSAP com
  `overwrite`. O clarão que sai de trás do selo ao toque (um gradiente que cresce até 3,4 vezes) também. O GSAP fica de reserva sem
  `animate`, e a névoa continua parada com animação reduzida. É a mesma lição da ADR-0044: escala e deslocamento de camadas grandes
  recalculados por JavaScript a cada quadro pesam; o navegador os roda por conta própria.
- **Luz do baú:** a aura dourada do baú acendia de uma vez no instante em que a cena terminava de aparecer. Agora sobe devagar de 0 até o
  mínimo em `config.bau.aura.entra` (2,6 s, curva suave) e só então passa a respirar.
- **Landing que entra de uma vez:** antes, os nomes vinham no HTML e se escondiam para reaparecer, o selo esperava a própria imagem, "Toque
  para entrar" esperava as imagens críticas e os botões de cima já estavam lá: cada um a seu tempo, o que parecia desordenado. Agora os
  nomes, o selo, "Toque para entrar" e os botões fixos de cima nascem invisíveis (os botões, pela CSS, enquanto a fase é `carregando`) e
  entram juntos, no mesmo instante, em `config.duracoes.entradaJunto` (1,8 s, curva `power2.out`), por `Element.animate`: os nomes e
  "Toque para entrar" sobem `config.entrada.sobe` (10 px) enquanto esmaecem, o selo e os botões só esmaecem. A landing espera a imagem do
  selo no máximo `entradaAguardaSelo` (1,2 s); se ela demorar, entra sem ele e ele chega sozinho com a mesma suavidade, e um selo que
  falha não trava nada. Um toque no meio da entrada leva o que ainda entrava direto ao fim. Com animação reduzida, tudo aparece de uma vez.
  Saíram `entradaNomes` e `entradaNomesAtraso`.
- **Cena estável quando a barra do navegador recolhe:** com o convite aberto, ao rolar, a barra de endereço recolhe e volta, e a cena
  (`height: 100dvh`) mudava de altura a cada passo: as camadas se reescalavam (`object-fit: cover`) e a tela parecia piscar. Agora a cena
  tem `height: 100vh` (a janela grande, que não muda) e fica ancorada na borda de baixo (`inset: auto 0 0`); o chão sob a carta também
  é ancorado embaixo (`bottom`, no lugar de `top: 100%`, que seguia a janela dinâmica); o recuo da carta (`58vh`) e a altura mínima da
  página não usam mais `dvh`. Nada se reescala: com a barra à vista só o céu, que passa do alto, fica sob ela, e o chão, o baú e o casal
  ficam onde estão. Conferido: no computador (sem barra) a cena, o chão e a faixa de gramado ficam nas mesmas posições de antes. Teste:
  `altura-estavel.test.ts`. A entrada (antes de rolar) segue com `dvh`: a página não rola ali.
- **Sem retângulo de toque:** `-webkit-tap-highlight-color: transparent` em todo elemento (era o retângulo azul translúcido do Chrome do
  Android sobre o baú, o selo e os botões) e `user-select: none` e `-webkit-touch-callout: none` na entrada, na cena, no baú, no envelope,
  no inventário, na história e nos botões fixos. O foco do teclado segue visível (`:focus-visible`) e o texto da carta e dos cartões
  segue selecionável (para copiar o endereço e a data). Teste: `toque-sem-destaque.test.ts`.
- **Glow do envelope (estático):** atrás do envelope que flutua (`.envelope__aura`, o primeiro filho, decorativo) há uma luz dourada macia
  em duas camadas: a de dentro (`.envelope__glow`, uma sombra difusa em camadas de ouro que segue o contorno do envelope) e a de fora
  (`.envelope__halo`, uma névoa de luz mais larga). O primeiro efeito, de brilho "valioso" (anel e faíscas), não agradou; o segundo glow foi
  forte demais, o terceiro fraco demais, e o atual é o meio-termo. **Sem nenhuma animação de CSS:** a primeira versão do glow respirava
  (`transform` e `opacity` em duas camadas grandes animadas pelo navegador) e, no Motorola Edge 70 Fusion+, o selo piscava assim que o
  envelope aparecia e o convite continuava piscando depois do toque; com `?sem=css` não piscava. Camadas grandes animadas atrás de uma peça
  que também se move é a combinação da ADR-0044. Só o conjunto anima, por um esmaecimento de `opacity` de 1,1 s ao pousar e ao apagar, e
  apagado vai a `visibility: hidden`, para as camadas não ficarem na GPU com o convite aberto. O selo do envelope, que pulsava por GSAP, passou a
  pulsar por `Element.animate`, mas **isso foi desfeito na [ADR-0048](./0048-pulsacao-do-selo-volta-ao-gsap.md)** (o selo piscava no
  aparelho): hoje ele pulsa pelo GSAP de novo. Testes: `camadas-de-gpu.test.ts` (glow estático e apagado fora do desenho) e `carta.test.ts`.
- **Água protegida:** um erro ao desenhar a água (por exemplo `RangeError: A imagem e a caixa precisam ter largura e altura positivas`,
  visto ao redimensionar a janela até a caixa do lago ficar sem tamanho) subia ao `error` da janela e levava o convite inteiro ao modo de
  segurança. Agora o quadro da água captura o erro, avisa no console, para a água e o lago volta a ser a pintura parada.
- **Tema claro:** conferido, sem mudança: `color-scheme: only light` no `<meta>` e na raiz da CSS, nenhum `prefers-color-scheme`, um só
  `theme-color` (ADR-0042; o teste `tema-claro.test.ts` guarda).

## Não verificado

A estabilidade da cena com a barra de endereço recolhendo só se vê num celular de verdade (o emulador não recolhe a barra); a mudança se
apoia em `vh` ser a janela grande em todos os navegadores de celular. Não medi a fluidez nem o piscar no aparelho: só o celular dela mostra. O glow foi conferido no navegador do app (tela de computador, sobre
um fundo claro), não no aparelho, onde o fundo atrás do envelope é mais escuro e o glow aparece mais. O casal disse que o céu "está
estranho" depois destas mudanças; a geometria e a opacidade das camadas do céu são idênticas às da produção, então a causa não foi achada
(candidatas: o `will-change` tirado das camadas na ADR-0045, e a deriva por animação do navegador; `?com=camadas` e `?sem=deriva` no
`pnpm dev:rede` comparam). Ficam por GSAP, por serem pequenos ou passageiros: o selo (cede, se solta e pulsa), os nomes e o "Toque para
entrar" da entrada, a subida da cena no selo, o desdobramento da carta, as pétalas, as folhas, o esquilo, os pássaros e a água (WebGL).
