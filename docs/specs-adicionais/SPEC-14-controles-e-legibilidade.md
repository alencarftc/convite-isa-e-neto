# SPEC-14 · Controles sempre à mão e legibilidade

> **Aprovada em 26/10/2026.** Spec adicional do repositório (ainda fora do Claude Docs). Origem: B3, B4 e B8 da [revisão](./README.md).

**Histórias:** US-14.1, US-14.2, US-14.3 · **Prioridade:** Should · **Pontos:** 3 · **Depende de:** SPEC-02, SPEC-06, SPEC-07, SPEC-09

## Resumo

Três ajustes pequenos que aproximam o convite do que está no briefing e do que foi decidido: "Pular para o convite"
passa a ficar à mão durante toda a abertura a partir da segunda visita; a dica "Role para ler" deixa de cobrir o
título da carta; e o verso do louvor vira opcional, para a mensagem do casal fechar bem sem ele.

## Escopo

**Dentro:** o controle de pular, a dica de rolagem e o verso opcional.

**Fora:** o atalho de teclado "Ir direto ao convite" (SPEC-09, continua como está) e o conteúdo do verso.

## Comportamento

### 1. "Pular para o convite" sempre à mão

Requisitos, "Sempre visíveis": _"um botão de som e, depois da primeira visita, um 'Pular para o convite'"_. Hoje ele
só existe na tela de entrada.

| Momento                                        | Primeira visita | A partir da segunda visita                  |
| ---------------------------------------------- | --------------- | ------------------------------------------- |
| Entrada                                        | Sem "Pular"     | "Pular para o convite" visível (como hoje)  |
| Bosque, baú, história, envelope, abertura      | Sem "Pular"     | "Pular para o convite" **continua visível** |
| Informações (estado final) e modo de segurança | —               | Some                                        |

O botão é um único componente fixo no canto superior esquerdo (o som fica no direito), pílula marfim, mínimo 44 px de
altura, texto de `content.dicas.pular`. Aciona o mesmo caminho do atalho de teclado: libera o som se ainda não foi
liberado e chama `orquestrador.pular()`, que emite `convite:pulado` (a música 2 entra, SPEC-09/ADR-0008).

### 2. "Role para ler" sem cobrir a carta

Hoje a dica é uma pílula **fixa na base da tela** e, em telas mais baixas (vi em 1024 × 768), cobre o título. Proposta: a
dica passa a ficar **na cena, logo acima da carta**, dentro do `.conteudo`, e rola junto com ela; some na primeira
rolagem (como hoje) ou depois de `config.convite.rolarVisivel` segundos, o que vier primeiro.

### 3. Verso do louvor opcional

Se `content.mensagem.versoLouvor` for vazio, o parágrafo não é criado (sem linha em branco). Colchetes continuam
barrados pelo `pnpm verificar`; vazio é uma escolha, não uma pendência.

## Requisitos funcionais

- **RF-14.1** O botão "Pular" aparece enquanto `estado.visitado` for verdadeiro e a fase não for final.
- **RF-14.2** Ele não aparece na primeira visita; a regra de `visitado` (SPEC-06, RF-06.10) não muda.
- **RF-14.3** A ordem do Tab: "Ir direto ao convite" (atalho), "Pular", botão de som, depois a etapa atual.
- **RF-14.4** A dica "Role para ler" fica ancorada ao topo da carta e nunca se sobrepõe a texto da carta.
- **RF-14.5** Verso vazio não gera elemento; `verificar` aceita `''` e continua barrando `[…]`.

## Requisitos não funcionais

- **RNF-14.1** O botão "Pular" tem texto com 4,5:1 de contraste e área de toque de pelo menos 44 × 44 px.
- **RNF-14.2** O botão não aparece no modo de segurança nem sobre as informações.

## Desenho técnico

- Novo `presentation/acessibilidade/botao-pular.ts`, no mesmo formato de `montarAtalhoParaOConvite`; `main.ts` liga as
  duas ao mesmo `acionarPular` (hoje inline no atalho). O `.entrada__pular` do HTML inicial é removido (o componente
  novo cobre a entrada).
- `estado.aoMudar` decide a visibilidade (`!ehFaseFinal(fase) && estado.visitado`).
- `cena-carta.ts`: `.convite__rolar` passa de `position: fixed` na base para filho do `.conteudo`, antes do `.carta`.
- `informacoes.ts`: `mensagem__verso` só é criado se houver texto.

## Casos de teste

- **CT-14.1** Primeira visita: nenhuma etapa mostra "Pular". Segunda visita: ele aparece na entrada, no baú, na história
  e no envelope, e leva à carta com a música 2.
- **CT-14.2** No estado final e no modo de segurança, o botão some.
- **CT-14.3** Em 1024 × 768, 375 × 812 e 812 × 375, "Role para ler" não cobre nenhum texto da carta.
- **CT-14.4** Verso vazio: a mensagem termina em "A sua presença é o nosso maior presente." e na assinatura, sem lacuna.
- **CT-14.5** Teclado: Tab percorre atalho, "Pular" e som, nessa ordem.

## Questões em aberto

- Basta a regra da segunda visita (como na decisão original) ou o "Pular" deve existir sempre?
- O canto superior esquerdo serve, ou prefere o rodapé? Sobre a arte final, pode haver conflito com elementos desenhados.

## Implementação (26/10/2026)

Implementada na branch `feat/spec-14-controles-e-legibilidade`. Respostas adotadas para as questões em aberto e
desvios do desenho acima:

- **Segunda visita em diante**, como na decisão original (RF-14.2), no **canto superior esquerdo**. O som continua no
  direito. Fonte do tamanho do corpo do texto (a do antigo botão da entrada), não a de rótulo, por legibilidade.
- **A primeira visita é lida uma vez, ao montar o botão** (`montarBotaoPular`). O convite registra a visita quando a
  carta termina de abrir (`registrarVisita`), ainda dentro da primeira abertura; ler `estado.visitado` a cada mudança
  de fase faria o botão aparecer no fim dela, contra o RF-14.2.
- **Ordem do Tab (RF-14.3):** atalho, "Pular", som, etapa atual. Para garantir, o botão de som saiu de dentro do
  `#app` e vai direto no `<body>`, antes de "Pular"; as cenas se montam depois e ficavam na frente dele.
- **O `.entrada__pular` do HTML inicial foi removido**; `cena-entrada.ts` não conhece mais "pular" (o orquestrador
  continua aceitando a escolha `pular`, vinda do botão ou do atalho). Clicar durante o carregamento já funciona.
- **"Role para ler":** filho do `.conteudo`, `position: absolute` acima do topo da carta (12 px de folga), `aria-hidden`
  (é só um aviso visual). O `top` repete o recuo do `.conteudo` (52% ou 55% da altura) em `vh` e `dvh`, porque o recuo
  não pode ser uma variável CSS com `dvh` (SPEC-15). Some na primeira rolagem ou `config.convite.rolarVisivel` (8 s)
  depois de aparecer. Medido em 1024 × 768, 375 × 812 e 812 × 375: a dica termina sempre 12 px acima da carta.
- **Verso opcional:** vazio não cria o parágrafo, nem no `<noscript>` nem no plano B; `pnpm verificar` aceita `''`.
- **Correção da SPEC-15 feita junto:** as alternativas em `vh` para `dvh` não tinham sido escritas e o teste não
  as cobrava (`\bdvh\b` não casa em "52dvh"). Agora estão escritas e o teste falha sem elas.
