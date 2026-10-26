# ADR-0005 · Áudio como porta, com Howler.js na infraestrutura

- **Status:** aceita em 2026-10-26 (Howler.js continua _proposta_ até o aceite do casal, SPEC-08)
- **Contexto:** a SPEC-08 mostra um módulo `audio.js` que lê `state`, `config` e `events` e fala
  direto com o Howler. Em clean architecture, as regras de quando cada som toca não podem depender
  da biblioteca, e um arquivo de som que falha nunca pode derrubar o convite (RF-08.8).

## Decisão

1. **`AudioPort`** (`application/ports/audio.ts`) descreve o que o convite pede ao som:
   `desbloquear`, `efeito`, `musica1`, `musica2`, `ligar`, `pausar`, `retomar` e `parar`.
2. **`conectarAudio`** (`application/use-cases/audio-do-convite.ts`) liga os eventos do barramento
   à porta, seguindo a tabela "Comportamento" da spec. Cada comando é protegido por `try/catch`:
   erro de som vira aviso (`console.warn`) e **nunca sobe a quem emitiu o evento**, para não
   acionar o modo de segurança (ADR-0004) por causa de um MP3.
3. **O adaptador** (`infrastructure/audio/audio-howler.ts`) recebe `{ Howl, Howler }` por parâmetro;
   quem importa o `howler` é só `main.ts`. Os testes usam um `Howl` falso e conferem volumes,
   esmaecimentos e a fila de comandos, sem navegador. Ambiente e efeitos usam Web Audio; as músicas
   usam `html5: true`. Nada é criado, e portanto nada baixa, antes de `desbloquear` (RNF-08.3).
4. **Tempos de transição viram configuração** (`config.transicoesDeAudio`: 2 s, 2 s, 2 s, 3 s),
   porque a regra do projeto é nenhum tempo solto no código (RNF-01.2). É uma extensão do formato de
   `config` da SPEC-01.
5. **Som ligado/desligado é estado:** `estado.definirSom` grava `convite:som` (RF-08.6). O botão só
   emite `som:alterado`; o caso de uso atualiza o estado e silencia o áudio. Desligar o som **não**
   pausa as músicas: elas seguem mudas, em sincronia, como a spec manda.
6. **Pular ou animação reduzida** chegam à música 2 por `entrada:tocou` (escolha `pular` ou
   `estado.reduzido`); o orquestrador não conhece o áudio. O áudio é liberado no gesto porque quem
   emite `entrada:tocou` é o próprio manipulador do toque (SPEC-02).
7. **Sair e voltar** (`visibilitychange`, `pagehide`, `pageshow`) são ouvidos por um adaptador
   próprio (`ouvirSaidaEVolta`); `pausar` e `retomar` aceitam repetição.
8. **`navigator.audioSession.type = 'playback'`** é ajustado quando existe (Safari recente), para o
   som sair com o botão de modo silencioso do iPhone ligado; o resultado no navegador do WhatsApp
   precisa ser medido num aparelho real (CT-08.6).

## Consequências

- Trocar o Howler por outra biblioteca é trocar um arquivo e uma linha de `main.ts`.
- Os seis arquivos de áudio (`public/audio/*.mp3`) ainda **não existem** (pendência de conteúdo e de
  licença): sem eles o adaptador só emite avisos e o convite segue em silêncio.
- A parte audível (loop sem emenda, sincronia dos efeitos, loudness entre arquivos) só se verifica
  de ouvido: CT-08.1 a CT-08.6 continuam manuais.
