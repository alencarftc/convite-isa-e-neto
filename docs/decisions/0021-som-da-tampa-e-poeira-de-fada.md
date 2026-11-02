# ADR-0021 · Som da tampa e poeira de fada em loop enquanto o baú está em cena

- **Status:** aceita em 2026-11-01
- **Contexto:** depois do ambiente ([ADR-0020](./0020-folhas-esquilo-definitivos-e-audio-de-ambiente.md)) o casal mandou mais
  dois sons: `treasure-chest-open.mp3` (1,35 s, 48 kHz, estéreo, 23 kB) e `fairy-effect.wav` (5,5 s, 44,1 kHz, 24 bits,
  estéreo), este para tocar **com o baú aberto**, como poeira de fada que anuncia as coisas preciosas que vão sair dele. Pediram
  depois que a poeira de fada **toque em loop até a cena do baú acabar** e que o volume fique **bem mais baixo**, quase
  imperceptível. Pediram também que o som da floresta fosse trocado pelo WAV `autumn_leaves_forest_moderate_wind.wav`; o arquivo
  enviado gera um MP3 **idêntico, byte a byte,** ao `ambiente.mp3` que já está no convite (mesmos 19,46 s e mesmo nível), então não
  houve troca.

## O que mudou

| Peça                     | Mudança                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/audio/tampa.mp3` | É o `treasure-chest-open.mp3` (o único som de baú abrindo; a SPEC-08 chama o arquivo de `tampa`). Se o casal quiser que ele seja a **fechadura** (a chave girando), é só trocar o nome do arquivo.                                                                                                                                                                                    |
| `public/audio/fada.mp3`  | É um **loop de 2,65 s** feito do trecho estável do `fairy-effect.wav` (de 0,25 s a 3,5 s), com o fim misturado ao começo por um fundido de 0,6 s (potência constante), estéreo, 128 kbps, 42 kB. Só o trecho do meio serve: o começo é um crescendo e o fim, uma cauda que morre, e os dois pulsariam a cada volta.                                                                   |
| Evento `bau:aberto`      | A cena do baú o emite quando a tampa termina de abrir (`instanteDaTampa + duracaoDaTampa`, 1,3 s da abertura, com a luz subindo), logo depois de `bau:abriu` (início da tampa, que dispara o som dela). O `skip()` não o emite: quem pula não ouve nada do baú.                                                                                                                       |
| Porta de áudio           | `iniciarFada()` e `encerrarFada()` (a fada deixou de ser um efeito de uma só vez). `conectarAudio` liga a primeira a `bau:aberto` e a segunda a `historia:fim`, que é quando o envelope aparece e o baú sai de cena ([ADR-0022](./0022-casal-maior-esquilo-menor-e-bau-que-some-com-o-envelope.md)); `convite:pulado` também a encerra. O modo de segurança a para junto com o resto. |
| Adaptador do Howler      | Sétimo arquivo (`ARQUIVOS_DE_AUDIO`, que o `pnpm verificar` confere). `loop: true`, começa em volume 0 e sobe a `volumes.fada` em 1,5 s; ao encerrar, desce a 0 em 1,5 s e só então para (`onfade`). Respeita o mudo geral, como o ambiente.                                                                                                                                          |
| `volumes.fada`           | **0,2** (os efeitos pontuais ficam em 0,8): com o arquivo a −22 dBFS de RMS, a poeira fica em torno de −36 dBFS, abaixo do ambiente (−32 dBFS) e bem abaixo da música; dá para sentir o brilho sem notar um som. Para ficar ainda mais discreta, é só baixar esse número.                                                                                                             |

## Como os arquivos foram preparados

Um script de Node fora do repositório (com `lamejs` e `mpg123-decoder`, nada entra no `package.json`): tira o silêncio das pontas
(janelas de 20 ms abaixo de −60 dBFS), faz um fundido de 3 ms na entrada e de 80 ms na saída, leva a **parte ativa** (janelas de 250
ms a até 8 dB da mais forte) a **RMS de −22 dBFS**, com o mesmo limitador suave do ambiente, e codifica em MP3 estéreo de 128 kbps
com o quadro `Info`. Os efeitos ficam, assim, no mesmo nível entre si, como pede a SPEC-08 ("normalizados entre si"):
`tampa.mp3` com pico de −7,3 dBFS (22,1 kB, limite de 25 kB). Para a fada, o modo de loop recorta o trecho estável, faz o fundido
e não apara nem esmaece as pontas; o limite de peso de `fada.mp3` ficou em 60 kB.

## Conferido

- Testes: `bau:aberto` sai depois de `bau:abriu` e não sai no `skip`; `conectarAudio` toca `['fechadura', 'tampa', 'selo']` e liga e
  encerra a fada nos eventos certos; o adaptador cria sete sons, e a fada começa em 0, sobe a 0,2 em 1,5 s, só a primeira chamada
  vale, esmaece e para ao encerrar, e o modo de segurança a para.
- No navegador: o Howler carrega `tampa.mp3` (1,37 s) e a fada; o loop decodificado tem o mesmo nível nas duas pontas (−23 dBFS no
  começo e no fim, janelas de 100 ms entre −25 e −19 dBFS, sem queda na emenda). **Ninguém ouviu** o resultado num aparelho: o nível
  e o corte em 16 kHz do MP3 valem ser ouvidos no celular antes do envio.
- O loop é curto (2,65 s): num fone atento pode dar para notar a repetição. O fundido de 0,6 s e o volume baixo a escondem. Se
  incomodar, a solução é pedir ao casal uma poeira de fada mais longa (uns 10 s) e refazer o arquivo, sem mexer em código.

## Consequências

- Faltam só quatro áudios para o `pnpm verificar` deixar de acusar arquivo ausente: `fechadura.mp3`, `selo.mp3`, `musica-1.mp3` e
  `musica-2.mp3`. No servidor de desenvolvimento o Vite responde a eles com a página, o decodificador recusa e o convite segue
  sem som nesses pontos (ADR-0005).
- O espelho da SPEC-08 e o Claude Docs descrevem três efeitos (chave, tampa, selo); a poeira de fada em loop é uma camada nova,
  registrada aqui.
- A origem e a licença do `fairy-effect.wav` e do `treasure-chest-open.mp3` precisam constar na lista de
  [lançamento](../operacao/lancamento.md), como a do ambiente.
