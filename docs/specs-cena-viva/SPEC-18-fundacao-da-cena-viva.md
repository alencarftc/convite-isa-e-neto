# SPEC-18 · Fundação da cena viva

> **Aprovada para teste em 27/10/2026**, só na branch `feat/cena-viva` ([épico 13](./README.md)). Spec do repositório,
> fora do Claude Docs. Decisão técnica: [ADR-0011](../decisions/0011-cena-viva-em-codigo-e-webgl.md).

**Histórias:** US-13.1, US-13.6 · **Prioridade:** Must (US-13.6 Could) · **Pontos:** 5 + 2 · **Depende de:** SPEC-01,
SPEC-02, SPEC-03, SPEC-09, SPEC-15

## Resumo

A cena viva é um conjunto de pequenos movimentos de ambiente sobre as camadas pintadas do bosque: água (SPEC-19),
folhas e pássaros (SPEC-20), esquilo (SPEC-21) e o casal (SPEC-22). Esta spec cria o que todos eles dividem: **quando a
vida começa e para**, **quanto de vida cada aparelho aguenta** (níveis), **pausa** quando ninguém vê, os **lugares na
cena** onde cada movimento mora, a configuração em `config.vida`, as **imagens novas** no catálogo e a arte
provisória. Não desenha nenhum movimento: entrega o esqueleto testado e um "elemento de vida" de exemplo vazio, para
as specs seguintes só preencherem.

## Escopo

**Dentro:** ciclo de vida, níveis, medição de quadros, pausa por visibilidade e por cobertura, contêineres na cena,
contrato do elemento de vida, `config.vida` e seu tipo, tokens, catálogo e orçamento das imagens novas, arte
provisória, botão "Pausar animação" (Could) e testes.

**Fora:** cada movimento (SPEC-19 a 22), som, mudança no roteiro ou nos tempos da abertura (SPEC-02 a 06 não mudam).

## Comportamento

### Quando a vida existe

| Momento                                                 | O que acontece com a cena viva                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Entrada (névoa, "Toque para entrar")                    | Nada. A cena ainda está invisível                                                                |
| `bosque:pronto` (fim da revelação, 3 s depois do toque) | A vida começa no nível escolhido; cada elemento entra no próprio tempo (`primeiroEm` de cada um) |
| Baú, história, envelope                                 | Continua. O esquilo para de aparecer quando a fase vira `carta` (SPEC-21)                        |
| Convite aberto (`convite:aberto`)                       | Continua. O casal ganha vida quando surge (SPEC-22)                                              |
| Rolando a carta                                         | Pausa quando a cena visível acima da carta fica abaixo de 15% da altura da tela; retoma ao subir |
| Aba em segundo plano                                    | Para sozinha: tudo roda no relógio do GSAP, que segue o `requestAnimationFrame`                  |
| `convite:pulado` (Pular, atalho) sem animação reduzida  | A vida começa já no estado final, como se o bosque tivesse ficado pronto                         |
| Animação reduzida                                       | Nunca começa (nível `desligado`)                                                                 |
| `seguranca`                                             | Para tudo e tira do DOM o que criou                                                              |

### Níveis

O nível é escolhido no início e só pode **descer** (completo → leve), nunca subir, para a cena não oscilar.

| Nível       | Quando                                                                          | O que roda                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `completo`  | Padrão                                                                          | Tudo, com os limites de `config.vida`                                                                                                       |
| `leve`      | Aparelho modesto (memória até 2 GB ou até 4 núcleos), ou quadros lentos medidos | Água em resolução 1× e a 30 quadros por segundo; no máximo 4 folhas; pássaros e esquilo iguais; casal sem vento (respiração e brilho ficam) |
| `desligado` | Animação reduzida, ou "Pausar animação" escolhido antes (US-13.6)               | Nada se move; as camadas ficam como hoje                                                                                                    |

Sem WebGL (ou quando o contexto se perde), a água e o vento do casal não rodam em nenhum nível; o resto segue.

**Medição de quadros:** nos primeiros `vida.desempenho.janelaDeMedicao` segundos depois que a vida começa, mede-se o
intervalo entre quadros (pelo `gsap.ticker`). Se mais da metade dos quadros passar de `quadroLento` (25 ms, ou seja,
menos de 40 quadros por segundo), o nível desce para `leve`. A medição roda uma vez; a aba em segundo plano a
interrompe e ela recomeça ao voltar.

## Requisitos funcionais

