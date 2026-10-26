# SPEC-15 · Compatibilidade com aparelhos antigos e plano B

> **Aprovada em 26/10/2026.** Spec adicional do repositório (ainda fora do Claude Docs). Origem: B2 da [revisão](./README.md).

**Histórias:** US-15.1, US-15.2, US-15.3 · **Prioridade:** Must (recomendada) · **Pontos:** 8 · **Depende de:** SPEC-01, SPEC-09, SPEC-12

## Resumo

A persona principal do convite é "de qualquer idade, inclusive pessoas pouco acostumadas com tecnologia", que abre o
link pelo WhatsApp, às vezes num aparelho antigo. Hoje o CSS usa recursos recentes **sem alternativa** e o JavaScript
vai num pacote único sem plano B. Em aparelhos mais velhos isso pode deixar o convite sem a névoa, com etiquetas sem
fundo (texto escuro sobre a grama) e partes do layout fora do lugar; se o pacote falhar, o convidado fica preso na
tela de entrada. Esta spec declara quais aparelhos o convite promete atender, troca os recursos sem alternativa e
cria um plano B visível quando o JavaScript não inicia.

## Escopo

**Dentro:** navegadores-alvo, alternativas de CSS, alvo do JavaScript, plano B quando o pacote não carrega e os testes
automáticos que impedem a volta dos problemas.

**Fora:** suporte a navegadores muito antigos (a definir abaixo), a matriz de aparelhos reais (SPEC-12) e qualquer
mudança visual para quem tem aparelho recente.

## O problema, em números

Medido no código atual (`src/styles/`, `vite.config.ts`):

