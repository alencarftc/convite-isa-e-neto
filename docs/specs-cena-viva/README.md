# Épico 13 · Cena viva (teste em branch)

> **Situação: aprovado para teste em 27/10/2026, só na branch `feat/cena-viva`.** A `main` continua como está; se o
> teste for aprovado, a branch é integrada à `main` de uma vez. Specs do repositório (fora do Claude Docs), no mesmo
> regime das [specs adicionais](../specs-adicionais/README.md). Decisão técnica: [ADR-0013](../decisions/0013-cena-viva-em-codigo-e-webgl.md).
>
> **Quem executa:** outro agente, a partir destes documentos. Tudo o que é preciso para implementar está aqui e nas
> specs; o que depende de arte gerada usa arte provisória até a imagem chegar (ADR-0006).

## Por que existe

Ao montar o casal de costas (imagem 17) sobre as camadas do bosque, o resultado pareceu "colado": a figura em pé, de
luz frontal, nítida e sem contato com o chão, não se mistura com a pintura. Além disso, Felipe quer **movimento na
cena**: a água se mexendo, folhas caindo das árvores, passarinhos cruzando o céu, um esquilo correndo na grama e o
casal com algum movimento, "algo bem simples, mas com motion".

Decisões tomadas na conversa de 27/10/2026, que estas specs registram:

1. **O casal passa a estar sentado** na grama, à beira do lago, sob a árvore da direita, de costas, a cabeça dela no
   ombro dele. Sentados, a grama cobre o contato com o chão, a forma fica baixa e compacta e a luz de contra (costas na
   sombra, contorno dourado) fica natural. A imagem 17 (em pé) fica só na `main`.
2. **O movimento é feito em código, sobre as camadas pintadas**, e não por vídeo gerado por IA: pesa pouco, não tem
   emenda de loop, não deforma o casal e deixa controlar quando cada coisa acontece.
3. **Sem biblioteca nova.** GSAP (já no projeto) para folhas, pássaros, esquilo e respiração; um WebGL escrito à mão,
   pequeno, para a ondulação da água e o vento no casal.

## Histórias

Prioridade MoSCoW e pontos (Fibonacci), como no épico original.

| ID      | História                                                                                                      | Spec                                          | Prioridade | Pontos |
| ------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------- | ------ |
| US-13.1 | Como convidado, quero que o bosque pareça vivo enquanto a história acontece, sem que isso pese no meu celular | [SPEC-18](./SPEC-18-fundacao-da-cena-viva.md) | Must       | 5      |
| US-13.2 | Como convidado, quero ver a água do lago se mexendo e brilhando com o pôr do sol                              | [SPEC-19](./SPEC-19-agua-viva.md)             | Must       | 5      |
| US-13.3 | Como convidado, quero ver folhas caindo das árvores e passarinhos cruzando o céu                              | [SPEC-20](./SPEC-20-folhas-e-passaros.md)     | Must       | 5      |
| US-13.4 | Como convidado, quero ver um esquilo correndo na grama de vez em quando                                       | [SPEC-21](./SPEC-21-esquilo.md)               | Should     | 3      |
| US-13.5 | ~~Como convidado, quero ver Isabella e David sentados à beira do lago, com um movimento sutil~~ (revertida)   | [SPEC-22](./SPEC-22-casal-sentado-e-vivo.md)  | Must       | 5      |
| US-13.6 | Como convidado sensível a movimento, quero poder parar a animação da cena                                     | [SPEC-18](./SPEC-18-fundacao-da-cena-viva.md) | Could      | 2      |

### Critérios de aceite

**US-13.1 · Cena viva sem pesar**

- **CA-13.1.1** Dado que o bosque terminou de aparecer (`bosque:pronto`), quando passam 3 s, então já há algum
  movimento de vida na cena (água, folha ou pássaro).
- **CA-13.1.2** Dado um Android intermediário, quando a cena viva roda com a profundidade, então a cena mantém pelo
  menos 50 quadros por segundo (RNF-03.2).
- **CA-13.1.3** Dado que o aparelho não aguenta (quadros lentos medidos em 2 s), quando a medição termina, então a cena
  passa ao nível leve sozinha, sem o convidado perceber um corte.
- **CA-13.1.4** Dado "reduzir movimento" ligado no aparelho, quando o convite abre, então nada da cena viva se move.
- **CA-13.1.5** Dado o modo de segurança, quando ele entra, então toda a cena viva para e some com a cena.
- **CA-13.1.6** Dado que o convidado rolou até a carta cobrir a cena, quando a parte visível da cena fica abaixo de 15%
  da tela, então a cena viva pausa; ao voltar, retoma de onde parou.
