# SPEC-03 · Cena do bosque

> Espelho local da sub-aba "SPEC-03 · Cena do bosque" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon
> Onde esta spec diz `.js`, leia `.ts` ([ADR-0001](../decisions/0001-typescript-e-clean-architecture.md)).

**Histórias:** US-03.1, US-03.2, US-03.3, US-03.4 · **Prioridade:** Must (US-03.2 Should) · **Pontos:** 14

## Resumo

O bosque é montado em camadas de imagem empilhadas, da mais distante (céu) à mais próxima (grama e rosas). Depois do toque, a névoa se dissipa e a cena se aproxima levemente em 3 s. As camadas se movem em velocidades diferentes para dar profundidade. Durante a história, a luz passa de baunilha para pôr do sol. A mesma cena se recompõe na vertical e na horizontal.

## Escopo

**Dentro:** estrutura das camadas, enquadramento por orientação, revelação, profundidade, transição de luz e recálculo ao girar o aparelho.

**Fora:** o baú e a chave (SPEC-04), os balões (SPEC-05) e o casal (SPEC-06), que são camadas desta cena mas têm spec própria.

## Comportamento

| Momento | O que o convidado vê |
| --- | --- |
| Toque de entrada (0 s) | Os textos da entrada somem; a névoa começa a se abrir |
| 0 a 2,4 s | A névoa se dissipa e cresce levemente, revelando céu baunilha, lago, árvores, baú e rosas azuis |
| 0 a 3 s | A cena inteira se aproxima devagar (escala de 1,06 para 1), terminando com o baú em destaque |
| 3 s | Bosque pronto; a chave aparece (SPEC-04) |
| Sempre, depois da revelação | As camadas se movem com o mouse (computador) ou em deriva lenta (celular) |
| Durante os 15 s da história | O céu passa ao pôr do sol e uma luz quente cobre a cena |

**Camadas, da mais distante à mais próxima**

| Camada | Imagem | Vertical | Horizontal | Profundidade |
| --- | --- | --- | --- | --- |
| Céu baunilha | 02 | Tela inteira, `cover` | Tela inteira, `cover` | 0,15 |
| Céu de pôr do sol | 03 | Igual à de cima, começa invisível | Igual | 0,15 |
| Lago e mata | 04 | Faixa com 30% da altura, base a 30% do chão, centralizada | 40% da altura, base a 22% | 0,30 |
| Árvores | 05 | Tela inteira, `cover` (arte 9:16) | Tela inteira, `cover` (arte 16:9) | 0,60 |
| Baú | 08 e 09 | SPEC-04 | SPEC-04 | 0,75 |
| Grama e rosas | 06 | Faixa com 34% da altura, no chão | 30% da altura, no chão | 1,00 |
| Luz quente | Gradiente CSS | Tela inteira, começa invisível | Igual | — |

Os valores de posição são o ponto de partida e devem ser ajustados com as imagens reais. A profundidade multiplica o deslocamento máximo.

## Requisitos funcionais

- **RF-03.1** As camadas são elementos `<picture>` com uma fonte para `(orientation: portrait)` e outra para a horizontal; o navegador troca a arte sozinho ao girar.
- **RF-03.2** A revelação (`tlBosque`, `config.duracoes.nevoa` = 3 s) só começa quando `preload.criticoPronto()` resolve (SPEC-02) e emite `bosque:pronto` ao terminar.
- **RF-03.3** No computador (`pointer: fine`), o deslocamento acompanha o mouse: até 24 px na horizontal e 12 px na vertical, multiplicados pela profundidade da camada.
- **RF-03.4** No celular, cada camada faz uma deriva automática de até 6 px × profundidade, indo e voltando em 8 s, com fases defasadas. O giroscópio não é usado, porque o iPhone pediria permissão.
- **RF-03.5** A transição de luz (`tlLuz`) fica dentro da timeline da história (SPEC-05), para acelerar junto quando o convidado tocar.
- **RF-03.6** Com animação reduzida, não há profundidade nem aproximação; a cena aparece por esmaecimento de 0,4 s, já no pôr do sol se for direto à carta.
- **RF-03.7** Ao girar o aparelho, a profundidade recalcula seus limites e o baú se reposiciona pelo CSS, sem reiniciar nenhuma timeline.

## Requisitos não funcionais

- **RNF-03.1** Só se anima `transform` e `opacity`; nunca `filter`, `blur` ou tamanho, para manter a fluidez em aparelhos intermediários.
- **RNF-03.2** Pelo menos 50 quadros por segundo durante a revelação e a profundidade, num Android intermediário.
- **RNF-03.3** As camadas são decorativas: o contêiner da cena tem `aria-hidden="true"`.

## Desenho técnico

**Marcação**

