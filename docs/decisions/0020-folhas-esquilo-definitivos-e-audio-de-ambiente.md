# ADR-0020 · Folhas e esquilo definitivos e o áudio de ambiente

- **Status:** aceita em 2026-11-01
- **Contexto:** o casal mandou as imagens definitivas das folhas e do esquilo (a [ADR-0019](./0019-arbustos-a-frente-do-bau-e-casal-maior.md)
  deixou os prompts e as etapas do `pnpm arte` prontos) e o primeiro som: o ambiente do bosque
  (`autumn_leaves_forest_moderate_wind.wav`, 19,5 s, 48 kHz, estéreo, 24 bits).

## Folhas e esquilo

As imagens vieram como **duas folhas de 2000 × 667 px** sobre fundo cinza liso, não como cinco arquivos: as três folhas
lado a lado e as duas poses do esquilo. Em vez de pedir os cortes ao casal, o `pnpm arte` as reparte
(`repartirCenaViva`, em `scripts/arte/otimizar-arte.ts`):

1. tira o fundo liso (tolerância 14), descontamina a borda e suaviza o alfa, como nas outras imagens;
2. acha cada objeto pelos pedaços opacos ligados com mais de 20 000 px² (`caixasDosObjetos`, em `scripts/arte/pixels.ts`,
   ordenados da esquerda para a direita) e confere que são 3 folhas e 2 poses, senão para e diz quantos achou;
3. grava `20-folha-a/b/c.png` e `21-esquilo-encolhido/esticado.png` em `arte/originais/`, e as duas poses ganham o **mesmo
   quadro** (centradas, base na mesma linha, 24 px de margem): a troca de pose no pulo não pode dar um salto.

Depois disso o fluxo é o de antes (`objetos([...], { limpar: true })`): folhas em 256 px de largura e esquilo em 384 px,
cada um no limite de peso (as cinco imagens pesam de 13 a 18 kB). Entram em `config.imagens` como
`assets/objects/20-folha-*.webp` e `21-esquilo-*.webp`.

**Tamanhos.** A imagem do esquilo é o quadro das duas poses (384 × 198), e o esquilo sentado ocupa metade dele: por isso
`vida.esquilo.largura` passou de `{ vertical: 0.11, horizontal: 0.03 }` (largura do SVG provisório) para
`{ vertical: 0.2, horizontal: 0.05 }`, o que dá o mesmo esquilo de antes (cerca de 38 px de largura em 375 px) e fica por
baixo do que o casal pediu ("menor"). As folhas passaram de `0,014–0,024` e `0,026–0,036` da tela para `0,03–0,05`
(fundo) e `0,05–0,07` (frente): a arte nova tem a folha inteira na imagem, sem a margem vazia do SVG, e as de fundo ficam
com 11 a 19 px de largura em 375 px e as da frente com 19 a 26 px.

**Arte provisória removida.** `scripts/arte-provisoria-vida.ts` e os cinco SVG de `public/assets/provisorio/` saíram (as
fotos dos balões, `foto-1..5.svg`, ficam, porque as fotos reais ainda não chegaram). O `pnpm verificar` deixou de acusar
as folhas e o esquilo: restam só `foto-pendente`, os textos entre colchetes e os cinco áudios que faltam.

## Áudio de ambiente

O `ambiente.mp3` é o WAV do casal preparado para **repetir sem emenda**, porque a SPEC-08 o toca em `loop`:

- **Emenda:** o fim se mistura ao começo com um fundido de potência constante (seno e cosseno) de 2 s, e o arquivo vira a
  parte "sem o começo": 17,46 s, que terminam onde começam.
- **Nível:** a gravação é muito baixa (pico de −14 dBFS, RMS de −40,9 dBFS). Ela foi levada a **RMS de −23 dBFS** (ganho de
  17,9 dB), com um limitador suave (`0,5 + 0,44·tanh((|x| − 0,5) / 0,44)`) que só age em 0,003% das amostras, os picos
  das folhas. O volume de escuta continua em `config.volumes` (ambiente 0,35; 0,15 sob a música).
- **Codificação:** MP3 de 96 kbps estéreo (205 kB, abaixo dos 400 kB do orçamento de `audio/ambiente.mp3`). O LAME
  reamostra para 32 kHz nessa taxa; para um vento e folhas a 0,35 de volume no celular isso não se ouve, e mais bits
  só pesariam. O arquivo leva o quadro de informação (`Info` do LAME) com o atraso e o enchimento do codificador: sem ele,
  cada volta do loop teria uns 25 ms de silêncio. Conferido no Chrome por `decodeAudioData`: 838 150 amostras a 48 kHz
  (esperadas 837 974) e sem silêncio nas pontas (−21 dBFS no começo, −24 dBFS no fim).
- **Como foi feito:** não há `ffmpeg`, `lame` nem Python na máquina, então a conversão foi um script de Node com `lamejs`
  numa pasta fora do repositório; nada disso entra no `package.json`. Para refazer com outro WAV, o procedimento é este
  (WAV de 24 bits, fundido de 2 s, RMS-alvo, limitador, `lamejs` a 96 kbps, quadro `Info`); se o ambiente mudar, faça de
  novo e confira o `decodeAudioData` como acima.

O Howler já carregava `audio/ambiente.mp3` (ADR-0005); no servidor de desenvolvimento a requisição agora volta com o MP3
(`audio/mpeg`). Os outros cinco (`fechadura`, `tampa`, `selo`, `musica-1`, `musica-2`) continuam ausentes; no dev o Vite
responde a eles com a página, o decodificador recusa, e o modo de áudio degrada para mudo sem quebrar o convite
(ADR-0005).

## Consequências

- `pnpm verificar` continua falhando de propósito: faltam as fotos dos balões, o verso do louvor, os textos pendentes e os
  cinco áudios. A arte da cena viva deixou de ser pendência.
- A **origem e a licença** do WAV precisam constar no registro de conteúdo do casal (lista de [lançamento](../operacao/lancamento.md)):
  o convite o publica.
- Nada foi ouvido em aparelho real: o nível (−23 dBFS) e o corte de 32 kHz valem ser ouvidos num celular de verdade antes
  do envio; ajustar é só trocar o RMS-alvo e refazer o arquivo, sem mexer em código.
