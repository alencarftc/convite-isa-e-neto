# SPEC-06 · Carta e convite

> Espelho local da sub-aba "SPEC-06 · Carta e convite" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon
> Onde esta spec diz `.js`, leia `.ts` ([ADR-0001](../decisions/0001-typescript-e-clean-architecture.md)).

**Histórias:** US-06.1 a US-06.5 · **Prioridade:** Must · **Pontos:** 15

## Resumo

Quando o último balão some, um envelope bege com selo de cera azul pousa sobre o baú. O convidado toca no selo, ou espera 4 s, e o envelope se abre: a carta sobe de dentro dele e se desdobra. Ao mesmo tempo, a cena sobe e mostra, ao pôr do sol, o casal pintado de costas à beira do lago. A primeira tela final é a cena de filme do briefing: o casal na metade de cima e o começo da carta na de baixo. Rolando, o convidado lê a carta inteira e chega às informações.

## Escopo

**Dentro:** envelope, selo com iniciais, dica, espera de 4 s, abertura, carta desdobrando, movimento da cena, casal, pétalas finais, layout e tipografia da carta, liberação da rolagem e foco.

**Fora:** o som do selo e a troca de música (SPEC-08), as informações abaixo da carta (SPEC-07) e o estado direto da animação reduzida (SPEC-09).

## Comportamento

**Passo 4, o envelope (`tlCarta`, 3 s)**

| Início | O que acontece | Duração | Curva |
| --- | --- | --- | --- |
| 0 | O envelope surge no alto (60% acima do centro, inclinado −6°) e desce até pousar sobre o baú, endireitando | 1,2 s | `power3.out` |
| 0,6 s | A sombra sob o envelope aparece (opacidade 0→0,35) | 0,6 s | `sine.out` |
| 1,2 s | Emite `carta:pousou`; começa a contagem de 4 s | — | — |
| 1,7 s | Dica "Toque no selo" surge abaixo do envelope; o selo passa a pulsar (escala 1↔1,06 a cada 1 s) | 0,3 s | `power2.out` |
| 3 s | Fim da timeline; espera o toque ou o fim dos 4 s (o que vier primeiro) | — | — |

**Passo 5, o convite (`tlConvite`, 7 s)**

| Início | O que acontece | Duração | Curva |
| --- | --- | --- | --- |
| 0 | Emite `carta:abrindo` (som do selo e música 2); a dica some | 0,2 s | `power2.out` |
| 0 | O selo cresce (1→1,12) e se parte em duas metades que giram ±20° e caem 40 px, sumindo | 0,15 s + 0,25 s | `power2.out` / `power2.in` |
| 0,4 s | A aba abre: o envelope fechado (12) dá lugar ao aberto (13), com leve aumento (1→1,02) | 0,3 s | `power1.out` |
| 0,7 s | A carta, dobrada e atrás do envelope, sobe e sai pela abertura | 1,0 s | `power2.out` |
| 1,7 s | O envelope desce e some | 0,8 s | `power2.in` |
| 1,7 s | A cena inteira sobe 18% da altura da tela e o baú some (0,6 s) | 1,5 s | `power2.inOut` |
| 2,0 s | O casal pintado surge de costas, sob a árvore à beira do lago (`opacity` 0→1, `y` 8→0 px) | 1,5 s | `sine.out` |
| 2,2 s | A carta se desdobra (escala vertical 0,35→1, a partir do topo) e assenta na posição final | 1,2 s | `power3.inOut` |
| 3,4 s | Os blocos de texto da carta aparecem um a um (`opacity` 0→1, `y` 8→0), com 0,12 s entre eles | cerca de 1,0 s | `power2.out` |
| 4,4 s | Oito a doze pétalas azuis caem devagar pela tela e somem | 1,6 s | `sine.inOut` |
| 6,0 s | Surge "Role para ler" com uma seta discreta na base da tela; a rolagem é liberada | 0,5 s | `power2.out` |
| 7,0 s | Emite `convite:aberto`; o foco vai para o título da carta | — | — |

**Primeira tela final:** céu de pôr do sol e casal na metade de cima; na de baixo, o topo da carta começa a 52% da altura (na vertical) ou a 55% (na horizontal). A cena fica fixa e a carta e as informações rolam sobre ela.

## Requisitos funcionais

