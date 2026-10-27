# SPEC-19 · Água viva

> **Aprovada para teste em 27/10/2026**, só na branch `feat/cena-viva` ([épico 13](./README.md)). Decisão técnica:
> [ADR-0011](../decisions/0011-cena-viva-em-codigo-e-webgl.md).

**Histórias:** US-13.2 · **Prioridade:** Must · **Pontos:** 5 · **Depende de:** SPEC-18, SPEC-03, SPEC-05

## Resumo

A superfície do lago ondula devagar e ganha reflexos dourados que cintilam e crescem conforme o céu passa ao pôr do
sol. O efeito é uma distorção desenhada por um canvas WebGL pequeno, colocado sobre a camada do lago (imagem 04) e
limitado à parte de água dessa camada: a mata ao fundo não se mexe. O motor da distorção (**ondulação**) é genérico e
será reaproveitado pelo vento no casal (SPEC-22), por isso esta spec o define com regiões configuráveis.

## Escopo

**Dentro:** o motor de ondulação (canvas, shader, textura, regiões, ajuste `cover`, redimensionamento, perda de
contexto, níveis), o elemento de vida "água", os parâmetros em `config.vida.agua` e os testes.

**Fora:** máscara pintada do lago (Could, ver questões em aberto), o vento do casal (SPEC-22), som de água.

## Comportamento

| Momento                        | O que o convidado vê                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bosque:pronto`                | O lago, que estava parado, passa a ondular sem salto (o primeiro quadro do canvas é idêntico à imagem)                                                                |
| Céu baunilha                   | Ondulação lenta e quase só horizontal; reflexos claros e raros                                                                                                        |
| Durante a história             | Os reflexos ficam dourados e mais frequentes, acompanhando a opacidade de `.camada--ceu-sol` (`tlLuz`, SPEC-05), e se concentram numa coluna abaixo do sol, à direita |
| Primeira tela final            | O lago, no alto da tela, continua vivo ao lado do casal                                                                                                               |
| Nível leve                     | O mesmo desenho, em resolução 1× e a 30 quadros por segundo                                                                                                           |
| Sem WebGL ou perda de contexto | O lago parado, como hoje                                                                                                                                              |

**Como a água se move**

- A distorção desloca a leitura da imagem, sobretudo na horizontal, com duas ou três senoides de frequências e
  velocidades diferentes, para não parecer um padrão repetido.
- **Perspectiva:** perto do horizonte (alto da faixa de água) as ondas são mais miúdas e de menor amplitude; perto da
  margem (base), mais largas e um pouco maiores.
- **Amplitude** de cerca de 2,5 px de tela na margem: perceptível, nunca "líquido derretendo".
- **Reflexos:** pontos e traços horizontais curtos que acendem e apagam devagar (ruído no tempo), na cor
  `--cor-luz`, mais densos numa coluna vertical abaixo do sol (fundo à direita, como a luz da SPEC-03).

## Requisitos funcionais

- **RF-19.1** O canvas fica **dentro** de `.camada--lago`, cobrindo-a por inteiro (posição absoluta, 100% × 100%),
  `aria-hidden` e `pointer-events: none`. Assim herda a profundidade e o "sobe" da cena (SPEC-06) sem código extra.
- **RF-19.2** A textura é a própria imagem que o `<picture>` escolheu (`img.currentSrc`). Quando o aparelho gira e o
  navegador troca a arte (RF-03.1), o `load` da imagem refaz a textura; até lá, o canvas some (`opacity` 0) e a imagem
  aparece.
- **RF-19.3** O desenho reproduz o `object-fit: cover` da camada (centro, como no CSS), com a matemática no domínio,
  para o canvas sem distorção ficar pixel a pixel sobre a imagem.
- **RF-19.4** **Região de água:** uma faixa definida por `inicio` (fração da altura da camada onde a água começa,
  contada de cima) e `borda` (largura da transição suave), uma por orientação, em `config.vida.agua.regiao`. Fora da
  região, deslocamento zero.
- **RF-19.5** O brilho dos reflexos é `minimo + (maximo − minimo) × opacidade atual de .camada--ceu-sol`, lida a cada
  quadro com `gsap.getProperty`. Com Pular, a opacidade já é 1 e o brilho já começa no máximo.
- **RF-19.6** O canvas só aparece depois do primeiro quadro desenhado com sucesso; até lá (e para sempre, se algo
  falhar) a imagem de baixo é o que se vê. A imagem nunca é escondida: o canvas apenas a cobre.
- **RF-19.7** `webglcontextlost`: o elemento água para, remove o canvas e não tenta recuperar. Nenhum erro sobe para o
  modo de segurança.
- **RF-19.8** Pausar/retomar tira/devolve o desenho do `gsap.ticker`. Parar libera textura, buffers, programa e
  contexto (`WEBGL_lose_context`) e remove o canvas.

## Requisitos não funcionais

- **RNF-19.1** Uma única passada de desenho por quadro, com um triângulo que cobre a tela, sem texturas extras; o
  shader de fragmento faz no máximo três senoides e um ruído de valor por pixel.
- **RNF-19.2** Tamanho do canvas: a caixa da camada × `min(devicePixelRatio, resolucaoDaAgua do nível)`.
- **RNF-19.3** WebGL 1 (presente no piso de compatibilidade); textura NPOT com `CLAMP_TO_EDGE`, `LINEAR` e sem mipmap;
  `UNPACK_PREMULTIPLY_ALPHA_WEBGL` ligado e contexto com `premultipliedAlpha: true`, para as bordas transparentes da
  arte não ganharem halo.
- **RNF-19.4** O código do motor e do elemento água, comprimido, fica em até 3 kB gzip (parte dos 8 kB da SPEC-18).

## Desenho técnico

| Camada         | Arquivo                                        | Conteúdo                                                                                                                                                   |
| -------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain`       | `src/domain/vida/enquadramento.ts`             | `ajusteDeCobertura({ imagem, caixa, posicao })` → `{ escala: [sx, sy], deslocamento: [dx, dy] }` em coordenadas de textura, para `cover` e `contain`       |
| `domain`       | `src/domain/vida/regioes.ts`                   | tipos `RegiaoDeOndulacao` (`{ tipo: 'faixa', inicio, borda }` ou `{ tipo: 'elipse', centro, raio, borda, intensidade }`) e a validação dos valores (0 a 1) |
| `presentation` | `src/presentation/vida/ondulacao/ondulacao.ts` | `criarOndulacao(opcoes)` → `{ canvas, desenhar(tempo), redimensionar(), destruir() }` ou `null` se não houver WebGL                                        |
| `presentation` | `src/presentation/vida/ondulacao/shaders.ts`   | o GLSL (vértice e fragmento) como strings                                                                                                                  |
| `presentation` | `src/presentation/vida/agua.ts`                | o elemento de vida água: cria a ondulação sobre `.camada--lago img`, liga ao relógio e ao nível                                                            |
| raiz           | `src/main.ts`                                  | acrescenta a água à lista de elementos da cena viva                                                                                                        |

