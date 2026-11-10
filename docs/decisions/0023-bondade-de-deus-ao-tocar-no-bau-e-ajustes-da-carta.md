# ADR-0023 · "Bondade de Deus" ao tocar no baú e ajustes da carta

- **Status:** aceita em 2026-11-02
- **Contexto:** o casal mandou a música da história ("Bondade de Deus", o cover de violino de `Goodness of God - Bethel Music`) e
  uma lista de ajustes: a música deve tocar quando o baú é tocado, começando baixa e seguindo; o selo não estava centrado
  na vertical; ao tocar no selo o papel da carta parecia abrir por trás do envelope antes de ele descer; o casal um pouco
  maior; o esquilo passava por baixo do casal, cortado; o "&" e a data com a hora em dourado; mais espaço em volta do "&".

## Música

| Peça                        | Mudança                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/audio/musica-1.mp3` | A música inteira (4 min 7 s), estéreo, 96 kbps (o LAME reamostra para 32 kHz), **2,9 MB**. Foi aparada do silêncio digital do fim, ganhou 1,5 s de esmaecimento final e foi levada a RMS de −21 dBFS (pico de −3,7 dBFS; o original passava de 0 dBFS). O limite de `audio/musica-1.mp3` em `orcamento.ts` subiu de 1,1 MB para 3,1 MB: a spec previa um trecho de 25 s, e agora ela toca inteira. Toca por streaming (`html5`), fora do carregamento crítico. |
| Evento `bau:tocado`         | A cena do baú o emite no primeiro instante da abertura (toque no baú ou na chave guardada). `conectarAudio` liga a música 1 a ele, em vez de `historia:inicio`: a música começa quando o convidado toca no baú.                                                                                                                                                                                                                                                |
| Entrada                     | Sobe de 0 a 0,6 em **6 s** (`transicoesDeAudio.entradaDaMusica1`), enquanto o ambiente baixa a 0,15 em 2 s.                                                                                                                                                                                                                                                                                                                                                    |
| Continua tocando            | A música 1 só sai de cena quando a música 2 ("Ousado Amor") toma o lugar. Enquanto o `musica-2.mp3` não existir (o `onloaderror` marca a falha), `musica2()` não derruba a música 1, e quem pula a história ouve a 1. Se a 1 acaba sozinha, o ambiente volta ao volume normal e ela não é retomada ao voltar do segundo plano.                                                                                                                                 |
| **Defeito achado**          | A subida de volume nunca acontecia: no elemento `<audio>` o Howler trava o `play` até o navegador deixar tocar, e um `fade` pedido logo depois fica preso na fila para sempre. A música tocaria em volume 0. Agora a subida é pedida no evento `play` (`once('play', …)`), e o teste do adaptador cobre a ordem (nada de `fade` antes do `play`). Conferido no navegador: 0 → 0,6 em 6 s.                                                                      |

## Carta e envelope

| Pedido                             | Solução                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Selo centrado na vertical          | O centro do selo passou de 60% para **51%** da altura do envelope, o centro do corpo dele na arte (o papel vai de 14% a 88% da altura da imagem; `top: 33%`). Medido no navegador: centro em 0,50 de largura e 0,51 de altura.                                                                                                                                                                                                                                     |
| Papel abrindo por trás do envelope | A carta dobrada (`envelope__dobrada`) saiu: o papel não sobe mais pela abertura. A aba abre, o envelope desce e a carta se desdobra na cena. O tempo que ela ocupava (0,7 s) saiu da abertura: `envelopeDesceEm` e `cenaSobeEm` 1,7 → 1,0 s, `casalEm` 2 → 1,3 s, `desdobraEm` 2,2 → 1,5 s, `blocosEm` 3,4 → 2,7 s e `petalasEm` 4,4 → 3,7 s. A duração total (7 s) não mudou.                                                                                     |
| "&" e data em dourado              | O título virou um contêiner (`h2.carta__nomes`) com três blocos: nome, "&" e nome. O "&" (`--cor-dourado`) e a data com a hora (`.carta__data`) ficam fora da mistura por diferença da [ADR-0016](./0016-tinta-da-carta-contra-o-escurecimento-forcado.md), que os viraria azuis; a mistura só vale no elemento que leva a opacidade da revelação, por isso o "&" precisou ser um bloco. A carta tem agora 16 blocos, e a leitura do título leva uns 1,1 s a mais. |
| Mais espaço em volta do "&"        | `margin-block: 0.3em` no "&" (uns 13 px em cima e embaixo com a fonte de 44 px).                                                                                                                                                                                                                                                                                                                                                                                   |

O dourado (`#b18e4a`) tem 2,6:1 de contraste sobre o papel: é o que o casal pediu e passa de decoração a texto na data, uma
exceção à regra "dourado só em decoração" (o `tokens.test.ts` guarda os números). Conferido no Chrome com o escurecimento forçado
ligado e **sem** o aviso de tema (o caso do aparelho do casal): os botões escurecem, a carta continua legível e o "&" e a data
seguem dourados (um pouco mais escuros). Para a data ficar mais legível, o caminho é um dourado mais escuro, que o escurecimento
forçado passaria a inverter: por isso não foi feito.

## Casal e esquilo

- O casal passa de 37% para **40%** da altura da cena na vertical e de 43% para **46%** na horizontal (pés no mesmo lugar). No
  celular de 375 × 812: de 122 px a 447 px, com a carta começando em 471 px.
- No retrato o esquilo vive no espaço de trás do baú (`--z-vida-fundo`, 25), e o casal estava acima dele (`--z-primeiro-plano`,
  40): o esquilo aparecia cortado ao passar atrás. O casal desce para `--z-casal-vertical` (24), abaixo do esquilo e acima das
  árvores; o esquilo continua atrás do baú e dos arbustos do primeiro plano. Na horizontal o esquilo já ficava sobre o casal.

## Consequências

- Faltam três áudios para o `pnpm verificar` deixar de acusar arquivo ausente: `fechadura.mp3`, `selo.mp3` e `musica-2.mp3`.
- A origem e a licença do cover (e da canção) precisam constar na lista de [lançamento](../operacao/lancamento.md): o convite o
  publica. O **verso do louvor** da mensagem do casal continua pendente (`content.mensagem.versoLouvor`), agora que a música é
  conhecida.
- O espelho da SPEC-06 descreve a carta dobrada subindo pelo envelope e a SPEC-08, a música 1 entrando na história; ambos ficam
  como estão, e este registro vale.
- Não ouvi a música em aparelho real: o nível (−21 dBFS antes de 0,6 de volume) e o corte do MP3 a 32 kHz valem ser conferidos no
  celular. Se ficar alto ou baixo, é só mudar `volumes.musica` ou refazer o arquivo com outro RMS-alvo.