- **RF-06.1** O envelope mede `min(78vw, 360px)` de largura e pousa centralizado sobre o baú. Mostra "Para você e sua família" (`content.envelope.para`) em Great Vibes, na cor `--cor-texto`, acima do selo.
- **RF-06.2** O selo é a imagem 15 sobre o envelope, com as iniciais "I&D" em Great Vibes dourada (`--cor-dourado`) ocupando 40% da largura do selo; as iniciais são texto, não imagem.
- **RF-06.3** Um `<button class="carta__abrir" aria-label="Abrir o envelope">` cobre o envelope inteiro; a área do selo tem pelo menos 64 × 64 px.
- **RF-06.4** A abertura começa no primeiro toque ou `config.duracoes.esperaSelo` (4 s) depois de `carta:pousou`; `carta:abrindo` informa a origem (`'toque'` ou `'tempo'`). As duas origens rodam a mesma `tlConvite`.
- **RF-06.5** O rompimento do selo usa duas cópias da imagem 15 recortadas ao meio (`clip-path: inset(0 50% 0 0)` e `inset(0 0 0 50%)`).
- **RF-06.6** A carta começa atrás do envelope (camada abaixo) e, ao subir, parece sair da abertura; o envelope cobre a parte de baixo da carta durante a subida.
- **RF-06.7** Antes de `tlConvite` mexer na luz, a `tlLuz` é levada ao fim (pôr do sol), mesmo que a história tenha sido acelerada ou pulada.
- **RF-06.8** O casal (imagem 17) fica sobre a margem do lago, à direita do centro, sob a árvore da direita, com 16% da altura da tela; posição em variáveis CSS, ajustável com a imagem real. Se a montagem não ficar natural, a cena final (imagem 18) substitui céu, lago, árvores e casal nesse momento.
- **RF-06.9** Até `convite:aberto`, a página não rola (`overflow: hidden` no `<body>`); depois, a cena fica fixa e a carta e as informações rolam sobre ela.
- **RF-06.10** Em `convite:aberto`, o foco vai para o título da carta (`tabindex="-1"`), e a visita é registrada (`convite:visitado`, SPEC-09).
- **RF-06.11** `convite.skip()` leva tudo ao estado final da primeira tela, sem envelope, com rolagem liberada.

## Requisitos não funcionais

- **RNF-06.1** Os textos da carta são HTML real, com os tokens de tipografia, nunca parte da imagem do papel.
- **RNF-06.2** O desdobramento usa só `transform` e `opacity`; a carta não muda de altura durante a animação, para não recalcular o layout a cada quadro.

## Layout da carta

A carta é uma coluna centralizada de `min(92vw, 560px)`, com fundo na imagem 14 (reserva: `--cor-marfim`), margem interna de 32 px × 24 px no celular e 48 px no computador, e todo o texto centralizado na cor `--cor-texto`.

| Ordem | Bloco | Conteúdo | Tipografia |
| --- | --- | --- | --- |
| 1 | Versículo | "Melhor é serem dois do que um… e o cordão de três dobras não se quebra tão depressa." | Cormorant Itálico, `--texto-corpo` |
| 2 | Referência | Eclesiastes 4:9,12 | Rótulo: 13 px, maiúsculas, espaçamento 0,12em, `--cor-texto-suave` |
| 3 | Filete | Linha dourada fina com um pequeno ornamento central (SVG) | `--cor-dourado` |
| 4 | Bênção | COM A BÊNÇÃO DE DEUS E DE SEUS PAIS | Rótulo |
| 5 | Pais | Duas colunas: à esquerda, Marcelo André Pinto da Silva e Elizabete de Farias Vaz; à direita, Sara Raquel Coimbra Cardoso e Ronaldo Silva Damasceno. Um nome por linha | Cormorant, 15 a 16 px |
| 6 | Nomes (título da carta) | Isabella Vaz & David Neto | Great Vibes, `--texto-nomes`; o "&" em `--cor-dourado` |
| 7 | Convite | Esta carta foi escrita para você e sua família. Transbordando de amor, alegria e gratidão, queremos ter vocês ao nosso lado no dia mais especial da nossa história: o nosso casamento. | Cormorant, `--texto-corpo` |
| 8 | Data | SEXTA-FEIRA · 22 DE JANEIRO DE 2027 · 17H | Rótulo maior: 15 px, maiúsculas |
| 9 | Local | Cerimônia e recepção · Sítio Olinda — Espaço para Eventos · R. Nações Unidas, 407 · Benevides, PA | Cormorant, `--texto-corpo`, em três linhas |
| 10 | Filete | Igual ao bloco 3 | — |
| 11 | Fecho | "Portanto, o que Deus ajuntou não separe o homem." | Cormorant Itálico |
| 12 | Referência | Mateus 19:6 | Rótulo |
| 13 | Despedida | Com amor, | Cormorant Itálico |
| 14 | Assinatura | Isabella & David | Great Vibes, 32 px |