- **CA-13.1.7** O JavaScript publicado cresce no máximo 8 kB comprimido (gzip) com a cena viva inteira.

**US-13.2 · Água**

- **CA-13.2.1** Dado o bosque pronto, quando o convidado olha o lago, então a superfície ondula devagar, mais miúda perto
  do horizonte e mais larga perto da margem, e a mata ao fundo não se mexe.
- **CA-13.2.2** Dado que o céu passa ao pôr do sol (SPEC-05), quando a luz muda, então os reflexos dourados na água
  crescem junto.
- **CA-13.2.3** Dado um navegador sem WebGL, ou que perde o contexto, quando a cena abre, então o lago aparece parado,
  exatamente como hoje, sem erro e sem modo de segurança.

**US-13.3 · Folhas e pássaros**

- **CA-13.3.1** Dado o bosque pronto, quando o convidado espera, então folhas se soltam da copa das árvores de tempos em
  tempos, caem balançando e girando e somem perto do chão.
- **CA-13.3.2** Nunca há mais folhas no ar do que o limite do nível (8 no completo, 4 no leve).
- **CA-13.3.3** Dado o bosque pronto, quando passam de 12 a 25 s, então um bando de 2 a 5 passarinhos cruza o céu de um
  lado ao outro, batendo as asas e às vezes planando.

**US-13.4 · Esquilo**

- **CA-13.4.1** Dado o bosque pronto, quando o convidado espera de 6 a 40 s, então um esquilo entra por uma lateral,
  avança aos pulinhos pela grama, para, olha em volta e volta por onde veio.
- **CA-13.4.2** O esquilo nunca passa pela frente do baú, da chave ou da dica.
- **CA-13.4.3** Quando o envelope pousa (fase `carta`), o esquilo não aparece mais.

**US-13.5 · Casal**

- **CA-13.5.1** Dado que a carta abriu, quando o casal surge (SPEC-06, `casalEm`), então ele está sentado na grama, à
  beira do lago, sob a árvore da direita, de costas, e parece parte da pintura.
- **CA-13.5.2** Dado o casal na tela, quando o convidado olha por alguns segundos, então nota a respiração, o vento no
  cabelo dela e na barra do vestido e o brilho dourado do sol no contorno, tudo sutil.
- **CA-13.5.3** Dado o casal na tela e o nível leve ou sem WebGL, então continuam a respiração e o brilho, sem o vento.

**US-13.6 · Parar a animação** (Could; depende de aprovar um texto novo)

- **CA-13.6.1** Dado o convite aberto, quando o convidado toca em "Pausar animação", então toda a cena viva para e o
  botão passa a "Retomar animação"; a escolha fica salva para a próxima visita.

## Ordem de execução e branches

| Ordem | Spec                                                                  | Branch (a partir de `feat/cena-viva`) | Depende de                        |
| ----- | --------------------------------------------------------------------- | ------------------------------------- | --------------------------------- |
| 1     | [SPEC-18 · Fundação da cena viva](./SPEC-18-fundacao-da-cena-viva.md) | `feat/cena-viva-18-fundacao`          | —                                 |
| 2     | [SPEC-19 · Água viva](./SPEC-19-agua-viva.md)                         | `feat/cena-viva-19-agua`              | 18                                |
| 3     | [SPEC-20 · Folhas e pássaros](./SPEC-20-folhas-e-passaros.md)         | `feat/cena-viva-20-folhas-e-passaros` | 18                                |
| 4     | [SPEC-21 · Esquilo](./SPEC-21-esquilo.md)                             | `feat/cena-viva-21-esquilo`           | 18                                |
| 5     | [SPEC-22 · Casal sentado e vivo](./SPEC-22-casal-sentado-e-vivo.md)   | `feat/cena-viva-22-casal`             | 18 e 19 (reaproveita a ondulação) |

Cada branch de spec é mergeada em **`feat/cena-viva`**, nunca na `main`. As specs 20 e 21 podem andar em paralelo
depois da 18. Cada spec termina com uma seção **"Implementação"**, como nas specs adicionais: respostas adotadas para
as questões em aberto e desvios do desenho.

## Definição de pronto (vale para as cinco specs)

- `pnpm check` verde, com as camadas `domain` e `application` acima de 95% de cobertura.
- Teste de integração da spec em `tests/integration/` (happy-dom, `vi.useFakeTimers()`).
- Conferido no navegador na 5173, nas duas orientações (390 × 844 e 1280 × 800), com o relato do que se viu.
  Movimento que não dá para conferir na ferramenta (quadros por segundo reais, GPU) é dito como não conferido.
