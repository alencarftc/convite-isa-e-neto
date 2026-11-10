# ADR-0040 · O convite é uma surpresa: metadados sem "casamento", prévia só com o selo, data em destaque

- **Status:** aceita em 2026-11-10 (os textos novos de SEO e de prévia ainda esperam a aprovação do casal)
- **Contexto:** o casal quer que o casamento seja a surpresa revelada depois de tocar no envelope. Mas o título, a descrição, a
  imagem e os dados estruturados do convite diziam "convite de casamento" e mostravam o baú com o selo por cima do cenário.
  Além disso, no desktop os nomes ficavam um sobre o outro e a data da carta era discreta demais para os convidados mais
  velhos, que procuram "quando será" antes de tudo.

## O que mudou

- **Metadados sem "casamento"** (`content.previa`, `scripts/vite/metadados.ts`): título "Isabella & David — Convite
  especial"; descrição "Uma carta foi escrita para você. Toque **no baú** para abrir."; descrição para buscadores "Um convite
  especial de Isabella Vaz e David Neto, para 22 de janeiro de 2027, às 17h, no Sítio Olinda…"; nome do evento "Convite
  especial de Isabella Vaz e David Neto"; texto alternativo da imagem sem cenário. Um teste barra qualquer ocorrência de
  "casamento" no HTML gerado e no JSON-LD. A data e o local continuam nos metadados (o casal só pediu para não dizer
  "casamento"); se também forem surpresa, basta tirá-los de `descricaoParaBusca` e dos dados estruturados.
- **Prévia só com o selo** (`og-image-v2.jpg`, 1200 × 630, 47 KB): o selo azul com as iniciais em dourado, centralizado
  sobre o marfim da carta, sem o baú nem o cenário. O arquivo tem sufixo `-v2` (RF-10.6) para o WhatsApp não reaproveitar a
  prévia antiga pelo endereço da imagem; `pnpm arte -- --so-previa` a gera de novo. O `og-image.jpg` saiu.
- **Carta mais larga no desktop** (janela de 900 px ou mais): 780 px (antes 640), com os cartões da mensagem na mesma largura;
  o nome da noiva fica à esquerda, o "&" dourado no meio e o nome do noivo à direita. Mais estreita, ou no celular, os nomes
  seguem empilhados.
- **Data e hora em destaque:** o dia numa linha e a hora na seguinte, bem maior; negrito, entre dois filetes dourados, num
  dourado mais escuro (`--cor-dourado-forte`, 4,1:1 sobre o marfim, contra 2,8:1 do dourado de decoração). O texto continua o
  de `content.carta.data`.
- **Verso do louvor em formato de citação:** `<blockquote>` com fundo dourado bem claro, filete à esquerda, aspas e itálico.

## Consequências

- Quem já recebeu a prévia antiga no WhatsApp ainda a vê; os envios novos usam a imagem nova. Se o link já foi colado em alguma
  conversa, use o depurador do Facebook para limpar o cache.
- `docs/requisitos.md` e os espelhos mudaram sem a fonte no Claude Docs, que precisa dos mesmos textos de prévia.
- Conferido no Chrome (1440 × 900 e 375 × 812): nomes lado a lado no desktop, empilhados no celular, sem rolagem lateral, data
  e hora em destaque nos dois, citação com o estilo novo. Não conferido: aparelhos reais e a prévia dentro do WhatsApp.
