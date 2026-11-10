# ADR-0022 · Casal maior, esquilo menor e baú que some com o envelope

- **Status:** aceita em 2026-11-01
- **Contexto:** pedidos do casal logo depois da [ADR-0021](./0021-som-da-tampa-e-poeira-de-fada.md): aumentar o casal, diminuir
  mais um pouco o esquilo e fazer o baú sumir assim que o envelope aparece, ao fim dos balões, sem esperar o toque no selo.

## O que mudou

| Pedido                         | Solução                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Casal maior                    | A altura do casal (`--casal-altura`, em `carta.css`) passou de 31% para **37%** da cena na vertical e de 36% para **43%** na horizontal, com os pés no mesmo lugar (`--casal-base`). No celular de 375 × 812, com o convite aberto, ele vai de 148 px a 443 px de altura da tela: a cabeça tem folga em cima e os pés ficam acima da carta (que começa a 475 px).                                     |
| Esquilo um pouco menor         | `vida.esquilo.largura` (a do quadro das duas poses) de 0,20 para **0,17** da tela na vertical e de 0,05 para **0,043** na horizontal: em 375 px o quadro tem 64 px (era 75) e o esquilo sentado, uns 32 px.                                                                                                                                                                                           |
| Baú some quando o envelope vem | A etapa do envelope (`carta.run`) esmaece o `.bau` desde o primeiro instante, em `config.carta.bauSome` (0,8 s), enquanto o envelope desce. Ele ainda pousa onde o baú estava (`pousoY` mede o corpo do baú, que só fica transparente). O esmaecimento que ficava na abertura (`convite.bauSome`, a 1,7 s do toque) saiu: o baú já não está mais lá. Pular continua escondendo o baú no estado final. |
| Poeira de fada até o baú sumir | A fada em loop ([ADR-0021](./0021-som-da-tampa-e-poeira-de-fada.md)) esmaece em `historia:fim`, o evento que antecede a chegada do envelope, junto com o baú.                                                                                                                                                                                                                                         |

## Consequências

- Com o baú fora, o envelope pousa em cima do gramado limpo, na posição em que o baú estava; quem quiser que ele pouse mais para
  cima ou para baixo ajusta `pousoY()` (a razão de 0,2 da altura do corpo do baú).
- O teste novo (`tests/integration/carta.test.ts`) confere que o baú já está transparente quando o envelope pousa e que ainda não
  houve toque no selo.
- O casal em 37% é conferido só no celular emulado; falta ver em aparelhos reais e na horizontal.
