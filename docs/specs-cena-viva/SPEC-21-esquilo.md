# SPEC-21 · Esquilo

> **Aprovada para teste em 27/10/2026**, só na branch `feat/cena-viva` ([épico 13](./README.md)).

**Histórias:** US-13.4 · **Prioridade:** Should · **Pontos:** 3 · **Depende de:** SPEC-18, SPEC-04

## Resumo

De tempos em tempos, um esquilo pequeno entra por uma lateral da tela, avança aos pulinhos pela grama do primeiro
plano, para, olha em volta e volta por onde veio. Ele nunca atravessa o baú: para antes dele. É um elemento de vida da
SPEC-18 feito com duas imagens (encolhido e esticado no pulo) que se alternam a cada salto.

## Escopo

**Dentro:** o elemento de vida esquilo, o planejamento da visita no domínio, os parâmetros em `config.vida.esquilo`, o
uso das imagens 21a e 21b e os testes.

**Fora:** som, interação com o convidado (tocar no esquilo não faz nada), outros bichos.

## Comportamento

| Momento                | O que acontece                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primeira visita        | 6 s depois do início da vida                                                                                                                             |
| Visitas seguintes      | 20 a 35 s depois do fim da anterior; nunca dois esquilos ao mesmo tempo                                                                                  |
| Entrada                | Por um lado sorteado, começando fora da tela, já virado para dentro                                                                                      |
| Ida                    | De 3 a 6 pulos até o **ponto de parada**, sorteado entre a borda e o lado do baú mais próximo, deixando uma folga de 10% da largura da tela antes do baú |
| Parada                 | 1,2 a 2,4 s: o rabo dá duas sacudidas, o esquilo se vira para o outro lado e volta a se virar (olha em volta)                                            |
| Volta                  | Vira para a borda de onde veio e sai aos pulos, até sumir fora da tela                                                                                   |
| Fase `carta` em diante | Nenhuma visita nova; a que estiver acontecendo termina normalmente                                                                                       |

**Um pulo**

| Parte   | O que faz                                                                                                                    | Duração                |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Impulso | Troca para a imagem esticada                                                                                                 | instantâneo            |
| Voo     | Avança 4% a 6% da largura da tela (`x`, linear) e sobe e desce 12 a 18 px (`y`, `sine.out` na subida e `sine.in` na descida) | 0,28 s                 |
| Pouso   | Troca para a imagem encolhida e achata de leve (`scaleY` 0,92 → 1, ponto de origem embaixo)                                  | 0,08 s                 |
| Respiro | Parado entre um pulo e outro                                                                                                 | 0,05 a 0,2 s, sorteado |

Os pulos são irregulares de propósito (distâncias e respiros sorteados), para não parecer um ciclo de animação.

## Requisitos funcionais

- **RF-21.1** O esquilo vive em `.vida--chao` (na frente do primeiro plano, RF-18.6) e caminha numa linha de chão a
  uma altura em fração da tela (`config.vida.esquilo.chao`, por orientação), dentro da faixa de grama da camada 06.
- **RF-21.2** O ponto de parada é calculado a partir da caixa do baú (`.bau`, `getBoundingClientRect`) **no começo de
  cada visita**. Se não houver espaço para pelo menos dois pulos entre a borda e a folga do baú (telas estreitas), a
  visita é cancelada e a próxima é agendada normalmente.
- **RF-21.3** O esquilo nunca cruza o baú, a chave flutuante nem a dica: o lado da visita e o ponto de parada garantem
  isso (o lado oposto ao baú não existe, já que o baú fica no centro).
- **RF-21.4** Virar de lado é `scaleX` 1 ↔ −1; as duas imagens olham para a direita no arquivo.
- **RF-21.5** Sem as duas imagens prontas, a visita da vez é pulada (RF-18.7). As duas imagens são trocadas por `src`
  já decodificado (clonadas das variações carregadas), sem piscar.
