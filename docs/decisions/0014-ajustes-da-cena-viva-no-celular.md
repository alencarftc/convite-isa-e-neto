# ADR-0014 · Ajustes depois do teste da cena viva no celular

- **Status:** aceita em 2026-10-31
- **Contexto:** o casal percorreu a branch `feat/cena-viva` no celular (a experiência principal) e listou os defeitos
  que o computador escondia: composição pobre na vertical, o selo partido ao meio, o envelope abrindo sozinho, o papel
  da carta à vista antes da hora e as fotos provisórias nos balões. A cena viva em si (água, folhas, pássaros e
  esquilo) foi aprovada; o casal sentado e o novo casal, não. Cada ajuste foi conferido em 375 × 812, 360 × 740, no
  celular deitado (812 × 375) e no computador (1366 × 768). Esta ADR registra o que mudou em relação às specs e às
  ADRs anteriores, e por quê.

## O que mudou

| #   | Pedido                                                         | Solução                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | O selo do casal não deve se partir ao meio                     | O selo fica inteiro: cede um pouco ao toque, cresce e inclina (`config.entrada.saida.solta`, `config.convite.seloSolta`), solta um clarão e esmaece. Saíram as duas metades, o recorte em `clip-path` e a espera `duracoes.esperaSelo`. `selo-rompivel.ts` virou `selo.ts` (`montarImagemDoSelo`, `soltarSelo`).                                                                                                   |
| 2   | Árvores sumindo, cortadas; faltavam detalhes no celular        | A moldura 9:16 é montada das duas janelas laterais da arte 16:9, esticadas, e esmaece só na base (`molduraVertical`, no `pnpm arte`). O primeiro plano vertical é um mosaico de rosas (`primeiroPlanoVertical`) em vez do recorte do meio. As duas peças vêm das mesmas artes originais; nenhuma imagem nova foi pedida.                                                                                           |
| 3   | O baú aparecia sobre a água; o céu aparecia no mar             | O lago vertical foi prolongado até a grama (`lagoVertical`, `04-lago-9x16.webp`, `--lago-altura` 46%, `--lago-base` 14%) e o baú desceu para 15% da altura, entre as flores. A região da onda acompanha a nova superfície (`agua.regiao.vertical`).                                                                                                                                                                |
| 4   | Imagem duplicada da grama no fim da tela                       | O espelho do primeiro plano (que aparecia como uma imagem repetida) foi trocado por um degradê de 12 × 48 px com as cores da borda de baixo da arte, ampliado pelo navegador (`chao`, `06-chao-*.webp`, 5 kB). Fica invisível até a cena subir.                                                                                                                                                                    |
| 5   | Casal: voltar aos personagens anteriores, sem animação         | O commit da SPEC-22 foi revertido e voltou a imagem 17 (casal de costas, em pé). Para ele pisar na grama florida acima da carta, a cena sobe 28% da tela (`cenaSobeFracao`, era 22%) e os pés ficam a 13% da base da cena (`--casal-base`).                                                                                                                                                                        |
| 6   | Sem a sombra ao redor do baú; aura amarela menor               | Ficam só a aura radiante (`config.bau.aura`, opacidade de 0,5 a 0,85, antes até 1) e o realce ao passar o mouse. Saíram os pontos de luz (`brilhantes`) e o anel de pulso (`onda`).                                                                                                                                                                                                                                |
| 7   | Sem as fotos provisórias; balões em 5 s                        | `foto`, `alt` e `foco` dos cinco balões estão vazios e a frase vive dentro da nuvem (`balao--sem-foto`). Os balões saem em cascata, um a cada 0,55 s, e a história dura cerca de 4,9 s (antes 15 s), em alturas e lados diferentes (`config.historia.alturas`, `desvios`). O `pnpm verificar` ganhou a regra `foto-pendente`: com foto vazia ele continua falhando, para as fotos reais não serem esquecidas.      |
| 8   | Envelope sem contorno, sem abrir sozinho, papel só ao abrir    | O contorno de foco saiu (o selo brilha no lugar). O convite espera o toque no selo (`esperaSelo` removida; fase `aguardando-selo` até o toque, que já existia). A carta dobrada fica invisível até a aba abrir (`dobrada` com opacidade 0 até `cartaSobeEm`).                                                                                                                                                      |
| 9   | Mostrar o fundo do papel, não um retângulo liso atrás do texto | O miolo da carta deixou de ser o creme liso (`--cor-papel`). `pnpm arte` gera `14-papel-miolo.webp` (43 kB): a faixa do meio do papel mais o próprio espelho, que emenda em cima e embaixo; a CSS o repete na vertical atrás do texto (`.carta__miolo`). A textura, as bordas e o filete dourado seguem da primeira à última linha. `config.carta.papel.margem` saiu e a faixa passou de 0,46–0,54 para 0,43–0,56. |
| 10  | Quebra de linha no "&" dos nomes                               | Entrada e carta mostram "Isabella", "&" e "David" em três linhas: o "&" ganha o próprio elemento (`entrada__e`, `carta__e`) em bloco. O texto continua "Isabella & David", então o nome acessível e os testes de conteúdo não mudam. O `index.html` traz a mesma marcação do primeiro quadro.                                                                                                                      |
| 11  | Refinar o celular: inconsistências, fluidez, transições        | Um conjunto das mudanças acima já cuida disso (chão sem emenda, cena que sobe mais, balões em cascata). Os testes de tempo da história passaram a usar o relógio manual do GSAP (a história inteira cabe em 0,15 s nos testes), o que acabou com um teste que dependia da velocidade da máquina.                                                                                                                   |

## Computador e celular deitado

A cena sobe a mesma fração nas duas orientações. No computador o casal pisa na grama da margem, sem folga, e a faixa
`.convite__chao` aparece ao lado da carta, mais larga que antes: é um degradê liso verde-oliva. No celular deitado o
balão é menor (`--largura` 170 px) e a frase cabe na nuvem.

## Consequências

- Os espelhos das SPEC-04, 05, 06 e 14 em `docs/` (e os dois Claude Docs) seguem descrevendo o comportamento antigo; a
  fonte da verdade precisa ser atualizada por quem mantém os documentos. Vale esta ADR até lá. A ADR-0007 (envelope
  e carta em duas etapas) continua como registro: a espera automática pelo selo que ela cita foi removida.
- A SPEC-22 (casal sentado e vivo) está **revertida**: a imagem 19, a respiração, o vento e o halo não existem mais
  nesta branch; o motor WebGL ficou só com a água. As opções `elipse` e `cobrirTudo` dele não têm mais uso e podem sair
  se o orçamento de 8 kB do épico apertar de novo.
- `pnpm verificar` falha por: as cinco fotos dos balões (`foto-pendente`), os textos de pausa entre colchetes, o verso
  do louvor, a arte provisória das folhas e do esquilo e a URL publicada.
- O ladrilho do papel (`papelMiolo`, 60 kB de limite) entrou no grupo da carta do carregamento; o `chao` (5 kB), o
  `04-lago-9x16.webp` e o `06-primeiro-plano-9x16.webp` também. O orçamento por arquivo está em
  `scripts/verificar/orcamento.ts`.

## Fora do escopo (continua pendente)

Fotos reais dos balões e suas descrições, MP3, verso do louvor, imagens definitivas das folhas e do esquilo, testes em
aparelhos reais (acrescentados à [matriz](../operacao/matriz-de-testes.md)).
