# SPEC-22 · Casal sentado e vivo

> **Aprovada para teste em 27/10/2026**, só na branch `feat/cena-viva` ([épico 13](./README.md)). Substitui, nesta
> branch, a imagem 17 (casal em pé) e o RF-06.8 da SPEC-06 no que diz respeito ao tamanho e à pose do casal.

**Histórias:** US-13.5 · **Prioridade:** Must · **Pontos:** 5 · **Depende de:** SPEC-18, SPEC-19, SPEC-06

## Resumo

Isabella e David passam a estar **sentados na grama, à beira do lago, sob a árvore da direita, de costas**, a cabeça
dela apoiada no ombro dele e o braço dele em volta dela, olhando o pôr do sol. A imagem nova (19) já vem pintada com a
luz de contra do pôr do sol e com um pedaço de grama sob eles, para assentar na cena. Quando surgem (SPEC-06, sem
mudar o tempo), ganham três movimentos sutis: **respiração**, **vento** no cabelo dela e na barra do vestido (com a
ondulação da SPEC-19) e um **brilho dourado** que respira devagar atrás deles.

## Escopo

**Dentro:** a imagem 19 e seu recorte, a nova marcação do espaço do casal, posição e tamanho sentados, o elemento de
vida "casal", os parâmetros em `config.vida.casal` e os testes.

**Fora:** gestos (ela encostar a cabeça, ele virar), reflexo do casal na água, a imagem 18 (reserva, não usada nesta
branch), rosto ou perfil (continuam proibidos).

## Comportamento

| Momento                                | O que o convidado vê                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Abertura do convite, 2,0 s (`casalEm`) | O casal sentado surge como hoje: `opacity` 0 → 1 e `y` 8 → 0 px em 1,5 s, `sine.out`                                     |
| A partir do surgimento                 | Respiração: o corpo dos dois cresce 0,6% na vertical e volta, a cada 4,5 s, com origem na base                           |
| Ao mesmo tempo                         | Vento: o cabelo dela e a barra do vestido ondulam de leve, em rajadas (a força sobe e desce num ciclo lento de 8 a 12 s) |
| Ao mesmo tempo                         | Brilho: um halo quente atrás deles vai de 50% a 85% de opacidade e volta, a cada 6 s                                     |
| Pular (`convite:pulado`)               | O casal já aparece pronto, e os três movimentos começam na hora                                                          |
| Nível leve ou sem WebGL                | Respiração e brilho, sem vento                                                                                           |
| Animação reduzida                      | O casal parado, como hoje                                                                                                |

**Posição e tamanho (ponto de partida, ajustar com a arte):**

| Orientação | Altura da imagem | Centro horizontal | Base (do chão da tela) |
| ---------- | ---------------- | ----------------- | ---------------------- |
| Vertical   | 10% da tela      | 66%               | 30%                    |
| Horizontal | 12% da tela      | 64%               | 23%                    |

Sentados, eles ocupam menos altura e mais largura que em pé: a imagem é mais larga que alta (cerca de 1,3 : 1).

## Requisitos funcionais

- **RF-22.1** Marcação do espaço do casal, montada por `cena-carta.ts` dentro de `.casal` (SPEC-06):

  ```html
  <div class="casal" aria-hidden="true">
    <span class="casal__brilho"></span>
    <!-- brilho, atrás -->
    <span class="casal__figura">
      <!-- a carta anima opacity e y aqui (era a img) -->
      <span class="casal__respiro">
        <!-- a vida anima scale aqui -->
        <img class="casal__imagem" alt="" src="…" />
        <!-- canvas do vento, criado pela vida (SPEC-19), por cima da img -->
      </span>
    </span>
  </div>
  ```

  A carta e a vida animam elementos diferentes, para nenhuma brigar pelo `transform` da outra. `elementos.casal` passa
  a ser a `.casal__figura`; o `skip()` da carta continua deixando a figura visível e em `y: 0`.

- **RF-22.2** O elemento de vida "casal" começa `config.convite.casalEm` segundos depois de `carta:abrindo`, ou na hora
  em `convite:pulado`; se a imagem ainda não carregou (caso de borda da SPEC-06), espera o `load`.
- **RF-22.3** Respiração: `scaleY` de 1 a `respiracao.escala` (1,006) e de volta, `sine.inOut`, `yoyo`, repetição
  infinita, em `.casal__respiro`, com `transform-origin: 50% 100%`.
- **RF-22.4** Vento: `criarOndulacao` (SPEC-19) sobre `.casal__imagem`, com `ajuste: 'contain'`, direção horizontal,
  sem reflexos e com **regiões em elipse** (cabelo dela, barra do vestido), em frações da caixa da imagem, uma
  intensidade por região. A força (`amplitude`) é modulada a cada quadro por
  `0,55 + 0,45 × sen(2π · tempo / período da rajada)`, com o período sorteado entre 8 e 12 s a cada ciclo.
- **RF-22.5** Brilho: `.casal__brilho` é um gradiente radial de `--cor-luz-45` para transparente, maior que a figura
  (160% da largura, 140% da altura), centrado um pouco acima dela, com `mix-blend-mode: soft-light` (estático) e
  `opacity` animada entre `brilho.minimo` e `brilho.maximo`.
