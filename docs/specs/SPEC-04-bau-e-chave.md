# SPEC-04 · Baú e chave

> Espelho local da sub-aba "SPEC-04 · Baú e chave" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon
> Onde esta spec diz `.js`, leia `.ts` ([ADR-0001](../decisions/0001-typescript-e-clean-architecture.md)).

**Histórias:** US-04.1, US-04.2, US-04.3, US-04.4 · **Prioridade:** Must (US-04.4 Could) · **Pontos:** 9

## Resumo

O baú é o primeiro gesto do convidado. No computador, o cursor vira uma chave; no celular, a chave flutua junto à fechadura. Um toque ou clique leva a chave à fechadura, ela gira, a tampa se abre com um pequeno salto e sai uma luz dourada, tudo em 2 s. Se o convidado não perceber o que fazer, a dica fica mais evidente.

## Escopo

**Dentro:** posicionamento do baú, cursor de chave, chave flutuante, área de toque, dicas, reforço por inatividade e a timeline de abertura.

**Fora:** os sons da fechadura e da tampa (SPEC-08, disparados pelos eventos desta spec) e os balões que saem do baú (SPEC-05).

## Comportamento

| Momento | Computador | Celular |
| --- | --- | --- |
| `bosque:pronto` | O cursor sobre a cena vira a chave | A chave aparece junto à fechadura, flutuando, com brilho pulsando |
| +1,5 s | Dica "Use a chave para abrir" abaixo do baú | Dica "Toque na chave" abaixo do baú |
| Cursor sobre o baú | Uma aura dourada suave surge atrás do baú (0,3 s) | — |
| Toque fora do baú | A chave e a aura pulsam uma vez | A chave pulsa uma vez |
| 8 s sem interação | Reforço: pulso mais forte e a dica reaparece; repete a cada 8 s, até 3 vezes | Igual |
| Clique ou toque no baú ou na chave | Abertura de 2 s (tabela abaixo) | Igual |

**Abertura (`tlBau`, 2 s)**

| Início | Elemento | O que acontece | Duração | Curva |
| --- | --- | --- | --- | --- |
| 0 | Dica | Some | 0,2 s | `power2.out` |
| 0 | Chave | Vai até a fechadura (no computador, sai da posição do cursor, que fica oculto) | 0,4 s | `power2.inOut` |
| 0,4 s | Chave | Gira 90°; emite `bau:girou` (som da fechadura) | 0,6 s | `back.out(1.4)` |
| 1,0 s | Baú | Pequeno salto: `y` −6 px e `scale` 1,03, e volta | 0,2 s + 0,2 s | `power2.out` / `power2.in` |
| 1,0 s | Baú aberto (09) | Surge sobre o fechado (08); emite `bau:abriu` (som da tampa) | 0,3 s | `power1.out` |
| 1,1 s | Luz de dentro do baú | Brilho dourado sobe até a opacidade 1 e assenta em 0,6 | 0,6 s + 0,3 s | `sine.out` |
| 1,3 s | Chave | Some | 0,3 s | `power1.out` |
| 2,0 s | — | `bau.run()` resolve; começa a história | — | — |

## Requisitos funcionais

- **RF-04.1** O baú fica centralizado na horizontal, com base a 16% da altura da tela na vertical e a 12% na horizontal; largura `clamp(150px, 42vw, 280px)` na vertical e `clamp(160px, 18vw, 300px)` na horizontal.
- **RF-04.2** Em aparelhos com mouse (`pointer: fine`), durante `aguardando-bau`, a cena usa o cursor de chave (`cursor-chave.png`, 48 px, com o ponto ativo na ponta da chave). Botões e textos mantêm o cursor normal.
- **RF-04.3** Em aparelhos com toque (`any-pointer: coarse`, o que inclui notebooks com tela de toque), a chave flutuante aparece mesmo que também haja mouse.
- **RF-04.4** Um `<button class="bau__botao" aria-label="Abrir o baú">` cobre o baú e a chave, com 12 px de folga e no mínimo 48 × 48 px; Enter e Espaço também abrem.
- **RF-04.5** A dica aparece `config.duracoes.dicaChave` (1,5 s) depois de `bosque:pronto`, com o texto de `content.dicas.chaveComputador` ou `content.dicas.chaveCelular`.
- **RF-04.6** O reforço dispara a cada `config.duracoes.reforcoDica` (8 s) sem interação, no máximo 3 vezes. *(US-04.4, Could)*
- **RF-04.7** Depois do primeiro toque válido, o botão fica desabilitado e novos toques são ignorados.
- **RF-04.8** `bau.skip()` deixa o baú aberto, com a luz em 0,6 e sem chave nem dica.
- **RF-04.9** Quando a tampa abre, de 4 a 6 pétalas azuis (imagens 16) sobem da boca do baú junto com a luz, usando a mesma função de pétalas da SPEC-06. Se as pétalas ainda não carregaram, a abertura segue sem elas.

