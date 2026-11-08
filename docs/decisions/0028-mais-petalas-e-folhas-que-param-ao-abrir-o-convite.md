# ADR-0028 · Mais pétalas e folhas que param ao abrir o convite

- **Status:** aceita em 2026-11-08
- **Contexto:** depois da [ADR-0027](./0027-carrossel-dica-do-bau-role-para-ler-e-petalas-infinitas.md), o casal pediu um pouco mais de
  pétalas caindo e que as folhas verdes parem de cair quando o convite abre.

## O que mudou

| Pedido                       | Solução                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Um pouco mais de pétalas     | `petalasDoConvite.intervalo` de 1,4–3,2 s para **1–2,2 s** entre uma pétala e a seguinte, e o teto de pétalas no ar de 9 para **12** (de 5 para 6 em aparelho modesto). Na prática, de umas 6 para umas 9 na tela ao mesmo tempo. Medido no Chrome: 9 pétalas no ar 14 s depois de abrir. O resto não mudou: uma de cada vez, devagar, pequenas e em posições variadas.                                                                          |
| Folhas verdes param ao abrir | `criarFolhas` ouve o estado: quando a fase passa a `convite` (o convidado tocou no selo) ou `informacoes` (pulou), **nenhuma folha nova nasce** e as que estão no ar **esmaecem e saem em 1,2 s** (`vida.folhas.esmaecerAoAbrir`). Quem pula direto ao convite não vê folha nenhuma. Antes da abertura elas seguem caindo como sempre. Conferido no Chrome: 4 folhas no bosque antes, 0 aos 3 s depois de abrir e 0 até o fim da medição (30 s). |

Os pássaros e o esquilo continuam como estavam (ADR-0018): o pedido foi só pelas folhas verdes.

## Consequências

- Com as folhas fora e as pétalas dentro, o convite aberto tem uma queda só, a das pétalas azuis.
- Mais pétalas passam por cima do texto da carta; `petalasDoConvite.opacidade`, `largura` e `maximo` ajustam, se atrapalhar a leitura.
- Visto só no celular em pé e emulado.