- Sem texto, tempo, cor ou camada literal no código: tempos e quantidades em `config.vida`, cores e camadas em
  `tokens.css`.
- Changeset no PR (`pnpm changeset`).
- `pnpm verificar` continua falhando **só** pelas pendências que já existiam e pela arte provisória nova.

## Orçamento

| Item                                                    | Limite                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| JavaScript da cena viva, comprimido                     | até 8 kB gzip (o pacote inteiro continua até 120 kB; hoje tem 56 kB)       |
| Trabalho por quadro na thread principal, nível completo | até 4 ms medidos no Chrome com CPU 4× mais lenta                           |
| Canvas WebGL                                            | no máximo 1,5 × a densidade da tela no completo, 1 × no leve               |
| Imagens novas                                           | folhas 3 × 15 kB; esquilo 2 × 25 kB; casal sentado 150 kB (substitui a 17) |

## Imagens novas

Os prompts completos, prontos para colar no ChatGPT, estão no Claude Docs, aba "Prompts para o ChatGPT", seção
**"Teste: cena viva"** (fonte da verdade). Arquivos finais, em `public/assets/`:

| Nº    | Imagem                                                 | Chave em `config.imagens`    | Arquivo                             | Tamanho                               | Peso       |
| ----- | ------------------------------------------------------ | ---------------------------- | ----------------------------------- | ------------------------------------- | ---------- |
| 19    | Casal sentado, de costas (substitui a 17 nesta branch) | `casal`                      | `couple/19-casal-sentado.webp`      | 640 px de largura, fundo transparente | 150 kB     |
| 20a–c | Folha caindo, três variações                           | `folhaA`, `folhaB`, `folhaC` | `objects/20-folha-a.webp` …         | 128 × 128 px, transparente            | 15 kB cada |
| 21a   | Esquilo encolhido                                      | `esquiloEncolhido`           | `objects/21-esquilo-encolhido.webp` | 256 px de largura, transparente       | 25 kB      |
| 21b   | Esquilo esticado, no pulo                              | `esquiloEsticado`            | `objects/21-esquilo-esticado.webp`  | 256 px de largura, transparente       | 25 kB      |

Os pássaros são desenhados em SVG no código (pinceladas em "v" vistas de longe) e não precisam de imagem. A água usa a
própria camada do lago (04). A imagem 18 (cena final com o casal, reserva) não é usada nesta branch.

**Recorte do fundo:** o ChatGPT entrega fundo cinza liso. O recorte usado na 17 funcionou bem e vale para as novas
(Python, `rembg` com o modelo `isnet-general-use`):

```python
from rembg import new_session, remove
from PIL import Image

sessao = new_session('isnet-general-use')
recorte = remove(
    Image.open('entrada.png'),
    session=sessao,
    alpha_matting=True,
    alpha_matting_foreground_threshold=240,
    alpha_matting_background_threshold=15,
    alpha_matting_erode_size=8,
)
# Depois: alfa < 16 vira 0 e alfa >= 200 vira 255 (o ChatGPT às vezes entrega o objeto 2% translúcido),
# corte pela caixa do alfa com 16 px de margem e exporte em WebP (quality 82, alpha_quality 90).
```

## Questões em aberto

1. **Pausar animação (US-13.6):** a WCAG 2.2.2 pede um jeito de pausar movimento automático que dure mais de 5 s ao
   lado de conteúdo. "Reduzir movimento" do aparelho já cobre quem configurou; o botão cobre o resto, mas precisa de
   texto novo aprovado ("Pausar animação" / "Retomar animação"). Recomendado: entrar, ao lado do botão de som.
2. **Som de passarinhos:** fora do escopo. O ambiente da SPEC-08 já pode ter pássaros; se não tiver, vale um efeito
   curto quando o bando passa? Depende do licenciamento dos sons.
3. **Esquilo no Pará:** o caxinguelê (esquilo brasileiro) é marrom-avermelhado; o prompt pede um esquilo pequeno,
   marrom quente e discreto. Se o casal preferir outro bicho (um sabiá pousando, uma borboleta azul), a SPEC-21 serve
   de molde.

## Implementação do épico (27/10/2026)

As cinco specs foram implementadas na branch `feat/cena-viva`, cada uma na sua branch (`feat/cena-viva-18-fundacao`,
`-19-agua`, `-20-folhas-e-passaros`, `-21-esquilo`, `-22-casal`) e mergeada com `--no-ff`. A seção "Implementação" de cada
spec registra as respostas e os desvios. A ADR da cena viva é a [0013](../decisions/0013-cena-viva-em-codigo-e-webgl.md)
(nasceu como 0011 e foi renumerada porque a arte final já usava 0011 e 0012).

