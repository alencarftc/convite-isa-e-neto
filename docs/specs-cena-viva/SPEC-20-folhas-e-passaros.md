# SPEC-20 · Folhas e pássaros

> **Aprovada para teste em 27/10/2026**, só na branch `feat/cena-viva` ([épico 13](./README.md)).

**Histórias:** US-13.3 · **Prioridade:** Must · **Pontos:** 5 · **Depende de:** SPEC-18

## Resumo

Dois elementos de vida feitos só com DOM e GSAP. **Folhas** se soltam da copa das árvores de tempos em tempos e caem
balançando e girando até perto do chão, a maioria atrás do baú e algumas, maiores, na frente. **Pássaros** cruzam o
céu em bandos pequenos, desenhados como pinceladas em "v" vistas de longe, batendo as asas e às vezes planando.

## Escopo

**Dentro:** os dois elementos de vida, os parâmetros em `config.vida.folhas` e `config.vida.passaros`, o token de cor
dos pássaros, o uso das imagens 20a–c e os testes.

**Fora:** pétalas (já existem na SPEC-04/06 e não mudam), som de pássaros, interação com o ponteiro.

## Comportamento

### Folhas

| Aspecto      | Comportamento                                                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Início       | `config.vida.folhas.primeiroEm` (1 s) depois do início da vida                                                                                                                                          |
| Ritmo        | Uma folha a cada 1,6 a 3,2 s (sorteado), enquanto houver menos folhas no ar que o limite do nível (8 completo, 4 leve)                                                                                  |
| De onde      | Um ponto sorteado na **copa**, um retângulo por orientação em frações da tela (padrão: x de 55% a 95%, y de 5% a 30% na vertical; x de 60% a 95%, y de 5% a 35% na horizontal), ajustável com a arte 05 |
| Queda        | Até uma altura sorteada entre 72% e 86% da tela (o chão do primeiro plano), em 7 a 11 s, `sine.inOut`                                                                                                   |
| Balanço      | Vai e vem lateral de 20 a 60 px, com 2 a 3 trocas de lado na queda, como uma folha que plana                                                                                                            |
| Giro         | Até 540° no total, somado a uma oscilação de inclinação (a folha "vira" no balanço)                                                                                                                     |
| Profundidade | 80% das folhas vão para `.vida--fundo` (atrás do baú, largura 1,4% a 2,4% da tela); 20% vão para `.vida--chao` (na frente, 2,6% a 3,6%, queda 30% mais rápida)                                          |
| Fim          | Nos últimos 20% da queda, a folha esmaece e sai do DOM                                                                                                                                                  |
| Variações    | As três imagens 20a–c, sorteadas; espelhadas na horizontal metade das vezes (`scaleX: -1`)                                                                                                              |

### Pássaros

| Aspecto             | Comportamento                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Início              | 3 s depois do início da vida                                                                                                                                             |
| Ritmo               | Um bando a cada 12 a 25 s; nunca dois bandos ao mesmo tempo                                                                                                              |
| Bando               | 2 a 5 pássaros, em formação solta (desvios sorteados de até 40 px na horizontal e 24 px na vertical em relação ao líder)                                                 |
| Caminho             | Entra fora da tela por um lado sorteado e sai pelo outro, numa faixa de 8% a 30% da altura, em 9 a 14 s, linear, com uma leve ondulação vertical (± 10 px, 2 a 3 ciclos) |
| Asas                | Cada pássaro é um "v" que bate asas por `scaleY` entre 1 e −0,55 (asas sobem e descem), período de 0,35 a 0,5 s, defasado entre os pássaros                              |
| Planar              | Em 30% dos bandos, cada pássaro para de bater as asas por 1,2 s no meio do caminho (fica em `scaleY` 0,6)                                                                |
| Tamanho e distância | Largura de 10 a 18 px; os menores ficam um pouco mais altos e mais lentos (parecem mais longe)                                                                           |
| Cor                 | `--cor-passaro`, um cinza-castanho escuro que funciona sobre o céu baunilha e sobre o pôr do sol (contraste não se aplica: é decoração)                                  |
| Direção             | Os pássaros "olham" para onde voam: o desenho é simétrico, então só a ondulação muda de fase                                                                             |

## Requisitos funcionais

- **RF-20.1** Folhas: `<img>` clonadas das variações já carregadas (como `criarPetala`, SPEC-06), com `alt=""`,
  `aria-hidden` e classe `folha`; sem imagem pronta, a folha da vez é pulada (RF-18.7).
- **RF-20.2** O limite de folhas no ar vem do nível (`config.vida.completo.maximoDeFolhas`,
  `config.vida.leve.maximoDeFolhas`); ao descer para `leve`, as que já estão no ar terminam a queda e só as novas
  respeitam o novo limite.
- **RF-20.3** Pássaros: um único `<svg>` por bando dentro de `.vida--ceu`, com um `<path>` em "v" por pássaro
  (traço arredondado, sem preenchimento, `stroke: var(--cor-passaro)`), animado só com `transform` no `<g>` de cada um.
  Sem imagem.
- **RF-20.4** Tudo é agendado no relógio da vida (RF-18.3) e removido do DOM ao terminar; `pausar` congela folhas e
  pássaros no lugar, `parar` remove todos.
- **RF-20.5** Os retângulos da copa, a faixa dos pássaros e a altura do chão são frações da tela (sem pixel fixo), lidas
  a cada novo nascimento: ao girar o aparelho, as próximas folhas e o próximo bando já usam a nova orientação.