- **RF-18.1** A vida começa em `bosque:pronto`, ou em `convite:pulado` se ainda não começou, e só se o nível não for
  `desligado`. Começar duas vezes não duplica nada.
- **RF-18.2** Cada movimento é um **elemento de vida** com o contrato `{ iniciar(nivel), aoMudarNivel(nivel), pausar(),
retomar(), parar() }`. A cena viva só conhece esse contrato.
- **RF-18.3** Tudo o que se move usa o relógio do GSAP (tweens, linhas do tempo, `gsap.delayedCall`,
  `gsap.ticker`); nada de `setTimeout`, `setInterval` ou `requestAnimationFrame` próprio. Assim a aba em segundo plano
  pausa tudo de graça e os testes controlam o tempo.
- **RF-18.4** Pausa por cobertura: na fase `convite`, um ouvinte de `scroll` (passivo, com no máximo uma leitura de
  layout por quadro) calcula a fração visível da cena acima do topo de `.conteudo`. Abaixo de
  `vida.pausaAbaixoDe` (0,15), pausa; acima, retoma. A carta é opaca (`--cor-marfim`), então o que fica atrás dela não
  precisa se mover.
- **RF-18.5** `seguranca` e `destroy` param tudo, removem os elementos criados e soltam os ouvintes. Nada fica congelado
  na tela (como as pétalas, ADR-0010).
- **RF-18.6** Contêineres na cena: a cena do bosque (SPEC-03) passa a criar, em `montar()`, quatro espaços vazios,
  decorativos e com `data-prof`, para a profundidade já movê-los junto com as camadas:

  | Espaço | Classe                      | Logo depois de     | `data-prof` | Uso                                       |
  | ------ | --------------------------- | ------------------ | ----------- | ----------------------------------------- |
  | Céu    | `.vida vida--ceu`           | `.camada--ceu-sol` | `ceu`       | Pássaros (SPEC-20)                        |
  | Fundo  | `.vida vida--fundo`         | `.camada--arvores` | `arvores`   | Folhas atrás do baú (SPEC-20)             |
  | Chão   | `.vida vida--chao`          | `.camada--frente`  | `frente`    | Esquilo e folhas da frente (SPEC-20 e 21) |
  | Água   | (dentro de `.camada--lago`) | —                  | herda       | Canvas da água (SPEC-19)                  |

  O casal continua em `.casal` (SPEC-06). Os espaços têm `aria-hidden="true"`, `pointer-events: none` e nenhum
  elemento focável.

- **RF-18.7** As imagens novas (folhas e esquilo) entram no catálogo como **secundárias**, num grupo novo logo depois
  do primeiro (o do baú e da história). Cada elemento de vida espera as próprias imagens: sem imagem pronta, ele não
  aparece, sem erro, e tenta de novo na vez seguinte. Nenhuma imagem crítica nova.
- **RF-18.8** Arte provisória para as imagens novas (`pnpm arte:provisoria`), no mesmo estilo da existente, com o
  marcador `ARTE PROVISÓRIA`; o casal provisório passa a ser um casal **sentado**.
- **RF-18.9** (Could, US-13.6) Botão "Pausar animação" ao lado do botão de som, a partir do `bosque:pronto`: alterna
  entre pausar e retomar toda a cena viva (inclusive a deriva da profundidade), lembra a escolha em
  `convite:movimento` (`Preferencias`) e, na próxima visita, a vida já começa `desligado`. Textos em
  `content.dicas`, **entre colchetes até serem aprovados** (o `verificar` barra a publicação com texto pendente).
  Área de toque ≥ 44 px, `aria-pressed`, foco visível, na ordem do Tab logo depois do som.

## Requisitos não funcionais

- **RNF-18.1** A cena viva inteira acrescenta até 8 kB gzip ao JavaScript publicado (medido com `pnpm size` antes e
  depois; o limite do pacote continua 120 kB).
- **RNF-18.2** Com tudo rodando no nível completo, a cena mantém pelo menos 50 quadros por segundo num Android
  intermediário (RNF-03.2), e o trabalho da vida na thread principal fica abaixo de 4 ms por quadro no Chrome com a CPU
  4× mais lenta.
- **RNF-18.3** Só `transform` e `opacity` nos elementos do DOM (RNF-03.1). A exceção é o canvas WebGL da água e do
  casal, que desenha em vez de animar propriedades (ADR-0011).
- **RNF-18.4** A vida nunca atrasa a abertura: nada dela roda antes de `bosque:pronto`, e nenhuma imagem dela é crítica.
- **RNF-18.5** Funciona no piso de compatibilidade (Safari/iOS 15.1, Chrome 90; ADR-0009), sem API acima dele.