- **RF-21.6** Tudo no relógio da vida: `pausar` congela no meio do pulo; `parar` remove o esquilo.
- **RF-21.7** Elemento decorativo: `alt=""`, `aria-hidden`, sem foco, `pointer-events: none`.

## Requisitos não funcionais

- **RNF-21.1** Um esquilo, no máximo uma linha do tempo viva por vez.
- **RNF-21.2** Código em até 1,5 kB gzip; imagens 21a e 21b com até 25 kB cada.

## Desenho técnico

| Camada         | Arquivo                            | Conteúdo                                                                                                                                                                                                          |
| -------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain`       | `src/domain/vida/esquilo.ts`       | `planejarVisita(aleatorio, parametros, { larguraDaTela, bau: { esquerda, direita } })` → `null` (sem espaço) ou `{ lado, pulosDeIda: [{ distancia, altura, respiro }], parada, olhadas, pulosDeVolta }` em pixels |
| `presentation` | `src/presentation/vida/esquilo.ts` | elemento de vida: agenda visitas, monta a linha do tempo de cada uma, troca as imagens                                                                                                                            |
| `styles`       | `src/styles/vida.css`              | `.esquilo` (posição pela base, `transform-origin: 50% 100%`, largura por orientação)                                                                                                                              |

**Configuração** (acrescentar em `config.vida`):

```ts
esquilo: {
  primeiroEm: 6,
  intervalo: [20, 35],
  largura: { vertical: 0.07, horizontal: 0.035 },
  chao: { vertical: 0.12, horizontal: 0.09 },     // distância da base da tela até as patas
  pulos: [3, 6],
  pulo: { distancia: [0.04, 0.06], altura: [12, 18], voo: 0.28, pouso: 0.08, achatamento: 0.92, respiro: [0.05, 0.2] },
  folgaDoBau: 0.1,
  parada: [1.2, 2.4],
  sacudidasDoRabo: 2,
},
```

## Casos de borda

| Situação                                  | Reação                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| Celular estreito (320 px)                 | O espaço entre a borda e o baú pode não caber dois pulos: a visita é cancelada (RF-21.2) |
| Girar o aparelho no meio da visita        | A visita termina com os valores antigos (é curta); a próxima recalcula                   |
| Pular o convite (`convite:pulado`)        | A fase já é `convite`: nenhuma visita acontece                                           |
| O baú some ao abrir o convite (`bauSome`) | Já é fase `convite`: sem visitas                                                         |
| Pausa por cobertura                       | Não ocorre na prática (só há visitas antes da carta), mas o contrato é cumprido          |

## Casos de teste

- **CT-21.1** `planejarVisita` em 390 px com o baú entre 120 e 270 px: parada entre a borda e 120 − 39 px (do lado
  esquerdo) ou depois de 270 + 39 px (direito); de 3 a 6 pulos; distâncias entre 4% e 6%. _(unidade)_
- **CT-21.2** `planejarVisita` sem espaço para dois pulos → `null`. _(unidade)_
- **CT-21.3** Com tempo falso: a primeira visita começa aos 6 s; o esquilo entra, troca de imagem a cada pulo, para e
  sai do DOM no fim; a próxima vem entre 20 e 35 s depois. _(integração; CA-13.4.1)_
- **CT-21.4** Mudar a fase para `carta` no meio de uma visita: ela termina e nenhuma outra começa. _(integração; CA-13.4.3)_
- **CT-21.5** Em nenhum quadro da visita a caixa do esquilo cruza a caixa do baú (amostrar a cada 0,05 s com o tempo
  falso e caixas simuladas). _(integração; CA-13.4.2)_
- **CT-21.6** No navegador: o esquilo pula sobre a grama (não flutua acima nem afunda), na escala da cena, e volta
  sem cortar o baú. Registrar o que se viu.

## Questões em aberto

- Altura da linha de chão e largura do esquilo dependem da arte 06 e da imagem 21; ajustar no navegador.
- O esquilo poderia subir no tronco da árvore da direita em vez de voltar (mais charmoso, mais trabalho: precisaria de
  uma terceira pose). Fica para depois do teste.