- **RF-20.6** Os pássaros e as folhas de trás seguem a profundidade da camada onde estão (os contêineres têm
  `data-prof`, RF-18.6).

## Requisitos não funcionais

- **RNF-20.1** No máximo 8 folhas e 5 pássaros animados ao mesmo tempo; cada um com no máximo três tweens vivos.
- **RNF-20.2** O código dos dois elementos fica em até 2,5 kB gzip.
- **RNF-20.3** Imagens 20a–c com até 15 kB cada (`verificar`).

## Desenho técnico

| Camada         | Arquivo                             | Conteúdo                                                                                                                                |
| -------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `domain`       | `src/domain/vida/folhas.ts`         | `planejarFolha(aleatorio, parametros, orientacao)` → `{ origem, queda, duracao, balancos, giro, frente, espelhada, largura, variacao }` |
| `domain`       | `src/domain/vida/passaros.ts`       | `planejarBando(aleatorio, parametros)` → `{ lado, faixa, duracao, ondulacao, planar, passaros: [{ desvio, largura, periodo, fase }] }`  |
| `presentation` | `src/presentation/vida/folhas.ts`   | elemento de vida folhas: nascimento, queda, fim                                                                                         |
| `presentation` | `src/presentation/vida/passaros.ts` | elemento de vida pássaros: SVG do bando, travessia, asas                                                                                |
| `styles`       | `src/styles/vida.css`               | `.vida`, `.vida--ceu/fundo/chao`, `.folha`, `.passaro`; importado no `main.ts`                                                          |
| `styles`       | `src/styles/tokens.css`             | `--cor-passaro` (proposta: `#4a4038`; ajustar com a arte)                                                                               |

Toda a aleatoriedade fica nos planejadores puros do domínio, com `aleatorio` injetado: a apresentação passa
`Math.random` e os testes passam uma sequência fixa.

**Configuração** (acrescentar em `config.vida`):

```ts
folhas: {
  primeiroEm: 1,
  intervalo: [1.6, 3.2],
  duracao: [7, 11],
  balanco: [20, 60],
  trocasDeLado: [2, 3],
  giro: 540,
  largura: { fundo: [0.014, 0.024], frente: [0.026, 0.036] },
  fracaoNaFrente: 0.2,
  aceleracaoNaFrente: 1.3,
  copa: {
    vertical: { x: [0.55, 0.95], y: [0.05, 0.3] },
    horizontal: { x: [0.6, 0.95], y: [0.05, 0.35] },
  },
  chao: [0.72, 0.86],
  esmaecerNoFim: 0.2,
},
passaros: {
  primeiroEm: 3,
  intervalo: [12, 25],
  tamanhoDoBando: [2, 5],
  desvio: { x: 40, y: 24 },
  faixa: [0.08, 0.3],
  travessia: [9, 14],
  ondulacao: { amplitude: 10, ciclos: [2, 3] },
  asas: { periodo: [0.35, 0.5], escalaMinima: -0.55 },
  planar: { chance: 0.3, duracao: 1.2, escala: 0.6 },
  largura: [10, 18],
},
```

## Casos de borda

| Situação                                       | Reação                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| Folha nasce durante a subida da cena (convite) | Cai junto com o contêiner, que sobe com a cena; nada a fazer                  |
| Balões da história passam pela copa            | Os balões ficam acima (`--z-baloes`); as folhas passam atrás deles            |
| Tela muito estreita                            | Larguras em fração da tela, com piso de 10 px (folha) para não virar um ponto |
| Pausa por cobertura no meio de uma queda       | A folha congela; ao retomar, termina a queda                                  |
| Imagens 20 ainda não chegaram                  | Só os pássaros aparecem; as folhas começam quando as imagens ficarem prontas  |

## Casos de teste

- **CT-20.1** `planejarFolha` com `aleatorio` fixo: origem dentro da copa, chão entre 72% e 86%, duração entre 7 e 11 s;
  com `aleatorio` sempre 0,1, a folha vai para a frente (abaixo de `fracaoNaFrente`). _(unidade)_
- **CT-20.2** `planejarBando`: tamanho entre 2 e 5, faixa entre 8% e 30%, lados opostos para entrar e sair. _(unidade)_
- **CT-20.3** Com o tempo falso, 60 s de vida no completo: nunca mais de 8 `.folha` no DOM ao mesmo tempo; cada folha
  sai do DOM no fim. _(integração; CA-13.3.2)_
- **CT-20.4** Descer o nível para `leve` com 8 folhas no ar: nenhuma nova até haver menos de 4. _(integração)_
- **CT-20.5** 60 s de vida: pelo menos um bando nasce e sai do DOM; nunca dois `<svg>` de bando ao mesmo tempo.
  _(integração; CA-13.3.3)_
- **CT-20.6** `parar()` com folhas e bando no ar: nenhum `.folha` nem `.bando` sobra. _(integração)_
- **CT-20.7** No navegador, vertical e horizontal: as folhas saem da copa da árvore da direita e somem antes do chão; os
  pássaros cruzam o céu sem cortar os nomes nem os balões. Registrar o que se viu. _(CA-13.3.1)_

## Questões em aberto

- O retângulo da copa e a altura do chão dependem da arte 05 e 06; os valores acima vêm da arte provisória.
- Folhas na árvore da esquerda também? A arte 05 tem moldura dos dois lados; começar só pela da direita (onde o sol bate
  e o casal fica) e decidir olhando a cena.
