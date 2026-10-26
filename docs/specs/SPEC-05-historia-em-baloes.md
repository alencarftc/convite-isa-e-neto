# SPEC-05 · História em balões

> Espelho local da sub-aba "SPEC-05 · História em balões" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon
> Onde esta spec diz `.js`, leia `.ts` ([ADR-0001](../decisions/0001-typescript-e-clean-architecture.md)).

**Histórias:** US-05.1 a US-05.5 · **Prioridade:** Must (US-05.3, US-05.4 e US-05.5 Should) · **Pontos:** 12

## Resumo

Cinco balões em forma de nuvem saem do baú, um a cada 3 s, cada um com uma foto do casal recortada em círculo e uma frase logo abaixo. Cada frase fica parada e legível por 2 s antes de o balão subir e sumir. Enquanto isso, a luz caminha para o pôr do sol. Um toque triplica a velocidade até o fim do balão atual, sem pular frases.

## Escopo

**Dentro:** balões, fotos, frases, a timeline `tlHistoria` (que também carrega a `tlLuz` da SPEC-03), aceleração, dica "Toque para avançar", anúncio ao leitor de tela e reserva para foto ausente.

**Fora:** a música 1 (SPEC-08, disparada por `historia:inicio`) e o envelope que vem depois (SPEC-06).

## Comportamento

**Linha do tempo de um balão (3 s)**, repetida para os balões 1 a 5 em 0, 3, 6, 9 e 12 s:

| Início | O que acontece | Duração | Curva |
| --- | --- | --- | --- |
| 0 | O balão sai da boca do baú: `scale` 0,4→1, `opacity` 0→1, sobe até 62% da altura da tela | 0,8 s | `power2.out` |
| 0,4 s | A frase surge abaixo do balão | 0,2 s | `power1.out` |
| 0,6 s | Leitura: o balão sobe mais 8% da altura, balançando ±3°; a frase acompanha e fica totalmente legível | 2,0 s | `sine.inOut` |
| 2,6 s | Balão e frase sobem rápido e somem pelo alto | 0,4 s | `power1.in` |

Cada balão tem um leve desvio horizontal para a história não parecer uma fila: −12%, +10%, −6%, +12% e 0% da largura da tela, a partir do centro.

**História inteira (`tlHistoria`, 15 s)**

| Tempo | Evento |
| --- | --- |
| 0 s | `historia:inicio` (música 1 entra); `tlLuz` começa (SPEC-03); dica "Toque para avançar" aparece aos 0,6 s e some aos 3,6 s |
| 0, 3, 6, 9, 12 s | Rótulos `b0` a `b4`; cada um emite `historia:balao` com o índice e a frase |
| 15 s | Rótulo `fim`; emite `historia:fim`; `historia.run()` resolve |

**Acelerar:** um toque em qualquer ponto da cena muda a velocidade de `tlHistoria` para 3× até o próximo rótulo (o início do balão seguinte, ou `fim`) e depois volta a 1×. Nenhuma frase é pulada; a luz acelera junto porque está dentro da mesma timeline. A música não muda.

## Requisitos funcionais

- **RF-05.1** Os cinco balões vêm de `content.baloes`, na ordem do arquivo; o número de balões e a duração total saem de `config.duracoes.balao` × quantidade de balões.
- **RF-05.2** Os balões usam as variações de nuvem na sequência a, b, c, a, b; nunca a mesma em seguida.
- **RF-05.3** A foto fica num círculo com 56% da largura do balão, centralizado na parte mais cheia da nuvem (posição ajustável por variação com variáveis CSS), com `object-fit: cover` e o ponto de foco de `content.baloes[n].foco`.
- **RF-05.4** A frase fica numa etiqueta marfim com 88% de opacidade, cantos arredondados, texto em Cormorant Garamond, na cor `--cor-texto`, com até 80% da largura da tela.
- **RF-05.5** Tamanho do balão: `clamp(160px, 48vw, 260px)` na vertical e `clamp(180px, 20vw, 280px)` na horizontal.
- **RF-05.6** Durante a história, um `<button class="historia__avancar" aria-label="Avançar a história">` transparente cobre a cena e aplica a aceleração descrita acima.
- **RF-05.7** A dica "Toque para avançar" (`content.dicas.avancar`) só aparece na primeira vez que a história toca naquele aparelho.
- **RF-05.8** Uma região `aria-live="polite"`, invisível na tela, recebe cada frase em `historia:balao`; cada foto tem `alt` de `content.baloes[n].alt`.
- **RF-05.9** Se uma foto não existir ou falhar, o balão aparece sem o círculo, só com a frase, e a história segue.
- **RF-05.10** `historia.skip()` esconde os balões e deixa a `tlLuz` no fim (pôr do sol).

## Requisitos não funcionais

- **RNF-05.1** Cada frase fica inteira, parada em relação ao balão e legível por pelo menos 2 s (de 0,6 s a 2,6 s de cada ciclo).
- **RNF-05.2** O tratamento das fotos é fixo (CSS estático, sem animar filtro) e não altera rostos.
- **RNF-05.3** Fotos em JPEG ou WebP, 800 × 800 px, até 120 KB cada.

## Desenho técnico

**Conteúdo dos balões**

