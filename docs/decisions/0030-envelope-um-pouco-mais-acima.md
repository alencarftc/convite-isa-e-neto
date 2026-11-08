# ADR-0030 · Envelope um pouco mais acima e carta que começa do alto

- **Status:** aceita em 2026-11-08
- **Contexto:** o casal pediu o envelope um pouco mais acima e relatou que, ao tocar nele, "a rolagem aparece a partir do meio ao
  invés do topo".

## O que mudou

- `config.carta.alturaDoPouso` de 2/3 para **0,58**: o centro do envelope fica a 58% da altura da tela, contada do alto (a 42% de
  baixo para cima; em 375 × 812, a 471 px do alto, e não mais a 541 px). As estrelas da história se juntam no mesmo ponto, porque
  usam o mesmo valor, então o envelope continua nascendo da luz delas.
- Ao liberar a rolagem, a carta chama `window.scrollTo(0, 0)`: se a página tiver se mexido enquanto a rolagem estava travada
  (alguns navegadores de celular deixam), ela volta ao início. É uma salvaguarda; no Chrome emulado a página nunca saiu do zero.

## O que não está resolvido

Medi a abertura inteira num celular de 375 × 812: `scrollY` fica em 0 do toque no selo até o fim, e a carta começa a 471 px do alto
(58% da tela), com o casal acima dela, que é o desenho atual (`.conteudo { padding-top: 58dvh }`). Se "a partir do meio" quer dizer
que a carta devia **começar mais no alto**, isso é outra mudança, de layout, e fica para o casal dizer até onde: a carta no topo
esconderia o casal e a cena.
