# SPEC-08 · Áudio

> Espelho local da sub-aba "SPEC-08 · Áudio" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon
> Onde esta spec diz `.js`, leia `.ts` ([ADR-0001](../decisions/0001-typescript-e-clean-architecture.md)). Em clean architecture, o áudio é uma *porta* (`AudioPort`) com adaptador Howler.js na infraestrutura.

**Histórias:** US-08.1 a US-08.5 · **Prioridade:** Must (US-08.2 Should) · **Pontos:** 11

## Resumo

O som tem três camadas: o ambiente do bosque, os efeitos dos gestos (chave, tampa, selo) e duas músicas: "Bondade de Deus" na história e "Ousado Amor" na revelação. O áudio é liberado no toque de entrada, porque os navegadores bloqueiam som antes de um gesto. Um botão sempre visível liga e desliga tudo e lembra a escolha. O som pausa quando o convidado sai do convite.

## Escopo

**Dentro:** biblioteca de áudio, liberação no toque, carregamento dos arquivos, volumes, transições, ligação com os eventos das cenas, botão de som, preferência, pausa em segundo plano e especificação dos arquivos.

**Fora:** a escolha das gravações e a licença delas (questão em aberto) e os momentos visuais que disparam os sons (SPEC-04 a SPEC-06).

## Comportamento

| Momento | Ambiente | Efeito | Música |
| --- | --- | --- | --- |
| Toque de entrada | Começa assim que carrega, subindo de 0 a 0,35 em 2 s, em loop | — | — |
| `bau:girou` | 0,35 | Fechadura (0,8) | — |
| `bau:abriu` | 0,35 | Tampa (0,8) | — |
| `historia:inicio` | Baixa para 0,15 em 2 s | — | Música 1 entra no trecho escolhido, subindo de 0 a 0,6 em 2 s |
| `carta:abrindo` | 0,15 | Selo e papel (0,7) | Transição de 2 s: música 1 desce a 0 e para; música 2 entra no trecho escolhido e sobe a 0,6 |
| Fim da música 2 | Volta a 0,35 em 3 s | — | — |
| Pular ou animação reduzida | Começa como no toque | — | Música 2 entra direto, com a transição de 2 s |
| Convidado sai do aplicativo ou bloqueia a tela | Pausa | — | Pausa |
| Convidado volta | Retoma, se o som estiver ligado | — | Retoma de onde parou |

## Requisitos funcionais

- **RF-08.1** Biblioteca: Howler.js *(proposta)*. Ela já resolve a liberação do áudio no primeiro toque, transições de volume e a diferença entre Web Audio e o elemento `<audio>` do HTML.
- **RF-08.2** `audio.desbloquear()` roda dentro da função do toque de entrada (SPEC-02). Depois disso, qualquer som pode tocar sem novo gesto.
- **RF-08.3** Ambiente e efeitos usam Web Audio (`html5: false`), para o loop do ambiente não ter emenda e os efeitos saírem na hora. As músicas usam o elemento de áudio (`html5: true`), para tocar enquanto baixam e ocupar menos memória.
- **RF-08.4** Volumes e tempos vêm de `config.volumes`; os trechos de início das músicas vêm de `config.musicas.inicio1` e `config.musicas.inicio2`, em segundos.
- **RF-08.5** O botão de som fica fixo no canto superior direito (respeitando a área segura do aparelho), com 44 × 44 px, desde a entrada. É um `<button aria-pressed>`, com ícone e rótulo para o leitor de tela; o texto visível ao passar o cursor alterna entre "Som ligado" e "Som desligado".
- **RF-08.6** Desligar o som silencia tudo (`Howler.mute(true)`) e grava `convite:som = false`; ligar faz o contrário. Se a preferência salva for "desligado", o áudio é liberado no toque de entrada mesmo assim, para que ligar depois funcione.
- **RF-08.7** Em `visibilitychange` (oculto) e `pagehide`, tudo pausa; ao voltar, retoma se `state.somLigado` for verdadeiro.
- **RF-08.8** Se um arquivo de som falhar, a cena segue sem ele; nenhum som é condição para a animação avançar.

## Requisitos não funcionais

- **RNF-08.1** O efeito toca em até 100 ms do evento que o dispara.
- **RNF-08.2** O loop do ambiente não tem silêncio nem estalo audível na emenda.
- **RNF-08.3** Os áudios só começam a baixar depois do toque de entrada (SPEC-02).

## Desenho técnico

