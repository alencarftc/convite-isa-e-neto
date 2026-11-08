# ADR-0026 · Memórias em luz no lugar dos balões

- **Status:** aceita em 2026-11-08
- **Contexto:** o casal não gostou da apresentação dos balões e pediu algo que mostrasse que **memórias preciosas estão saindo do
  baú**, de forma mais harmoniosa, bonita e memorável. A proposta (centelhas que viram cartões, poeira dourada, estrelas que
  viram o envelope) foi aprovada.

## O que mudou

A história continua com cinco memórias de 5 s, uma depois da outra, e com os mesmos eventos (`historia:inicio`, `historia:balao`,
`historia:ultimo`, `historia:fim`) e a mesma região `aria-live`. Mudou o gesto de cada uma:

| Momento (dentro dos 5 s) | O que se vê                                                                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0 – 1,1 s                | Uma **centelha dourada** sai da boca do baú e sobe em curva até o meio da tela (`x` e `y` em ritmos diferentes).                                                                                                                           |
| 0,85 – 1,4 s             | A centelha se abre num **cartão-memória**: marfim, filete dourado duplo, um losango no alto (como os da carta) e um halo de luz quente, levemente inclinado e com um desvio próprio. Com a foto do casal, o medalhão entra acima da frase. |
| 1,4 – 4,4 s              | A frase fica legível por 3 s e o cartão **respira** (cresce 2,5% e volta).                                                                                                                                                                 |
| 4,4 – 5 s                | O cartão sobe um pouco e se desfaz em **poeira dourada** (14 grãos que caem e somem), e uma **estrela** voa dele ao seu lugar num arco sobre o baú.                                                                                        |
| depois da 5ª (26,1 s)    | As cinco estrelas, que cintilam, **descem juntas** (1,1 s) ao ponto onde o envelope pousa; um clarão acende ali e o **envelope nasce dele**, crescendo no lugar, enquanto o baú se apaga.                                                  |

A história inteira passou de 25 s para **26,1 s** (5 × 5 s + 1,1 s de convergência). A fada, que começa a se esvair em `historia:ultimo`
(a 20 s), já terminou quando as estrelas se juntam.

## Peças

- `presentation/historia/cena-historia.ts` foi reescrita (centelha, cartão, poeira, estrela, clarão); `historia.css`, idem. O
  tratamento da foto em círculo (`foto-em-circulo`) fica, usado também na história estática.
- `domain/historia/estrelas.ts`: `posicoesDasEstrelas`, o arco de 150° a 30° sobre a boca do baú (com testes). Saiu
  `domain/historia/posicoes.ts`, que posicionava os balões.
- `config.historia` ganhou os parâmetros da cena (`centelhaSobe`, `cartaoEm`, `respiro`, `poeira`, `estrela`, `arco`,
  `convergencia`, `desvios`, `inclinacoes`…); saíram os dos balões (`saida`, `leitura`, `balanco`, `alturas`…).
- **Envelope:** `cena-carta` não o faz mais descer do alto, inclinado: ele aparece no lugar onde pousa (a 1/3 da altura da tela, de baixo
  para cima), crescendo de `config.carta.escalaDeNascimento` (0,82) a 1. Saíram `alturaDeSaida` e `inclinacao`.
- **Nuvens fora:** `balaoA/B/C` saíram do manifesto de imagens, da fila de carregamento, do orçamento de peso e do `pnpm arte`, e os
  três `11-balao-*.webp` foram apagados (os originais continuam em `arte/originais/`, fora do Git). A cena não pede mais imagem
  nenhuma sem as fotos do casal.
- Segue valendo "nada acelera nem pula" (ADR-0012), a região `aria-live` e o `skip()`, que esconde tudo.

## Conferido

Testes novos e reescritos (`historia.test.ts`, `estrelas.test.ts`): cartão e frase por memória, uma memória por vez, poeira, estrelas
(uma por memória, em arco da esquerda para a direita), convergência ao ponto de pouso e clarão, tempos reais (frase legível por pelo
menos 3 s, estrela e poeira dentro dos 5 s). Fotografado no Chrome sem tela, a 375 × 812 e em tempo real: cartão, poeira à frente do
cartão, arco de cinco estrelas sobre o lago e o envelope nascendo no lugar do baú.

## Consequências

- Só foi visto no celular em pé; a horizontal usa `alturaDoCartaoNaHorizontal` (0,30) e não foi vista.
- As poses e a música não mudam; uma nota de harpa por memória ficou como ideia, não feita.
- O espelho da SPEC-05 e o Claude Docs seguem descrevendo balões; vale este registro.
- Cada memória tem uns 20 elementos (poeira inclusa), 100 no total, todos `transform` e `opacity`; só a centelha, o cartão, a estrela
  e o clarão ganham camada própria. Falta medir num Android intermediário.