| Critério (definição de pronto)                        | Situação                                                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` verde                                    | Sim, com `domain` e `application` acima de 95%                                                                       |
| Teste de integração de cada spec                      | Sim: `vida`, `agua`, `folhas-e-passaros`, `esquilo`, `casal` e os ajustes em `bosque`, `carta`, `composicao`         |
| Conferido no navegador, vertical e horizontal/desktop | Chrome em 390 × 844 e 1366 × 768 (água, folhas, pássaros, esquilo e casal). Quadros por segundo reais: não conferido |
| Sem texto, tempo, cor ou camada literal               | Sim: `config.vida`, `tokens.css` (`--z-vida-*`, `--cor-passaro`); os desenhos dos pássaros são geometria             |
| Changeset em cada PR                                  | Sim (um por spec)                                                                                                    |
| `pnpm verificar` falha só pelo que já faltava         | Falha também pelos textos de pausa (entre colchetes) e pela arte provisória nova (casal, folhas, esquilo)            |

### Orçamento

| Item                                 | Limite                      | Medido                                                                                                        |
| ------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| JavaScript da cena viva, gzip        | até 8 kB                    | **9,29 kB** (57,67 → 66,96 kB): fundação 1,24 · água 4,2 · folhas e pássaros 1,96 · esquilo 1,14 · casal 0,74 |
| Pacote inteiro, gzip                 | até 120 kB                  | 66,96 kB                                                                                                      |
| Trabalho por quadro com CPU 4× lenta | até 4 ms                    | não medido                                                                                                    |
| Imagens novas                        | folhas 15 kB, esquilo 25 kB | definitivas desde 01/11/2026 (13 a 18 kB cada; eram SVG provisórios, ADR-0020)                                |

O limite de 8 kB do épico foi **estourado em 1,29 kB**; o pacote inteiro segue com mais de 50 kB de folga. O motor WebGL da
água (código, GLSL e elemento) é a maior parte. Se o limite for firme, os caminhos são: enxugar o motor (tirar o suporte à
direção vertical e o recorte `cobrirTudo`, que nenhum elemento usa, e simplificar o GLSL dos reflexos), ou carregar a cena
viva em um pedaço à parte depois do toque de entrada (não muda o total publicado, só o crítico).

### Atualização de 31/10/2026: o teste no celular

Depois de ver a branch no celular, o casal aprovou a água, as folhas, os pássaros e o esquilo e **pediu para reverter o
casal** (sem animação, com os personagens anteriores: a imagem 17, em pé), além de uma lista de ajustes na composição, no
selo, no envelope, nos balões e na carta. Tudo está na [ADR-0014](../decisions/0014-ajustes-da-cena-viva-no-celular.md). O
que muda neste épico: a SPEC-22 está revertida (a imagem 19, a respiração, o vento e o halo saíram) e o motor WebGL ficou
só com a água; `config.imagens.casal` voltou a `assets/couple/17-casal-costas.webp`.

### Atualização de 01/11/2026: a cena vertical

Na vertical a cena passou a ser a pintura mestre 9:16 sem o céu (ADR-0015). A água ondula numa elipse sobre o lago da
pintura (`config.vida.agua.regiao.vertical`), as folhas caem da copa da direita dela e o esquilo corre a 10% da base, no
gramado. Na horizontal nada mudou.

### O que falta

1. ~~**Imagens definitivas:** 20a–c (folhas) e 21a–b (esquilo)~~ **chegaram em 2026-11-01**
   ([ADR-0020](../decisions/0020-folhas-esquilo-definitivos-e-audio-de-ambiente.md)): o `pnpm arte` reparte as duas folhas de
   imagem e a arte provisória saiu. A imagem 19 (casal sentado) deixou de ser necessária. Falta só conferir os tamanhos num
   aparelho real. O som de ambiente (`ambiente.mp3`) também já está no convite.
2. **Texto do botão "Pausar animação"** (US-13.6): `content.dicas.pausarAnimacao` e `retomarAnimacao`, entre colchetes até a
   aprovação do casal.
3. **Aparelhos reais:** 50 quadros por segundo num Android intermediário, o nível leve, o vento e a água no iPhone (matriz de
   testes).
4. **Decisão de integração:** se o teste for aprovado, a branch entra na `main` de uma vez; se não, a ADR-0013 vira
   "rejeitada" e nada dela chega à `main`.