## Desenho técnico

### Camadas

| Camada           | Arquivo                                                   | Conteúdo                                                                                                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain`         | `src/domain/vida/nivel.ts`                                | `escolherNivel({ reduzido, pausadoPeloConvidado, aparelhoModesto })` e `avaliarQuadros(intervalos, limites)` → `'manter' \| 'rebaixar'`                                                                                                                                           |
| `domain`         | `src/domain/vida/sorteio.ts`                              | `sortearEntre([min, max], aleatorio)`, `sortearInteiro`, `escolherLado(aleatorio)`; o `aleatorio` é injetado (no domínio não há `Math.random`)                                                                                                                                    |
| `domain`         | `src/domain/vida/cobertura.ts`                            | `fracaoVisivelDaCena(topoDoConteudo, alturaDaJanela)`                                                                                                                                                                                                                             |
| `domain`         | `src/domain/config/config-convite.ts`                     | tipo de `vida` (abaixo)                                                                                                                                                                                                                                                           |
| `application`    | `src/application/ports/capacidades.ts`                    | `Capacidades` ganha `suportaWebGL(): boolean` e `aparelhoModesto(): boolean`                                                                                                                                                                                                      |
| `infrastructure` | `src/infrastructure/ambiente/capacidades-do-navegador.ts` | WebGL: cria um canvas e pede `webgl` (sem `webgl2`), com `failIfMajorPerformanceCaveat: true`, e descarta o contexto (`WEBGL_lose_context`); modesto: `navigator.deviceMemory <= 2` ou `hardwareConcurrency <= 4` (ausente = não modesto). Tudo em `try/catch`, na dúvida `false` |
| `presentation`   | `src/presentation/vida/cena-viva.ts`                      | `criarCenaViva(dependencias)`: ciclo de vida, nível, pausa, registro dos elementos                                                                                                                                                                                                |
| `presentation`   | `src/presentation/vida/elemento-de-vida.ts`               | o contrato `ElementoDeVida` (RF-18.2)                                                                                                                                                                                                                                             |
| `presentation`   | `src/presentation/vida/relogio-da-vida.ts`                | uma `gsap.timeline({ autoRemoveChildren: true })` por elemento: tudo o que o elemento agenda entra nela, e pausar o elemento é pausar o relógio                                                                                                                                   |
| `presentation`   | `src/presentation/vida/medidor-de-quadros.ts`             | junta os intervalos do `gsap.ticker` na janela de medição e chama `avaliarQuadros`                                                                                                                                                                                                |
| `presentation`   | `src/presentation/vida/botao-movimento.ts`                | US-13.6 (Could)                                                                                                                                                                                                                                                                   |
| `presentation`   | `src/presentation/bosque/cena-bosque.ts`                  | cria os espaços do RF-18.6 em `montar()`                                                                                                                                                                                                                                          |
| raiz             | `src/main.ts`                                             | instancia `criarCenaViva` com `raiz`, `config`, `estado`, `eventos`, `capacidades`, `preferencias` (só para o botão) e a lista de elementos (vazia nesta spec; cada spec seguinte acrescenta o seu)                                                                               |

`criarCenaViva` não é uma etapa do orquestrador (não entra em `etapas`): é um componente que ouve o barramento, como o
áudio (`conectarAudio`). Assim, não mexe no contrato `Cena` nem nos tempos da abertura.

### Configuração

`config.vida`, com o tipo em `ConfigConvite['vida']`. Intervalos `[mínimo, máximo]` são `readonly [number, number]`
e sorteados a cada vez. Os valores das specs 19 a 22 são acrescentados por elas; esta spec cria o bloco com:

```ts
vida: {
  pausaAbaixoDe: 0.15,
  desempenho: { janelaDeMedicao: 2, quadroLento: 0.025, fracaoDeQuadrosLentos: 0.5 },
  leve: { quadrosDaAgua: 30, resolucaoDaAgua: 1, maximoDeFolhas: 4 },
  completo: { resolucaoDaAgua: 1.5, maximoDeFolhas: 8 },
},
```

### Tokens

Em `tokens.css`, na seção de camadas, sem número fora dos tokens: `--z-vida-ceu` (= `--z-ceu`), `--z-vida-fundo`
(entre `--z-arvores` e `--z-bau`, ex.: 25) e `--z-vida-chao` (entre `--z-primeiro-plano` e `--z-baloes`, ex.: 45).
As cores de cada elemento entram pelas specs seguintes.

### Catálogo e orçamento

- `src/domain/imagens/catalogo-de-imagens.ts`: novo grupo em `FILA_SECUNDARIA`, logo depois do primeiro:
  `['folhaA', 'folhaB', 'folhaC', 'esquiloEncolhido', 'esquiloEsticado']`. O teste do catálogo acompanha.
- `config.imagens`: as cinco chaves, apontando para a arte provisória.
- `scripts/verificar/orcamento.ts`: `folhaA/B/C: 15 * KB`, `esquiloEncolhido/Esticado: 25 * KB`; `casal` continua
  `150 * KB`.
- `scripts/gerar-arte-provisoria.ts`: `folha-a/b/c.svg` (folha simples em verde-sálvia), `esquilo-encolhido.svg` e
  `esquilo-esticado.svg` (silhueta marrom com rabo), e `casal.svg` redesenhado sentado.

## Casos de borda

| Situação                                             | Reação                                                                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bosque:pronto` e `convite:pulado` no mesmo instante | Começa uma vez só (RF-18.1)                                                                                                                         |
| Aparelho gira no meio                                | Os elementos leem o tamanho dos contêineres a cada ciclo; nada reinicia (RF-03.7)                                                                   |
| Aba volta depois de minutos                          | Continua de onde parou; nenhum "acúmulo" de folhas ou pássaros (o relógio do GSAP não compensa o tempo perdido, `lagSmoothing` padrão)              |
| `localStorage` indisponível (WhatsApp)               | O botão de pausa funciona na visita; a escolha só não é lembrada (`criarPreferencias` já cuida)                                                     |
| Erro dentro de um elemento de vida                   | O elemento é parado e esquecido, com um `console.warn`; **não** leva ao modo de segurança, porque é enfeite (mesma regra do gesto do selo, SPEC-16) |
| Plano B ou `<noscript>`                              | Sem cena, sem vida (SPEC-15)                                                                                                                        |

