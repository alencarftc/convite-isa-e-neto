# ADR-0043 · Carrossel sem camadas de GPU permanentes (o piscar no Motorola Edge 70 Fusion+)

- **Status:** aceita em 2026-11-10; corrige o carrossel da [ADR-0027](./0027-carrossel-dica-do-bau-role-para-ler-e-petalas-infinitas.md)
- **Contexto:** no Motorola Edge 70 Fusion+ (Android 16, tela de 144 Hz), o convite piscava, imagem por imagem. No Galaxy A54 não.
  Não se reproduz no computador. O convidado notou que **o conteúdo do convite piscava e a composição de trás ficava parada**, e que
  o piscar era mais forte no **carrossel de fotos**, de modo que a água, a deriva das camadas e as folhas, que estão na cena, não eram
  a causa.

## Causa provável

Cada uma das cinco fotos do carrossel era um `.carrossel__slide` com `will-change: transform, opacity`, com uma `<img>` de fundo
desfocada (`filter: blur(18px)`) e a foto por cima, também com `will-change: transform`: dez camadas de GPU permanentes, de
cerca de 424 × 530 px de CSS cada, num recorte de cantos arredondados, todas ao mesmo tempo, mesmo as quatro fotos transparentes.
Numa tela de alta densidade isso é muita memória de GPU parada, e o navegador descarta e redesenha camadas quando precisa. Não pude
medir na GPU do aparelho: é uma hipótese, apoiada por o piscar ter parado no carrossel depois do ajuste (teste no aparelho, via
`dev:rede`, em 10/11/2026).

## O que mudou

- As fotos que não estão à vista ficam **`visibility: hidden`** (`autoAlpha` do GSAP), e não só com `opacity: 0`: o navegador não
  as desenha nem as guarda em camadas.
- A **camada de GPU só existe enquanto a peça se move**: `will-change` sai da CSS do `.carrossel__slide` e do `.carrossel__foto` e o
  JavaScript o põe no slide que sai e no que chega durante a troca (e o tira ao fim) e na foto que faz o zoom (e o tira quando o zoom
  termina ou a foto sai). No máximo quatro peças têm camada ao mesmo tempo (era dez, sempre).
- O **zoom lento para quando o carrossel sai da tela** e volta quando ele reaparece.
- O visual não muda: continua o fundo desfocado, os cantos arredondados e a mesma troca.

## Chave de diagnóstico (só em desenvolvimento)

`src/infrastructure/desenvolvimento/diagnostico-de-piscar.ts`, ligada em `main.ts`, desliga peças por endereço no `pnpm dev:rede`, para
achar o culpado de um defeito de composição que só aparece num aparelho: `?sem=agua,deriva,folhas,passaros,esquilo,petalas,aura`
(JavaScript), `?sem=mascaras,filtros,willchange,clip,mistura,fundo,cantos,sombra` (CSS), `?sem=tudo`, `?fps=60` (teto do relógio das
animações) e `?velho=carrossel` (o carrossel com as camadas permanentes de antes, para comparar). Em produção nada disso existe: tudo
volta vazio (há teste).

## Consequências

- O mesmo padrão vale para o resto: `will-change` permanente só em peça que se move o tempo todo (a cena, as folhas); peça grande que
  fica parada não o recebe. Ao medir o convite no Chrome, as camadas passaram de 2,66 milhões de pixels de CSS antes do baú a 3,03 com
  a vida da cena, fora o carrossel e a carta.
- Não verificado: se **todo** o piscar acabou. O carrossel parou de piscar no aparelho; o resto do convite (texto da carta, cartões,
  botões) precisa de nova conferência no mesmo aparelho. Se algo ainda piscar, os próximos suspeitos são o `mix-blend-mode: difference`
  dos blocos da carta (ADR-0016) e o `filter` da carta (`drop-shadow`).