```js
// src/audio.js (esboço, com Howler.js)
import { Howl, Howler } from 'howler';

const sons = {};
const v = config.volumes;

export const audio = {
  desbloquear() {                       // chamado dentro do toque de entrada
    Howler.mute(!state.somLigado);
    sons.ambiente = new Howl({ src: ['audio/ambiente.mp3'], loop: true, volume: 0 });
    sons.ambiente.once('load', () => { sons.ambiente.play(); sons.ambiente.fade(0, v.ambiente, 2000); });
    ['fechadura', 'tampa', 'selo'].forEach(n => sons[n] = new Howl({ src: [`audio/${n}.mp3`], volume: v.efeitos }));
    sons.musica1 = new Howl({ src: ['audio/musica-1.mp3'], html5: true, volume: 0, preload: 'metadata' });
    sons.musica2 = new Howl({ src: ['audio/musica-2.mp3'], html5: true, volume: 0, preload: 'metadata' });
    sons.musica2.on('end', () => sons.ambiente.fade(v.ambienteSobMusica, v.ambiente, 3000));
  },
  efeito(nome) { sons[nome]?.play(); },
  musica1() {
    sons.ambiente.fade(v.ambiente, v.ambienteSobMusica, 2000);
    sons.musica1.seek(config.musicas.inicio1); sons.musica1.play(); sons.musica1.fade(0, v.musica, 2000);
  },
  musica2() {
    sons.musica1.fade(sons.musica1.volume(), 0, 2000);
    sons.musica1.once('fade', () => sons.musica1.stop());
    sons.musica2.seek(config.musicas.inicio2); sons.musica2.play(); sons.musica2.fade(0, v.musica, 2000);
  },
  ligado(sim) { state.somLigado = sim; Howler.mute(!sim); salvarPreferencia('convite:som', sim); },
};

events.on('bau:girou', () => audio.efeito('fechadura'));
events.on('bau:abriu', () => audio.efeito('tampa'));
events.on('historia:inicio', () => audio.musica1());
events.on('carta:abrindo', () => { audio.efeito('selo'); audio.musica2(); });
```

Os arquivos são criados no toque, mas a ordem de download segue a fila da SPEC-02. As músicas usam `preload: 'metadata'` e baixam o resto quando a fila chega a elas.

**Pausa em segundo plano**

```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { Howler.mute(true); sons.musica1?.pause(); sons.musica2?.pause(); }
  else if (state.somLigado) { Howler.mute(false); retomarMusicaAtual(); }
});
```

## Arquivos de áudio

| Arquivo | Conteúdo | Formato | Duração | Tamanho-alvo |
| --- | --- | --- | --- | --- |
| `ambiente.mp3` | Vento leve, grama, aves, sem vozes nem música | MP3 mono, 96 kbps | 30 s, loop sem emenda | até 400 KB |
| `fechadura.mp3` | Chave girando numa fechadura antiga | MP3 mono, 96 kbps | até 1 s | até 20 KB |
| `tampa.mp3` | Tampa de madeira abrindo, com um leve rangido | MP3 mono, 96 kbps | até 1,5 s | até 25 KB |
| `selo.mp3` | Cera se partindo e papel se mexendo | MP3 mono, 96 kbps | até 1,2 s | até 20 KB |
| `musica-1.mp3` | "Bondade de Deus", instrumental, no trecho escolhido, com 3 s de esmaecimento no fim | MP3 estéreo, 128 kbps | 60 s | cerca de 1 MB |
| `musica-2.mp3` | "Ousado Amor", instrumental, a partir do trecho escolhido | MP3 estéreo, 128 kbps | até 3 min | cerca de 2,9 MB |

A música 1 toca no máximo uns 25 s (história, envelope e espera do selo), por isso 60 s bastam. Com os arquivos já cortados, `config.musicas.inicio1` e `inicio2` ficam em 0; os campos servem para ajuste fino sem reeditar o arquivo. Os volumes dos arquivos devem ser normalizados entre si (mesma loudness), para os valores de `config.volumes` valerem igualmente.

## Casos de borda

| Situação | Reação |
| --- | --- |
| iPhone com a chave do modo silencioso ligada | No Safari, o áudio por Web Audio (ambiente e efeitos) pode ficar mudo, enquanto as músicas tocam. Testar `navigator.audioSession.type = 'playback'`, disponível nas versões recentes do Safari, para que tudo toque; se não funcionar no navegador do WhatsApp, aceitar |
| Convidado desliga o som antes da música 1 | As músicas seguem tocando mudas, para continuarem sincronizadas se ele ligar de novo |
| História acelerada | A música não acelera; a música 2 entra quando o envelope abrir, como sempre |
| Música 1 ainda não carregou no início da história | Ela entra quando carregar, com o mesmo esmaecimento; se não chegar até o envelope abrir, só a música 2 toca |
| Convidado volta depois que a música 2 terminou | Só o ambiente toca |
| Fone Bluetooth desconectado | O sistema decide; o convite não tenta religar o som |
| `localStorage` indisponível | O som começa ligado e a escolha vale só até fechar o convite |

## Casos de teste

- **CT-08.1** Tocar para entrar com fone: ambiente sobe em cerca de 2 s e o loop não tem emenda audível em 2 min. *(CA-08.1.1)*
- **CT-08.2** Gravar tela e som da abertura do baú e do selo: som e movimento juntos. *(CA-08.2.1)*
- **CT-08.3** Ouvir a sequência inteira: música 1 na história, transição suave para a música 2 no envelope, ambiente de volta ao fim da música 2. *(CA-08.3.1, CA-08.3.2)*
- **CT-08.4** Desligar o som, recarregar e conferir que continua desligado; ligar e conferir que tudo volta. *(CA-08.4.1, CA-08.4.2)*
- **CT-08.5** Com a música tocando, trocar para outro aplicativo e voltar; depois, bloquear e desbloquear a tela. *(CA-08.5.1)*
- **CT-08.6** No iPhone, repetir com a chave do modo silencioso ligada e anotar o que toca. *(Caso de borda)*

## Questões em aberto

- Quais gravações instrumentais de "Bondade de Deus" e "Ousado Amor" usar e como obter a licença. A licença de uma gravação é separada da licença da composição; vale confirmar as duas.
- Os trechos de cada música.
- A origem dos efeitos sonoros (bancos gratuitos com licença de uso ou gravação própria).
- Confirmar Howler.js como biblioteca de áudio.