| Recurso                                    | Usos          | Chega em (segundo a tabela de compatibilidade que conheço; confirmar no caniuse) | O que acontece sem ele                                                                                                                                                                                                                   |
| ------------------------------------------ | ------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color-mix()`                              | 18            | Safari 16.2, Chrome 111                                                          | A declaração inteira é descartada: as duas camadas da névoa ficam sem fundo; `.bau__dica`, `.carta__dica`, `.historia__dica`, `.balao__frase` e `.convite__rolar` perdem o fundo marfim (texto escuro sobre a cena); luz e brilhos somem |
| `dvh`                                      | 7             | Safari 15.4, Chrome 108                                                          | Altura e margens em `dvh` são descartadas: a carta começa no topo da tela em vez de a 52%, e o "Toque para entrar" cola na borda                                                                                                         |
| `@media (width >= …)`                      | 2             | Safari 16.4, Chrome 104                                                          | As regras (pais em uma coluna, margem maior em telas largas) não valem. A notação foi imposta pelo Stylelint                                                                                                                             |
| `:focus-visible`, `mask-image` sem prefixo | 1 cada        | Safari 15.4                                                                      | Foco menos claro; foto sem borda esfumada                                                                                                                                                                                                |
| JavaScript em ES2022 (`build.target`)      | todo o pacote | Safari 15.4 para tudo o que o ES2022 permite                                     | Provavelmente roda (o código não usa os recursos mais novos), mas ninguém conferiu                                                                                                                                                       |

Não há pedido de um navegador "mínimo" em nenhum documento. A SPEC-12 fala em "iOS atual e anterior".

## Comportamento

1. O convite declara o que atende (RF-15.1) e **o que for mais antigo recebe o plano B**, não uma tela quebrada.
2. Em aparelho dentro do alvo, tudo funciona como hoje; a aparência não muda.
3. Se o pacote de JavaScript não iniciar em `config.duracoes.limitePlanoB` (proposta: 10 s) ou falhar ao carregar, a
   página mostra a carta e as informações em texto simples, a mesma que o `<noscript>` já mostra (SPEC-09). Se o pacote
   chegar depois, ele assume e o plano B some.

## Requisitos funcionais

- **RF-15.1** `browserslist` no `package.json` com o alvo (proposta: `iOS >= 15.1`, `Chrome >= 90`, `Android >= 8` e
  as duas últimas versões dos navegadores de computador), a confirmar com o que você sabe do público.
- **RF-15.2** `color-mix()` deixa de ser usado. Cada ocorrência vira um token com transparência em hexadecimal de
  8 dígitos em `tokens.css` (por exemplo, `--cor-marfim-88`, `--cor-luz-45`), que todo navegador aceita.
- **RF-15.3** Cada propriedade em `dvh` vem **depois** de uma declaração equivalente em `vh`, como alternativa.
- **RF-15.4** Media queries na notação clássica (`min-width`, `max-width`); a regra do Stylelint é ajustada.
- **RF-15.5** `build.target` sai do `browserslist`, e um teste confere que o pacote gerado só usa sintaxe dentro dele.
- **RF-15.6** Plano B: um script inline de até 0,5 kB no `<head>` arma um temporizador; `main.ts` marca
  `window.__convite = 'iniciou'` na primeira linha. Se o temporizador vencer sem a marca, ou o `<script type="module">`
  falhar (`error` com `capture`), `<html>` ganha a classe `plano-b`, que esconde a entrada e mostra o bloco de texto
  simples. Quando o pacote inicia depois, remove a classe.
- **RF-15.7** O bloco do plano B é gerado do mesmo `content` que o `<noscript>` (`scripts/vite/noscript.ts`), uma fonte
  só, e continua dentro do orçamento de 30 kB de HTML.
- **RF-15.8** Fontes e imagens do plano B vêm do próprio site; nada de serviço externo.

## Requisitos não funcionais

- **RNF-15.1** Nenhuma mudança visível em aparelho recente (as cores trocadas são as mesmas, só pré-calculadas).
- **RNF-15.2** O script do plano B não depende do pacote nem de GSAP, e roda em qualquer navegador do alvo.

## Desenho técnico

- `tokens.css`: tokens `--cor-<nome>-<opacidade>` (hex de 8 dígitos, o único lugar onde cor em código é permitida).
- Substituição mecânica nos 18 usos; Stylelint ganha `color-function-notation` coerente e a regra que proíbe
  `color-mix` fora de `tokens.css` (ou em qualquer lugar).
- `tests/integration/css-compativel.test.ts`: lê `src/styles/*.css` e falha se houver `color-mix(`, `dvh` sem `vh`
  antes na mesma regra, ou `@media (width`.
- `scripts/vite/plano-b.ts`: plugin que injeta o script e o bloco (ao lado do `noscript.ts`).
- `vite.config.ts`: `build.target` derivado do `browserslist` (`browserslist-to-esbuild`).
- `docs/operacao/matriz-de-testes.md`: nova coluna "aparelho antigo", se houver um.

## Casos de borda

| Situação                                 | Reação                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Rede lenta (pacote chega depois de 10 s) | Aparece o plano B e, quando o pacote chega, o convite assume; ninguém fica sem nada            |
| Pacote chega, mas quebra no meio         | Modo de segurança (SPEC-09), como hoje                                                         |
| JavaScript desligado                     | `<noscript>`, como hoje                                                                        |
| Aparelho fora do alvo, JavaScript ok     | Funciona, possivelmente sem alguma sutileza visual; o plano B só entra se o pacote não iniciar |

## Casos de teste

- **CT-15.1** Bloquear o arquivo do JavaScript nas ferramentas do navegador: em até 10 s aparece a carta com as informações.
- **CT-15.2** Rede "Slow 3G": o plano B aparece e some quando o pacote termina de carregar.
- **CT-15.3** O teste automático falha se alguém reintroduzir `color-mix`, `dvh` sem alternativa ou media query de faixa.
- **CT-15.4** O pacote gerado passa na checagem de sintaxe do alvo.
- **CT-15.5** Em um iPhone com iOS 15 (se existir um à mão), abrir pelo WhatsApp: névoa, etiquetas e carta corretas.

## Questões em aberto

- Qual é o aparelho mais antigo que realmente importa? (Se for iOS 16.4 para cima, o item de `dvh`/faixa deixa de ser
  urgente e a spec encolhe para o plano B e o `color-mix`.)
- O limite de 10 s para o plano B é adequado ou o convidado com rede lenta prefere esperar?
