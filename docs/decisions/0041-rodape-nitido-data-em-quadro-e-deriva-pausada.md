# ADR-0041 · Rodapé nítido, data em quadro de calendário e deriva da cena pausada com o convite aberto

- **Status:** aceita em 2026-11-10
- **Contexto:** depois de abrir o convite, o casal reportou (1) o rodapé fosco/borrado, (2) a data e a hora ainda sem destaque
  suficiente e (3) a tela, os botões e o resto piscando quando o app fica parado um tempo, a partir do meio do convite.

## O que mudou

- **Rodapé nítido:** nas telas de toque o chão sob a carta era uma imagem de 12 × 48 px esticada pelo navegador, um borrão.
  Agora é uma faixa de gramado de verdade (`06-chao-celular.webp`, 1000 × 900, 168 KB), um retalho do gramado limpo da pintura
  vertical ladrilhado em espelho, igual ao do computador (ADR-0036). Uma só marcação (`.convite__chao-faixa` com
  `.convite__chao-trecho`) serve às duas; `--chao-largura` escolhe a escala (a da pintura vertical no celular, `--mestre-largura`
  no computador). Saíram `06-chao-9x16.webp`, `06-chao-16x9.webp` e o gerador do chão minúsculo; `pnpm arte -- --so-chao`
  gera as duas faixas.
- **Data e hora em quadro de calendário:** o dia da semana, o número do dia bem grande (`22`), o mês e o ano e, numa etiqueta
  dourada, a hora (`17H`), em fundo dourado claro com borda dourada e algarismos alinhados (`lining-nums`: a Cormorant usa
  números "antigos", em que o 1 parece um "I"). O texto segue o de `content.carta.data`; um formato diferente cai no texto
  simples.
- **Piscar com o app parado:** a causa provável é a deriva das camadas da cena no celular, um tween infinito (`yoyo`, `repeat: -1`)
  em camadas enormes com `will-change: transform` que só parava pelo botão "Pausar animação". Com o convite aberto a carta cobre
  a cena, e a deriva seguia a 60 quadros por segundo por trás da carta (que mistura o texto por diferença, ADR-0016), esquentando o
  aparelho. Agora ela também para nas fases `aguardando-selo`, `convite` e `informacoes`.

## Não verificado

O piscar depende de GPU e de tempo parado: o Chrome sem tela não o reproduz. A correção ataca a causa que o código mostra e tem
teste (a deriva fica pausada com o convite aberto), mas só um aparelho real confirma. Se persistir, os próximos suspeitos são o
`mix-blend-mode: difference` dos blocos da carta, os `will-change` permanentes (carrossel e vida) e o desfoque do carrossel.