- **RF-22.6** Posição e tamanho por variáveis CSS (`--casal-x`, `--casal-base`, `--casal-altura`), uma por
  orientação, em `carta.css`; a figura é centralizada no `--casal-x` (`translateX(-50%)` no contêiner estático, não na
  figura animada).
- **RF-22.7** Nada de rosto ou perfil: a regra vale para a imagem 19 (o prompt proíbe).

## Requisitos não funcionais

- **RNF-22.1** Imagem 19 com até 150 kB (mesma chave e orçamento da 17), 640 px de largura, fundo transparente, sem
  pixel semitransparente fora da borda (alfa < 16 vira 0, alfa ≥ 200 vira 255).
- **RNF-22.2** O canvas do vento cobre só a caixa da imagem (pequeno): no nível completo, até 1,5 × a densidade da tela.
- **RNF-22.3** Código do elemento casal em até 1 kB gzip (o motor de ondulação é o da SPEC-19).

## Desenho técnico

| Camada         | Arquivo                                | Conteúdo                                                                              |
| -------------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| `presentation` | `src/presentation/carta/cena-carta.ts` | monta a marcação do RF-22.1; `elementos.casal` vira a figura                          |
| `presentation` | `src/presentation/vida/casal.ts`       | elemento de vida: respiração, brilho e vento; ouve `carta:abrindo` e `convite:pulado` |
| `styles`       | `src/styles/carta.css`                 | `.casal__brilho`, `.casal__figura`, `.casal__respiro`, variáveis por orientação       |
| `config`       | `src/config/config.ts`                 | `imagens.casal` aponta para a 19 (provisório: o `casal.svg` sentado da SPEC-18)       |

**Configuração** (acrescentar em `config.vida`):

```ts
casal: {
  respiracao: { escala: 1.006, periodo: 4.5 },
  brilho: { minimo: 0.5, maximo: 0.85, periodo: 6 },
  vento: {
    onda: { amplitude: 1.5, frequencia: 14, velocidade: 0.35, direcao: 'horizontal', perspectiva: 0 },
    rajada: [8, 12],
    regioes: [
      { tipo: 'elipse', centro: [0.62, 0.32], raio: [0.12, 0.2], borda: 0.5, intensidade: 1 },   // cabelo dela
      { tipo: 'elipse', centro: [0.7, 0.86], raio: [0.22, 0.1], borda: 0.6, intensidade: 0.7 },  // barra do vestido
    ],
  },
},
```

As elipses são um palpite: o executor as ajusta sobre a imagem 19 final (no navegador, desenhar as regiões com uma
cor temporária ajuda).

## Imagem 19 · casal sentado

- **Geração:** prompt no Claude Docs, seção "Teste: cena viva" (anexos: a 01 vertical e a 17 aprovada, que dá a
  semelhança). Fundo cinza liso, com um pedaço irregular de grama e duas ou três rosas azuis sob eles, que assenta na
  grama da cena e dá o contato com o chão.
- **Recorte:** o do [README do épico](./README.md#imagens-novas), mantendo o pedaço de grama (ele faz parte do
  "objeto").
- **Exportação:** 640 px de largura, WebP com `quality` 82 e `alpha_quality` 90, em
  `public/assets/couple/19-casal-sentado.webp`.

## Casos de borda

| Situação                           | Reação                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| Imagem 19 chega depois da abertura | O casal surge em 1,5 s quando ela chegar (SPEC-06); a vida espera o `load` (RF-22.2)             |
| Celular deitado, pouca altura      | A carta começa em 55% e o casal continua no alto; o tamanho em fração da tela mantém a proporção |
| Pausa por cobertura                | Respiração, brilho e vento congelam juntos (relógio da vida)                                     |
| Perda do contexto WebGL            | Some o vento; respiração e brilho seguem                                                         |

## Casos de teste

- **CT-22.1** A carta monta `.casal > .casal__brilho + .casal__figura > .casal__respiro > img`; a abertura anima a
  figura; `skip()` deixa a figura com `opacity` 1 e `y` 0. _(integração, `carta.test.ts`)_
- **CT-22.2** Com tempo falso: depois de `carta:abrindo` + 2 s, `.casal__respiro` está em respiração (tween infinito
  ativo) e o brilho também; com `convite:pulado`, os dois começam na hora. _(integração)_
- **CT-22.3** No nível leve e sem WebGL, não há canvas no espaço do casal e a respiração existe. _(integração; CA-13.5.3)_
- **CT-22.4** Com animação reduzida, nenhum tween na figura além do `skip()`. _(integração)_
- **CT-22.5** `verificar`: `config.imagens.casal` aponta para um arquivo de até 150 kB.
- **CT-22.6** No navegador, primeira tela final, vertical e horizontal: o casal sentado sob a árvore, na margem, sem
  "flutuar"; respiração quase imperceptível, vento visível só no cabelo e na barra, sem deformar o resto. Registrar o
  que se viu. _(CA-13.5.1, CA-13.5.2)_

## Questões em aberto

- Se a semelhança da 19 não ficar boa (cabelo, pele, corpo), corrigir com as mensagens rápidas do bloco 17 antes de
  recortar: elas valem para a pose sentada.
- Reflexo do casal na água: como a água é a camada 04 (sem o casal), o reflexo não aparece. Se fizer falta, uma cópia
  da figura invertida, esmaecida e dentro da região da água é o caminho mais barato (nova spec).