```js
// src/content.js (trecho)
baloes: [
  { frase: 'Tudo começou de um jeito simples.',          foto: 'photos/foto-1.jpg', alt: '[descrever a foto 1]', foco: '50% 35%' },
  { frase: 'Viramos amigos, parceiros e um só time.',     foto: 'photos/foto-2.jpg', alt: '[descrever a foto 2]', foco: '50% 35%' },
  { frase: 'Entre risadas e orações, o amor cresceu.',  foto: 'photos/foto-3.jpg', alt: '[descrever a foto 3]', foco: '50% 35%' },
  { frase: 'Em Salinas, à beira-mar, veio o pedido.',     foto: 'photos/foto-4.jpg', alt: '[descrever a foto 4]', foco: '50% 35%' },
  { frase: 'E o nosso sonho ganhou um sim.',              foto: 'photos/foto-5.jpg', alt: '[descrever a foto 5]', foco: '50% 35%' },
],
```

Os textos alternativos e os pontos de foco são preenchidos quando as fotos chegarem.

**Marcação de um balão** (gerada a partir de `content.baloes`)

```html
<section class="historia" aria-label="História do casal">
  <div class="balao balao--a">
    <img class="balao__nuvem" src="images/objects/11-balao-a.webp" alt="">
    <span class="balao__foto"><img src="photos/foto-1.jpg" alt="[descrever a foto 1]"></span>
    <p class="balao__frase">Tudo começou de um jeito simples.</p>
  </div>
  …
  <p class="visualmente-oculto" aria-live="polite"></p>
  <button class="historia__avancar" aria-label="Avançar a história"></button>
</section>
```

**Tratamento das fotos (CSS fixo)**

```css
.balao__foto {
  position: absolute;
  width: 56%; aspect-ratio: 1;
  left: var(--foto-x, 22%); top: var(--foto-y, 20%);
  border-radius: 50%;
  object-fit: cover;
  filter: sepia(0.12) saturate(0.92) contrast(0.96) brightness(1.02);
  -webkit-mask-image: radial-gradient(circle, #000 88%, transparent 100%);
          mask-image: radial-gradient(circle, #000 88%, transparent 100%);
}
```

A foto fica dentro de um `<span>`, porque imagens não aceitam `::after`. O filtro e a máscara acima valem para o `span`, e a imagem dentro dele usa `object-fit: cover`. O `::after` do `span`, com gradiente quente em `mix-blend-mode: soft-light` e opacidade 0,25, aproxima a cor da foto à luz da pintura. A cor do gradiente segue os tokens (SPEC-01).

**Aceleração**

```js
// src/scenes/historia.js (trecho)
function acelerar() {
  const alvo = tlHistoria.nextLabel() ?? 'fim';
  const tempoAlvo = tlHistoria.labels[alvo];
  tlHistoria.timeScale(3);
  const voltar = () => {
    if (tlHistoria.time() >= tempoAlvo) {
      tlHistoria.timeScale(1);
      gsap.ticker.remove(voltar);
    }
  };
  gsap.ticker.add(voltar);
}
```

## Conteúdo e assets

- `content.baloes` (5 itens) e `content.dicas.avancar` ("Toque para avançar").
- Imagens 11a, 11b e 11c; cinco fotos em `photos/` (pendentes com o casal).

## Casos de borda

| Situação | Reação |
| --- | --- |
| Foto ausente ou com erro | Balão sem o círculo, só com a frase (RF-05.9) |
| Frase longa demais para uma linha | A etiqueta quebra em até duas linhas; frases têm no máximo 8 palavras |
| Toques em sequência rápida | Cada toque recalcula o alvo, mas a velocidade nunca passa de 3× |
| Toque no último balão | Acelera até `fim`; o envelope entra normalmente |
| Tela baixa (celular deitado) | Os balões sobem até metade da altura, e a frase nunca sai da tela: o limite de subida é calculado pela altura disponível |
| Foto vertical ou horizontal | O recorte circular com `object-fit: cover` e o ponto de foco resolvem; o rosto deve ficar no centro do quadrado ao preparar a foto |

## Casos de teste

- **CT-05.1** Assistir à história inteira: cinco balões, na ordem, com as frases aprovadas, variações a, b, c, a, b. *(CA-05.1.1 a CA-05.1.3)*
- **CT-05.2** Gravar e medir: cada frase visível e parada por pelo menos 2 s; história inteira em 15 s. *(CA-05.2.1)*
- **CT-05.3** Tocar durante o balão 2: acelera até o balão 3 e volta ao normal; nenhuma frase é pulada. *(CA-05.3.1)*
- **CT-05.4** Conferir a dica "Toque para avançar" na primeira visita e a ausência dela na segunda. *(CA-05.3.2)*
- **CT-05.5** Comparar as fotos no balão com as originais: tom levemente quente, rostos iguais; conferir o peso de cada arquivo. *(CA-05.4.1, CA-05.4.2)*
- **CT-05.6** Com VoiceOver (iPhone) ou TalkBack (Android) ligado, ouvir as cinco frases uma vez cada. *(CA-05.5.1)*
- **CT-05.7** Renomear uma foto para simular ausência: o balão aparece só com a frase. *(RF-05.9)*

## Questões em aberto

- As cinco fotos e as descrições delas, com o casal.
- Se as frases 1 a 3 serão ajustadas a fatos específicos quando as fotos chegarem.
- Com animação reduzida, a história não aparece (decisão de 25/10/2026). Vale decidir se as cinco frases e fotos entram de forma estática abaixo da carta nesse modo.