```html
<div class="cena" aria-hidden="true">
  <picture class="camada camada--ceu" data-prof="0.15">
    <source media="(orientation: portrait)" srcset="images/scene/02-ceu-baunilha-9x16.webp">
    <img src="images/scene/02-ceu-baunilha-16x9.webp" alt="">
  </picture>
  <picture class="camada camada--ceu-sol" data-prof="0.15">…</picture>
  <picture class="camada camada--lago" data-prof="0.30">…</picture>
  <picture class="camada camada--arvores" data-prof="0.60">…</picture>
  <div class="bau" data-prof="0.75"><!-- SPEC-04 --></div>
  <picture class="camada camada--frente" data-prof="1">…</picture>
  <div class="camada camada--luz"></div>
  <div class="casal"><!-- SPEC-06 --></div>
</div>
```

**Revelação (`tlBosque`, 3 s)**

| Início | Elemento | Propriedades | Duração | Curva |
| --- | --- | --- | --- | --- |
| 0 | Camadas da névoa | `opacity` 1→0, `scale` 1→1,15 | 2,4 s | `sine.inOut` |
| 0 | `.cena` (origem em 50% 70%) | `scale` 1,06→1 | 3 s | `power2.out` |
| 3 s | — | `events.emit('bosque:pronto')` | — | — |

**Profundidade**

```js
// src/scenes/bosque.js (trecho)
const camadas = [...cena.querySelectorAll('[data-prof]')].map(el => ({
  el,
  prof: Number(el.dataset.prof),
  x: gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3.out' }),
  y: gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3.out' }),
}));

if (!state.toque) {
  window.addEventListener('pointermove', e => {
    const nx = (e.clientX / innerWidth) * 2 - 1;   // -1 a 1
    const ny = (e.clientY / innerHeight) * 2 - 1;
    camadas.forEach(c => { c.x(-nx * 24 * c.prof); c.y(-ny * 12 * c.prof); });
  });
} else {
  camadas.forEach((c, i) => gsap.to(c.el, {
    x: 6 * c.prof, duration: 8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 1.3,
  }));
}
```

As camadas têm 24 px de sobra em cada lado (`inset: -24px`), para o deslocamento nunca mostrar borda.

**Luz (`tlLuz`, inserida em `tlHistoria` na posição 0)**

| Elemento | Propriedades | Duração | Curva |
| --- | --- | --- | --- |
| `.camada--ceu-sol` | `opacity` 0→1 | 15 s | `sine.inOut` |
| `.camada--luz` | `opacity` 0→1 | 15 s | `sine.inOut` |

```css
.camada--luz {
  background: radial-gradient(120% 90% at 85% 35%, rgb(229 170 110 / 0.45), rgb(177 142 74 / 0.15) 55%, transparent 80%);
  mix-blend-mode: soft-light;
  opacity: 0;
  pointer-events: none;
}
```

O brilho vem do fundo à direita, onde o sol se põe, como pedem as regras de geração das imagens.

## Conteúdo e assets

Imagens 02, 03, 04, 05 e 06, nas versões 9:16 e 16:9 quando houver; imagem 7 para a névoa, se existir. Nenhum texto.

## Casos de borda

| Situação | Reação |
| --- | --- |
| Tela muito alta (celulares 20:9) | O `cover` corta as laterais do céu e das árvores; baú e lago ficam posicionados pela altura e não são cortados |
| Tela muito larga (monitor ultrawide) | O `cover` corta o alto e o baixo do céu; a faixa do lago é mais larga que a tela e fica centralizada |
| Barra do navegador do celular aparece ou some | A cena usa `100dvh` e se ajusta sem pular |
| Mouse sai da janela | As camadas voltam ao centro em 0,8 s |
| Aparelho fraco perde quadros | A deriva do celular usa só `transform`; se ainda houver queda, desligar a deriva da camada do céu, que é a maior |

## Casos de teste

- **CT-03.1** Tocar para entrar e gravar a tela: névoa some em cerca de 2,4 s, aproximação termina em 3 s com o baú em destaque. *(CA-03.1.1, CA-03.1.2)*
- **CT-03.2** No computador, mover o mouse até os quatro cantos: as rosas se movem mais que o céu e nenhuma borda aparece. *(CA-03.2.1)*
- **CT-03.3** No celular, observar a cena parada por 20 s: há movimento suave e contínuo. *(CA-03.2.2)*
- **CT-03.4** Ativar "reduzir movimento" no aparelho e repetir: nenhum movimento de profundidade. *(CA-03.2.3)*
- **CT-03.5** Durante a história, conferir a passagem ao pôr do sol; com toques para acelerar, a luz acelera junto. *(CA-03.3.1, CA-03.3.2)*
- **CT-03.6** Abrir em 320, 375, 414, 768, 1280 e 1920 px de largura, nas duas orientações: baú inteiro e visível. Girar o celular no meio do bosque: a cena se recompõe sem recarregar. *(CA-03.4.1 a CA-03.4.3)*
- **CT-03.7** Medir os quadros por segundo com as ferramentas de desempenho do Chrome no Android intermediário disponível. *(RNF-03.2)*

## Questões em aberto

- Posições finais das faixas do lago e do primeiro plano, a definir com as imagens geradas.
