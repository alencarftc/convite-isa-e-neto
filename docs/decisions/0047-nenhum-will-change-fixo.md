# ADR-0047 · Nenhum `will-change` fixo na CSS

- **Status:** aceita em 2026-11-11
- **Contexto:** na [ADR-0045](./0045-sem-will-change-nas-camadas-de-tela-cheia.md) o `will-change` saiu só das camadas de tela cheia da cena
  (`.camada` e `.vida`), porque o teste por divisão (`?sem=willchange`) apontava "algum `will-change`", não qual. Os outros ficaram por serem
  pequenos: o do envelope, o das pétalas, das folhas e do esquilo, o das peças da história e o da névoa da entrada. Depois do glow e da
  pulsação do selo, o convite voltou a piscar no Motorola Edge 70 Fusion+ assim que o envelope aparecia e, depois do toque no selo, quando as
  pétalas começavam. O casal lembrou que o `will-change` era o problema original e perguntou se ele tinha saído de tudo: não tinha.

## O que mudou

Saíram todas as declarações `will-change` da CSS: `.envelope`, `.nevoa > span`, as peças da história (`.memoria__centelha`,
`.memoria__cartao`, `.memoria__estrela`, `.historia__clarao`), `.folha`, `.esquilo` e `.petala-do-convite`. A camada de GPU é de quem anima,
só enquanto a peça se move: o `Element.animate` promove o elemento enquanto roda e o GSAP usa transformações 3D durante cada tween (e volta às 2D
ao fim). Sem `will-change`, uma peça parada não ocupa camada na GPU, e as pétalas (até 16 ao mesmo tempo, sempre caindo por cima do convite) não
são mais 16 camadas fixas. O teste `camadas-de-gpu.test.ts` passou a exigir **zero** declarações `will-change` em toda folha de estilo.

## Não verificado

Não medi o piscar no aparelho depois da mudança. O custo esperado é pequeno: um tween do GSAP numa peça sem `will-change` é pintado na camada do
pai até o GSAP promovê-la, o que pode custar um quadro no começo de cada animação; não notei isso no navegador do app. Se o piscar persistir,
`?sem=glow`, `?sem=filtros`, `?sem=mascaras` e `?sem=mistura` no `pnpm dev:rede` dividem o que sobra.

## Também saiu o `clip-path` da cena

Com `?sem=glow`, `?sem=willchange`, `?sem=filtros`, `?sem=mascaras` e `?sem=mistura` o piscar do envelope continuou, e antes só `?sem=css` (todos
os efeitos de CSS juntos) o parava. Das peças de CSS, a única relevante nesse momento e ainda não testada sozinha era `clip`: o
`clip-path: inset(0 0 -24px)` de `.cena`. Ele só cortava o que as camadas passam da cena (24 px por lado), e como a cena é fixa na janela o
que passa já fica fora da tela, então o corte não aparecia; e um `clip-path` num elemento fixo cheio de camadas, uma delas um canvas WebGL
redesenhado a cada quadro, faz o navegador recortar tudo a cada quadro. Saiu. O teste `altura-estavel.test.ts` barra a volta. Se o piscar
continuar, `?com=dvh` (a cena e o chão do jeito de antes da ADR-0046) e `?sem=css` separam o que falta.
