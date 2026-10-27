# ADR-0011 · Cena viva em código, com WebGL próprio para a água e o vento

- **Status:** aceita para teste em 2026-10-27, só na branch `feat/cena-viva` (épico 13,
  [specs da cena viva](../specs-cena-viva/README.md)). Se o teste for recusado, esta ADR fica como "rejeitada" e nada
  dela chega à `main`.
- **Contexto:** o casal de costas (imagem 17), montado sobre as camadas, pareceu colado na cena, e o Felipe pediu
  movimento no bosque: água, folhas, pássaros, um esquilo e o casal, "algo bem simples, mas com motion". O convite abre
  pelo WhatsApp, em aparelhos de todo tipo (ADR-0009), com orçamento de 120 kB de JavaScript (hoje 56 kB) e a regra de
  animar só `transform` e `opacity` (RNF-03.1).

## Opções consideradas

1. **Vídeo em loop gerado por IA** a partir da imagem final (cinemagraph). Movimento rico com pouco código, mas alguns
   MB de vídeo, emenda visível no loop, deformação do casal, nenhum controle sobre quando cada coisa acontece e perda
   da profundidade por camadas.
2. **Biblioteca de renderização** (PixiJS ou similar) para tudo. Resolve água, partículas e malhas, mas acrescenta
   dezenas de kB comprimidos e uma segunda forma de desenhar a cena.
3. **DOM + GSAP para o que é objeto (folhas, pássaros, esquilo, respiração) e um WebGL mínimo, escrito à mão, só para
   o que é distorção de imagem (água e vento no casal).**

## Decisão

Opção 3.

- **Folhas, pássaros, esquilo, respiração e brilho** são elementos do DOM animados pelo GSAP, só com `transform` e
  `opacity`, como o resto do convite. Pássaros são SVG desenhado no código (sem imagem).
- **Água e vento** usam um motor de ondulação próprio (`presentation/vida/ondulacao/`): um canvas WebGL 1 por
  superfície, uma passada de desenho, um shader de fragmento curto. É a única exceção ao RNF-03.1: o canvas não anima
  propriedades CSS, ele desenha; e a imagem original fica embaixo, de modo que qualquer falha (sem WebGL, contexto
  perdido) volta ao convite de hoje, parado.
- **Tudo no relógio do GSAP** (tweens, `delayedCall`, `gsap.ticker`): a aba em segundo plano pausa de graça e os testes
  controlam o tempo com `vi.useFakeTimers()`.
- **A vida não é uma etapa do orquestrador.** É um componente que ouve o barramento (como o áudio): não muda o contrato
  `Cena`, os tempos da abertura nem o modo de segurança. Erro dentro da vida é avisado e a vida para; o convite segue.
- **Níveis** (`completo`, `leve`, `desligado`) escolhidos no início pelo aparelho e pela animação reduzida, e rebaixados
  uma vez se os quadros medidos nos primeiros 2 s forem lentos. Nunca sobem.
- **Aleatoriedade nos planejadores do domínio**, com o sorteio injetado, para testar as regras (limites, caminho do
  esquilo que não cruza o baú) sem DOM.

## Consequências

- Até 8 kB gzip a mais de JavaScript, sem dependência nova.
- O GLSL não é testado pelo Vitest (o happy-dom não tem WebGL): os testes cobrem a matemática no domínio e o ciclo de
  vida com um contexto falso; o desenho é conferido no navegador.
- O casal muda de pose (imagem 19, sentado). A imagem 17 continua aprovada e em uso na `main`.
- A WCAG 2.2.2 (pausar movimento automático longo) fica atendida por "reduzir movimento" do aparelho e, se o texto for
  aprovado, pelo botão "Pausar animação" (US-13.6).
