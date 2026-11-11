# ADR-0049 · Pausar a deriva a cancela e solta as camadas de GPU

- **Status:** aceita em 2026-11-11
- **Contexto:** o convite continuava piscando no Motorola Edge 70 Fusion+ quando o envelope aparecia (o selo piscava) e depois do toque no selo,
  inclusive com `?sem=css`, `?com=dvh`, `?sem=vida` e com a pulsação do selo de volta ao GSAP ([ADR-0048](./0048-pulsacao-do-selo-volta-ao-gsap.md),
  que não mudou o piscar). Como nenhum interruptor de CSS ou de peça de vida resolvia, listei o que o navegador mantinha vivo nessa hora.

## O que achei

Reproduzindo o caminho no navegador do app, em modo celular (toque), e chamando `document.getAnimations()` quando a fase vira
`aguardando-selo` (o envelope pousou): **dez animações infinitas, todas `paused`**, nas dez camadas de tela cheia com profundidade (céu, céu do
sol, três espaços da vida, lago, árvores, baú, primeiro plano e casal). É a deriva do celular ([ADR-0044](./0044-animacoes-da-cena-pelo-navegador.md)):
a cena a pausa justamente quando a fase vira `aguardando-selo`, `convite` ou `informacoes` (ADR-0041), e `pause()` não a encerra.

Uma animação do navegador pausada continua "em curso" (não terminou nem foi cancelada), e para o Chrome um elemento com animação de `transform`
em curso fica numa camada de GPU própria, como se tivesse `will-change: transform`. Era a mesma situação que a [ADR-0045](./0045-sem-will-change-nas-camadas-de-tela-cheia.md)
e a [ADR-0047](./0047-nenhum-will-change-fixo.md) tiraram da CSS: dez camadas de tela cheia presas na memória da GPU com o convite aberto, só que
agora criadas pelo JavaScript e começando exatamente quando o envelope aparece, que é onde o casal viu o piscar começar. Antes da ADR-0044 a
deriva era um tween do GSAP pausado, que deixa um `translate3d` inline pelo mesmo motivo; por isso a versão da produção também piscava.

## O que mudou

`presentation/bosque/profundidade.ts`, `derivaNoNavegador`: **pausar cancela a animação** em vez de pausá-la. Antes de cancelar, guarda o ponto
em que a camada está: o tempo da animação (`currentTime`) e o deslocamento (lido da transformação calculada), que fica no estilo como um
`translate(x, y)` 2D, sem `3d`. A camada não se move nem salta (conferido: `translate(1.346px, 0px)` e assim por diante), e sem animação em curso
ela deixa de ocupar camada de GPU. **Retomar** recria as animações no mesmo tempo guardado, e o estilo anterior de cada camada volta ao que era.
`parar()` também devolve o estilo. Nada muda para o mouse nem para o navegador sem `Element.animate` (GSAP).

Conferido no navegador do app (modo celular) até o envelope: durante o baú as dez animações rodam; com o envelope pousado só restam três
animações já terminadas (o clarão do selo e a névoa, com `fill`, que não são "em curso"), e as dez camadas têm cada uma um `translate` 2D no estilo.
Testes: `bosque.test.ts` (pausar cancela e deixa o `translate` 2D, retomar recria no mesmo tempo, destruir devolve o estilo), com `currentTime` no
falso `animacoes-falsas.ts`.

## Resultado e o painel de diagnóstico

O casal testou e o convite **continuou piscando**: a deriva pausada não era a causa (ou não era a única). A correção fica, porque soltar dez
camadas paradas é certo por si, mas o piscar pede outro jeito de procurar. Os testes por parâmetro (`?sem=`, `?com=`) recarregam a página e
mudam o estado a cada rodada, e o piscar depende do estado (envelope esperando, convite aberto, rolando). Entrou o **painel de diagnóstico**
(`infrastructure/desenvolvimento/painel-de-diagnostico.ts`): só em desenvolvimento e só com `?painel`, um botão "D" no canto abre uma lista de
peças (cena inteira, chão, envelope, carta, pétalas, camadas da cena, luz, vida, água, baú, casal, glow, filtros, máscaras, mistura, sombras,
todas as imagens, GSAP congelado, cancelar animações do navegador). Cada toque esconde a peça NA HORA e outro a devolve, sem recarregar, então
quem está com o aparelho vê qual peça faz o piscar parar enquanto ele acontece. Não vai para a produção (o bundle não o contém).

## Não verificado

Não medi no aparelho. A hipótese combina com tudo que o casal relatou (começa quando o envelope aparece, a cena por trás fica parada, piora ao
rolar, e todas as versões anteriores piscavam), mas só o celular dela confirma. O interruptor que testa a mesma coisa sem esperar este código é
`?sem=deriva` (cancela a deriva logo no começo). Ainda ficam, pequenas, as folhas que param no ar (`translate3d` do GSAP, 11 a 17 px de largura), a
chave do inventário e o zoom pausado da foto fora da tela no carrossel; se o piscar sobrar, são o próximo alvo.
