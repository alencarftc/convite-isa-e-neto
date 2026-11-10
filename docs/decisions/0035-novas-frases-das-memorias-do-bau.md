# ADR-0035 · Novas frases das memórias do baú

- **Status:** aceita em 2026-11-09 (frases escolhidas por quem conduz o projeto; falta o OK do casal, que aprovou as anteriores em
  25/10/2026)
- **Contexto:** pediram opções melhores para a sequência de frases que sobem do baú ([ADR-0026](./0026-memorias-em-luz-no-lugar-dos-baloes.md))
  e que a Salinas e a beira-mar não fossem mencionadas. Foram propostas variações para cada posição; estas foram as escolhidas.

## A sequência

| #   | Frase nova                                  | Antes                                    |
| --- | ------------------------------------------- | ---------------------------------------- |
| 1   | Tudo começou de um jeito simples.           | (igual)                                  |
| 2   | Deus foi cuidando de cada detalhe.          | Viramos amigos, parceiros e um só time.  |
| 3   | Aos poucos, a amizade virou amor.           | Entre risadas e orações, o amor cresceu. |
| 4   | E o que era sonho virou promessa.           | Em Salinas, à beira-mar, veio o pedido.  |
| 5   | E queremos celebrar essa promessa com você. | E o nosso sonho ganhou um sim.           |

A ordem vai do começo simples (1) à fé e à gratidão (2), ao amor que cresce (3), ao sonho que a noiva citou no briefing (4) e ao
convite ao convidado (5), que passa para a carta. Nenhuma frase cita lugar nem um fato específico da história; todas têm até
8 palavras e o mesmo tamanho de cartão, e a mais longa (a 5) cabe em duas linhas a 375 px.

## O que mudou

- `content.baloes[].frase` (`src/config/content.ts`): as frases de 2 a 5.
- `docs/requisitos.md`, seção "Balões da história": a lista aprovada foi trocada pela nova, com a versão anterior anotada. É o
  espelho que o teste `conteudo-e-requisitos` confere contra o `content.ts`.
- Nada mais mudou: a contagem de cinco frases (uma por estrela e por memória) e o tempo de 5 s por memória seguem os mesmos.

## O que não foi feito

- O Claude Docs de requisitos (a fonte da verdade, citada em `docs/README.md`) **não foi editado**: é um documento compartilhado e a
  mudança só vale depois do OK do casal. Até lá, o espelho do repositório e a fonte divergem, e vale a fonte.
- O espelho `docs/specs/SPEC-05-historia-em-baloes.md` continua com o exemplo antigo (com a Salinas): ele descreve o desenho dos
  balões, que a ADR-0026 já substituiu, e não é lido por nenhum teste.

## Consequências

- Conferido no Chrome (375 × 812): as cinco frases aparecem no cartão, na ordem acima, sem cortar texto.
- Nenhuma frase ecoa a Salinas; o pedido deixa de ser contado na história. A foto do pedido na praia, que era a primeira do
  carrossel, também saiu com a troca das fotos ([ADR-0033](./0033-carrossel-com-as-fotos-do-ensaio.md)).