## Requisitos não funcionais

- **RNF-04.1** A aura e o brilho são camadas com gradiente radial animadas só por opacidade; nunca `filter: drop-shadow` animado.
- **RNF-04.2** A resposta visual ao toque começa em até 100 ms.

## Desenho técnico

**Marcação**

```html
<div class="bau" data-prof="0.75">
  <div class="bau__aura" aria-hidden="true"></div>
  <img class="bau__fechado" src="images/objects/08-bau-fechado.webp" alt="">
  <img class="bau__aberto" src="images/objects/09-bau-aberto.webp" alt="">
  <div class="bau__luz" aria-hidden="true"></div>
  <img class="bau__chave" src="images/objects/10-chave.webp" alt="">
  <button class="bau__botao" aria-label="Abrir o baú"></button>
  <p class="bau__dica" aria-live="polite"></p>
</div>
```

A posição da fechadura é uma variável CSS relativa ao baú (`--fechadura-x: 50%; --fechadura-y: 58%`), ajustada depois de gerar a imagem 8. A chave flutuante fica à direita da fechadura, com 22% da largura do baú.

**Cursor**

```css
body[data-fase="aguardando-bau"] .cena { cursor: url('cursor-chave.png') 8 40, pointer; }
```

O ponto ativo (`8 40`) é a ponta da chave e deve ser conferido com a imagem final. O cursor deve ter até 48 × 48 px, porque alguns navegadores ignoram cursores maiores.

**Flutuação e brilho no celular**

| Elemento | Propriedades | Duração | Repetição |
| --- | --- | --- | --- |
| `.bau__chave` | `y` 0↔−6 px, `rotation` −4°↔ 4° | 1,6 s | Vai e volta, sem fim |
| Brilho da chave (`::after` com gradiente) | `opacity` 0,4↔0,9 | 1,2 s | Vai e volta, sem fim |
| Reforço | `scale` 1→1,15→1, três vezes | 0,9 s | A cada 8 s, até 3 vezes |

**Fluxo de código**

```js
// src/scenes/bau.js (esboço)
run() {
  return new Promise(resolve => {
    mostrarChave();
    agendarDica();
    agendarReforco();
    botao.addEventListener('click', () => {
      if (aberto) return;
      aberto = true;
      botao.disabled = true;
      cancelarReforco();
      tlBau.play().then(resolve);   // tlBau emite bau:girou e bau:abriu nos tempos da tabela
    }, { once: true });
  });
}
```

## Conteúdo e assets

- `content.dicas.chaveComputador` ("Use a chave para abrir") e `content.dicas.chaveCelular` ("Toque na chave").
- Imagens 08, 09 e 10; `cursor-chave.png`, derivado da 10.

## Casos de borda

| Situação | Reação |
| --- | --- |
| Notebook com tela de toque | Cursor de chave e chave flutuante ao mesmo tempo; qualquer um abre |
| O navegador não aceita cursor personalizado | Cursor de mãozinha (`pointer`); a dica escrita continua |
| Toque durante a revelação do bosque | Ignorado: o botão só é habilitado em `bosque:pronto` |
| Áudio bloqueado ou desligado | A animação acontece igual, sem som |
| Imagem 09 não carregou a tempo | O baú fechado faz o salto e a luz aparece; a imagem aberta entra quando chegar, e a história não espera |

## Casos de teste

- **CT-04.1** No computador, passar o cursor pela cena, pelo baú e pelo botão de som: chave na cena, aura no baú, cursor normal no botão. *(CA-04.1.1, CA-04.1.2)*
- **CT-04.2** No celular, conferir a chave flutuando e a dica 1,5 s depois do bosque; tocar na borda do baú, fora da chave, e conferir que abre. *(CA-04.2.1 a CA-04.2.3)*
- **CT-04.3** Gravar a abertura e medir: giro em 0,6 s, abertura completa em 2 s. *(CA-04.3.1, CA-04.3.2)*
- **CT-04.4** Tocar cinco vezes seguidas no baú: uma única abertura. *(CA-04.3.3)*
- **CT-04.5** Esperar 30 s sem tocar: três reforços, depois a chave segue só flutuando. *(CA-04.4.1)*
- **CT-04.6** Navegar só com teclado: Tab chega ao baú com foco visível; Enter abre. *(CA-09.3.1)*

## Questões em aberto

- Posição exata da fechadura e ponto ativo do cursor, depois de gerar as imagens 8 e 10.