**Opções do motor** (`criarOndulacao`)

```ts
interface OpcoesDaOndulacao {
  readonly conteiner: HTMLElement; // onde o canvas entra
  readonly imagem: HTMLImageElement; // a fonte da textura
  readonly ajuste: 'cover' | 'contain';
  readonly regioes: readonly RegiaoDeOndulacao[];
  readonly onda: {
    readonly amplitude: number; // px de tela, na intensidade 1
    readonly frequencia: number; // ondas por altura da caixa, na base
    readonly velocidade: number; // ciclos por segundo
    readonly direcao: 'horizontal' | 'vertical';
    readonly perspectiva: number; // 0 = igual em toda a altura; 1 = metade da amplitude e o dobro da frequência no alto
  };
  readonly reflexos?: {
    readonly cor: string; // lida do token --cor-luz com getComputedStyle
    readonly densidade: number; // 0 a 1
    readonly colunaDoSol: number; // centro da coluna, fração da largura
    readonly larguraDaColuna: number;
  };
  readonly resolucao: number;
}
```

**Shader de fragmento (modelo):**

```glsl
// v_uv: 0..1 na caixa, y para baixo. u_escala/u_deslocamento: ajuste cover (RF-19.3).
float r = regiao(v_uv);                      // 0 fora, 1 dentro (faixa ou elipses, com borda suave)
float p = perspectiva(v_uv);                 // 0 no alto da região, 1 na base
float f = mix(u_frequencia * 2.0, u_frequencia, p);
float a = mix(u_amplitude * 0.5, u_amplitude, p) * r;     // u_amplitude já em unidades de uv
float t = u_tempo * u_velocidade * 6.2832;
float dx = sin(v_uv.y * f * 6.2832 + t) + 0.5 * sin(v_uv.y * f * 13.1 - t * 1.7 + v_uv.x * 4.0);
vec2 uv = clamp(v_uv + vec2(dx, 0.2 * dx) * a, 0.0, 1.0);
vec4 cor = texture2D(u_imagem, uv * u_escala + u_deslocamento);
float faisca = smoothstep(1.0 - u_densidade, 1.0, ruido(vec2(v_uv.x * 90.0, v_uv.y * 260.0) + t * 0.05))
             * coluna(v_uv.x) * r * u_brilho;
gl_FragColor = vec4(cor.rgb + u_corDoBrilho * faisca * cor.a, cor.a);
```

