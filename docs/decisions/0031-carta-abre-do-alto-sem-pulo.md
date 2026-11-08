# ADR-0031 · A carta abre do alto, sem o pulo para o topo

- **Status:** aceita em 2026-11-08
- **Contexto:** depois da [ADR-0030](./0030-envelope-um-pouco-mais-acima.md) o casal relatou que, ao abrir o envelope, o convite "aparece no
  meio e logo depois redireciona o usuário para o topo". A causa não era o desenho da carta, e sim a rolagem da página.

## Causa

O casal recarrega a página para testar. **O navegador restaura a rolagem da visita anterior** (a carta tinha ficado rolada) e o faz
mesmo com `overflow: hidden` no `body`, porque a restauração é programática. Reproduzido no Chrome a 375 × 812: rola a carta até
900 px, recarrega, e `scrollY` volta a 900; o envelope, a história e o toque no selo acontecem com a página em 900. Quando a carta
se desdobra, ela aparece rolada (o "meio") e, 2,7 s depois, o `window.scrollTo(0, 0)` que a ADR-0030 pôs ao liberar a rolagem a puxa
para o alto: o "redirecionamento". Antes disso o problema era só o primeiro tempo, a carta aparecendo no meio.

## O que mudou

- `history.scrollRestoration = 'manual'` logo no início do `main.ts`: o navegador não restaura mais a rolagem ao recarregar.
- A carta **mantém a página no alto desde que é montada**: chama `scrollTo(0, 0)` e escuta `scroll`, desfazendo na hora qualquer
  rolagem fora do zero (restauração tardia, foco, um navegador que deixe rolar com a rolagem travada) até a rolagem ser liberada.
  Ao liberar, a trava sai e a página volta ao zero só por garantia (como já era, agora sem efeito visível porque já está lá).
- Os testes de integração da carta passam a desfazer cada carta que criam ao fim do teste, porque a trava escuta a janela.

Conferido no Chrome com o mesmo roteiro: depois de recarregar, `scrollY` é 0 no baú, no selo e do toque no selo até 8 s depois, e a
carta fica a 471 px do alto o tempo todo, sem pulo.

## Consequências

- Quem recarrega a carta já lida volta ao começo da experiência (entrada), como sempre, e agora também ao alto da página.
- A carta continua começando a 58% da altura da tela, com o casal acima (o desenho atual).