Em telas com menos de 360 px, as duas colunas dos pais viram uma só: primeiro os pais da noiva, depois os do noivo, com um filete curto entre eles.

## Desenho técnico

```html
<div class="envelope" aria-hidden="false">
  <img class="envelope__fechado" src="images/objects/12-envelope-fechado.webp" alt="">
  <img class="envelope__aberto" src="images/objects/13-envelope-aberto.webp" alt="">
  <p class="envelope__para">Para você e sua família</p>
  <div class="selo"><img src="images/objects/15-selo.webp" alt=""><span class="selo__iniciais">I&amp;D</span></div>
  <button class="carta__abrir" aria-label="Abrir o envelope"></button>
  <p class="carta__dica" aria-live="polite"></p>
</div>

<main class="conteudo">
  <article class="carta" aria-labelledby="carta-titulo">
    <!-- blocos 1 a 5, gerados de content.carta -->
    <h2 id="carta-titulo" tabindex="-1">Isabella Vaz <span class="e">&amp;</span> David Neto</h2>
    <!-- blocos 7 a 14 -->
  </article>
  <!-- informações: SPEC-07 -->
</main>
```

A carta e as informações já existem no HTML desde o carregamento, com `inert` e invisíveis até `convite:aberto`. Assim, o modo de segurança e o `<noscript>` (SPEC-09) usam o mesmo conteúdo.

**Pétalas:** de 8 a 12 elementos com as imagens 16a, 16b e 16c, posição inicial aleatória no alto da tela, queda de 40 a 60% da altura com balanço lateral de ±30 px e rotação de até 180°. São removidos do DOM ao terminar. A mesma função serve à abertura do baú (SPEC-04), com 4 a 6 pétalas subindo.

## Conteúdo e assets

- `content.envelope.para`, `content.dicas.selo`, `content.dicas.rolar` ("Role para ler") e `content.carta` (blocos 1 a 14).
- Imagens 12, 13, 14, 15, 16 e 17 (18 como reserva).

## Casos de borda

| Situação | Reação |
| --- | --- |
| Toque no selo e, no mesmo instante, fim dos 4 s | Só a primeira origem vale; a segunda é ignorada |
| Celular deitado, com pouca altura | A carta começa a 55% da altura e a rolagem mostra o resto; o casal continua visível no alto |
| História acelerada ou pulada | A luz é levada ao pôr do sol antes da abertura (RF-06.7) |
| Imagem 17 não carregou a tempo | A abertura segue sem o casal; ele surge em 1,5 s quando chegar |
| Convidado rola durante a abertura | A rolagem só é liberada aos 6 s (RF-06.9) |
| Texto da carta maior que a tela | Normal: a carta rola; a cena continua fixa por trás |

## Casos de teste

- **CT-06.1** Assistir até o envelope: pouso em 1,2 s, texto "Para você e sua família", selo com I&D, dica 0,5 s depois. *(CA-06.1.1, CA-06.1.2)*
- **CT-06.2** Tocar no selo e, numa segunda rodada, no canto do envelope: as duas abrem. *(CA-06.2.1, CA-06.2.2)*
- **CT-06.3** Não tocar e cronometrar: abertura 4 s depois do pouso. *(CA-06.3.1)*
- **CT-06.4** Gravar a abertura: carta desdobrada em cerca de 1,2 s, casal surgindo, passo inteiro em cerca de 7 s; primeira tela com o casal em cima e a carta embaixo. *(CA-06.4.1, CA-06.4.2)*
- **CT-06.5** Comparar a carta, bloco a bloco, com "Textos do convite" no documento de requisitos. *(CA-06.5.1, CA-06.5.2)*
- **CT-06.6** Abrir em 320 px e conferir os pais em uma coluna; em 375 px ou mais, em duas. *(Layout da carta)*

## Questões em aberto

- **Imagem 12:** o prompt atual gerava o envelope já com selo. O selo animado fica por cima, e, ao se partir, o selo da imagem apareceria por baixo. A imagem 12 deve ser gerada sem selo; o prompt foi ajustado no documento de requisitos em 26/10/2026.
- A posição final do casal depende das imagens 04, 05 e 17.