O modelo é ponto de partida: o executor ajusta números e formas olhando a cena, desde que respeite o RNF-19.1.

**Configuração** (acrescentar em `config.vida`):

```ts
agua: {
  primeiroEm: 0,
  regiao: {
    vertical: { tipo: 'faixa', inicio: 0.45, borda: 0.06 },
    horizontal: { tipo: 'faixa', inicio: 0.4, borda: 0.05 },
  },
  onda: { amplitude: 2.5, frequencia: 9, velocidade: 0.12, direcao: 'horizontal', perspectiva: 1 },
  reflexos: { densidade: 0.02, colunaDoSol: 0.78, larguraDaColuna: 0.35, brilhoMinimo: 0.25, brilhoMaximo: 0.9 },
},
```

`inicio` depende da arte final da camada 04 (onde a mata acaba e a água começa); com a arte provisória, medir no SVG.

## Casos de borda

| Situação                                                  | Reação                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A imagem do lago ainda não decodificou em `bosque:pronto` | Não acontece (é crítica), mas, se `naturalWidth` for 0, a água espera o `load`                    |
| Girar o aparelho                                          | `ResizeObserver` na camada redimensiona o canvas; o `load` da nova arte refaz a textura (RF-19.2) |
| Arte provisória em SVG                                    | Serve de textura (tem `width`/`height`); a ondulação aparece mesmo antes da arte final            |
| Tela muito larga                                          | O `cover` corta a faixa do lago como hoje; a região continua relativa à camada                    |
| Aba em segundo plano                                      | O `gsap.ticker` para; o tempo do shader vem do relógio do GSAP, sem salto ao voltar               |

## Casos de teste

- **CT-19.1** `ajusteDeCobertura`: imagem 16:9 numa caixa 9:16 com `cover` → escala horizontal < 1 e deslocamento
  centralizado; imagem igual à caixa → escala 1 e deslocamento 0; `contain` → faixas fora de 0..1. _(unidade)_
- **CT-19.2** Regiões: faixa com `inicio` 0,45 e `borda` 0,06 validada; valores fora de 0..1 recusados. _(unidade)_
- **CT-19.3** Sem WebGL (happy-dom): `criarOndulacao` devolve `null`, a água não cria nada, sem erro, e a imagem segue
  visível. _(integração; CA-13.2.3)_
- **CT-19.4** Com um contexto WebGL falso (objeto que conta chamadas): `desenhar` faz uma chamada de desenho por quadro;
  no nível leve, uma a cada dois quadros de 60 Hz; `destruir` apaga textura, buffer e programa. _(integração)_
- **CT-19.5** Disparar `webglcontextlost` no canvas: o canvas sai do DOM e a fase não muda. _(integração)_
- **CT-19.6** No navegador, cena vertical e horizontal: a mata ao fundo parada, a água ondulando, sem costura visível
  entre a parte que se move e a que não se move, e sem deslocamento entre o canvas e a imagem. _(CA-13.2.1)_
- **CT-19.7** No navegador, avançar a história: os reflexos aumentam com o pôr do sol; com Pular, já começam no
  máximo. _(CA-13.2.2)_
- **CT-19.8** No Chrome com CPU 4× mais lenta, gravar o desempenho por 10 s: a água sozinha fica abaixo de 1 ms de
  thread principal por quadro.

## Questões em aberto

- **Máscara pintada (Could):** se a margem do lago na arte final for curva e a faixa não acompanhar, trocar a região
  por uma máscara em tons de cinza (`mascaraDoLago`, uma por orientação, 20 kB) como segunda textura. O motor já recebe
  as regiões de forma genérica; a máscara seria um terceiro tipo de região.
- O reflexo do casal na água (quando ele surge) fica de fora: a distorção já mistura o que estiver pintado na camada.