## Casos de teste

- **CT-18.1** `escolherNivel`: reduzido → `desligado`; pausado pelo convidado → `desligado`; modesto → `leve`; senão
  `completo`. _(unidade)_
- **CT-18.2** `avaliarQuadros`: 60% dos intervalos acima de 25 ms → `rebaixar`; 40% → `manter`; lista vazia →
  `manter`. _(unidade)_
- **CT-18.3** `fracaoVisivelDaCena`: topo do conteúdo em 52% da tela → 0,52; em 10% → 0,10; abaixo de 0 → 0. _(unidade)_
- **CT-18.4** Emitir `bosque:pronto`: um elemento de vida falso recebe `iniciar('completo')` uma vez; emitir de novo e
  emitir `convite:pulado` não chama de novo. _(integração)_
- **CT-18.5** Com `estado.reduzido`, nenhum `iniciar` é chamado e nada é criado no DOM. _(CA-13.1.4)_
- **CT-18.6** `seguranca`: todos os elementos recebem `parar()` e os espaços da vida ficam vazios. _(CA-13.1.5)_
- **CT-18.7** Fase `convite`, rolar até o topo de `.conteudo` ficar em 10% da janela: `pausar()`; voltar a 40%:
  `retomar()`. _(CA-13.1.6)_
- **CT-18.8** Medidor com intervalos falsos lentos: o nível desce para `leve` e os elementos recebem
  `aoMudarNivel('leve')` uma vez; nunca sobe de volta. _(CA-13.1.3)_
- **CT-18.9** Um elemento que lança erro em `iniciar` é parado com aviso e os outros seguem; a fase não vira
  `seguranca`.
- **CT-18.10** A cena do bosque cria os três espaços com `data-prof` e `aria-hidden`, e a profundidade os inclui. _(integração, `bosque.test.ts`)_
- **CT-18.11** `composicao.test.ts`: o `init()` de todas as cenas continua sem pedir imagem de etapa (as novas são
  secundárias).
- **CT-18.12** `pnpm size` antes e depois desta spec: a diferença fica registrada na seção "Implementação".
- **CT-18.13** (Could) Tocar em "Pausar animação": `pausar()` em todos e na deriva; a preferência é gravada; recarregar
  com ela gravada começa `desligado`. _(CA-13.6.1)_

## Questões em aberto

- O texto do botão de pausa (US-13.6) precisa de aprovação; enquanto isso, fica entre colchetes.
- `--z-vida-fundo` faz as folhas de trás passarem **atrás** do baú; se ficar estranho com a arte final, subir para
  logo acima do baú.
