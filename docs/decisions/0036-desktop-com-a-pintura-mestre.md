# ADR-0036 · O desktop usa a pintura mestre 16:9, em qualquer formato de janela

- **Status:** aceita em 2026-11-09 (só na branch `feat/cena-viva`)
- **Contexto:** o casal passou uma lista de defeitos do desktop: folhas imensas, mato e arbustos enormes cobrindo o baú, o muro
  de pedra "sumido", o baú flutuando sobre a água, um quinto da tela em verde chapado depois de abrir a carta, esquilo rápido
  demais (depois, pulando demais), casal e baú pequenos diante da pintura, envelope, carta e cartões pequenos, e, por fim, a
  composição que "quebrava" quando a janela ficava mais alta que larga e o esquilo sobre a água numa janela larga e baixa.

## Causa

No desktop a cena era feita de camadas separadas (`04-lago`, `05-arvores`, `06-primeiro-plano`), que não têm o muro de pedra
nem o gramado onde o baú se assenta: o primeiro plano tinha a largura da tela e, num monitor de 1920 px, 670 px de mato. O
celular, desde a [ADR-0015](./0015-cena-vertical-da-pintura-mestre-e-aviso-de-tema.md), usa a **pintura mestre** inteira, sem o
céu, que traz o muro, o gramado e os arbustos nos cantos. Além disso, "computador" dependia da orientação da janela: ao
estreitar o navegador, ele caía na composição do celular.

## O que mudou

- **Arte (`pnpm arte`):** a pintura mestre 16:9 sem o céu (`01-cena-16x9.webp`, 452 KB), os arbustos dos cantos como primeiro
  plano (`01-cena-16x9-frente.webp`, 133 KB) e uma faixa de gramado para a base (`06-chao-computador.webp`, 134 KB), todas
  dentro do orçamento. O céu quente sai por `removerCeu`, e o pálido e cinzento do alto, por `expandirCeuPalido` (novo, com
  testes). `pnpm arte -- --so-computador` gera só essas três. `config.imagens` ganhou a variante `computador` em `lago`,
  `arvores`, `primeiroPlano` e `chao`; as árvores apontam para a imagem vazia, como na vertical.
- **"Computador" é o mouse, em qualquer formato de janela** (`estado.computador = !toque`): carrega a arte do computador, sem
  `<source>` de retrato, e a janela estreita não vira o celular. O celular de pé, o celular deitado e o tablet (toque) seguem
  exatamente como antes (conferido: baixam os mesmos arquivos de antes).
- **Pintura ancorada pela base**, centrada na horizontal (`object-position: center bottom`): numa janela baixa corta-se o céu,
  nunca o gramado. As variáveis `--mestre-largura` e `--altura-da-cena` (bosque.css) dão o tamanho da pintura, e o que se prende
  ao chão dela mede a partir da borda de baixo: o **baú** (base a 14,5% da altura da pintura, largura de 14% da largura dela),
  o **casal** (altura de 23,45% da largura da pintura, pés a 17,5% da altura) e o **esquilo** (patas a 17,5%, largura de 6% da
  largura da pintura). A água (WebGL) usa a mesma âncora e a região do lago em coordenadas da **imagem**
  (`elipseDaImagemParaACaixa`).
- **Folhas** menores, medidas pela altura da janela (de 22 a 49 px num monitor de 1080 px); **pétalas** em maior número (em
  todos os aparelhos, um pouco; no computador, o dobro do ritmo e quase o dobro do limite); **esquilo** com pulos 70% do tamanho
  e 70% mais longos no ar (uns 210 px/s nos pulinhos e uns 550 px/s nas corridas, contra uns 500 e 1300 antes), que passa atrás
  do baú e dos arbustos, como no celular.
- **Maiores no desktop:** envelope (28% da largura, 300 a 540 px), carta (até 640 px, e 92% de uma janela estreita, em vez de
  42%) com o texto, os cartões e os enfeites na mesma proporção, cartões de fala da história (até 480 px, letra de 24 a 38 px).
- **Chão sob a carta:** em vez do verde chapado, uma faixa de gramado da própria pintura (um retalho ladrilhado em espelho,
  nítido; um reflexo desfocado foi tentado e o casal não o quis).
- **Prazo da confirmação:** 12 de dezembro de 2026 (era 31/12), em `config`, `content`, nos testes e nos espelhos de `docs/`;
  o fechamento passa a 13/12/2026.

## Conferido

Capturas no Chrome em 1920 × 1080, 1440 × 900, 2560 × 1080, 1600 × 500, 1280 × 600, 900 × 900 e 700 × 900: o baú, o casal e o
esquilo ficam no gramado, a carta se alarga nas janelas estreitas e o celular (375 × 812 e 812 × 375, com toque emulado) não
muda de arquivos nem de classes. 977 testes passam (novos: variante do computador em catálogo, carregamento, bosque, água,
esquilo, carta, história; âncora e elipse da imagem; `expandirCeuPalido`).

## Não conferido

A ondulação da água com GPU de verdade (o Chrome sem tela não a desenha como o do casal), a fluidez do esquilo e o paralaxe do
mouse (o Chrome sem tela atualiza o desenho aos solavancos), e qualquer aparelho real. As frases das ADR-0035 e a descrição de
SEO ainda esperam a aprovação do casal.

## Consequências

- `estado.computador` vale para o mouse em qualquer janela: quem testar o celular no computador precisa emular toque
  (`pointer: coarse`) para ver a cena do celular.
- Quem edita a CSS do desktop usa as classes `--computador` (`.cena--computador`, `.conteudo--computador`,
  `.casal__imagem--computador`, `.envelope--computador`, `.historia--computador`), sem condição de orientação.
