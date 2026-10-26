# SPEC-17 · Salvar na agenda

> **Aprovada em 26/10/2026.** Spec adicional do repositório (ainda fora do Claude Docs). Origem: B11 da [revisão](./README.md).

**Histórias:** US-17.1 · **Prioridade:** Could · **Pontos:** 3 · **Depende de:** SPEC-07

## Resumo

Quem confirma presença em dezembro ainda precisa lembrar da data em janeiro. Um botão secundário "Salvar na agenda"
cria o evento no calendário do aparelho (22/01/2027, 17h, Sítio Olinda) com um lembrete na véspera. Não está no
briefing, não é uma das 12 informações essenciais e acrescenta um botão ao cartão de ações; por isso é opcional.

## Escopo

**Dentro:** o botão, o arquivo de agenda gerado de `config`, a regra de quando aparece e os testes.

**Fora:** convites de calendário por e-mail e qualquer integração com serviço externo além do link de agenda.

## Comportamento

| Estado por data (SPEC-07)       | Botão "Salvar na agenda"         |
| ------------------------------- | -------------------------------- |
| Antes do prazo, depois do prazo | Visível, abaixo de "Como chegar" |
| No dia do casamento             | Visível                          |
| Depois do casamento             | Some (como "Como chegar")        |

Ao tocar, o aparelho oferece abrir o evento no aplicativo de agenda.

## Requisitos funcionais

- **RF-17.1** O evento sai de `config.casamento`, de `content.carta` (local e endereço) e de `config.publicacao.url` (no
  campo de descrição); nenhum texto é digitado de novo.
- **RF-17.2** Domínio puro: `gerarEventoDeAgenda(config, conteudo)` devolve o arquivo `.ics` (início em UTC, 20h00Z;
  duração proposta de 6 h, a confirmar; lembrete 1 dia antes), testado sem DOM.
- **RF-17.3** Entrega em dois caminhos: um `<a download>` com `data:text/calendar` (computador e Android) e, quando o
  navegador não baixar arquivos (o navegador interno do WhatsApp no iPhone costuma não baixar), um link do Google
  Agenda (`calendar.google.com/calendar/render?action=TEMPLATE…`). O endereço do Google entra na lista de permitidos
  do `verificar` (regra `servico-externo`).
- **RF-17.4** O botão é secundário (borda de 1,5 px, 48 px de altura), com `content.botoes.agenda` (**texto novo**, a aprovar).
- **RF-17.5** Some junto com "Como chegar" depois do casamento.

## Requisitos não funcionais

- **RNF-17.1** Sem JavaScript novo além de 1 kB gzip; o arquivo é gerado sob demanda, no toque.
- **RNF-17.2** Não envia nenhum dado a terceiros (o link do Google carrega só o que está no próprio convite).

## Desenho técnico

- `domain/agenda/evento-de-agenda.ts` + teste; `application/use-cases/obter-informacoes.ts` ganha `agendaVisivel`
  (igual a `comoChegarVisivel`); `presentation/informacoes/informacoes.ts` cria o botão.
- `config.ts` não muda; `content.ts` ganha `botoes.agenda` e `botoes.agendaGoogle` só se vocês aprovarem o texto.

## Casos de borda

| Situação                             | Reação                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| iPhone no navegador do WhatsApp      | O `.ics` pode não baixar; vale o link do Google Agenda (ou "abrir no Safari") |
| Fuso do aparelho diferente           | O evento é em UTC e o aparelho converte; 17h de Brasília aparece certo        |
| Evento duplicado (clicou duas vezes) | Responsabilidade do aplicativo de agenda; nada a fazer                        |

## Casos de teste

- **CT-17.1** O `.ics` gerado abre na agenda do computador e do Android com data, hora, local e lembrete corretos.
- **CT-17.2** No iPhone, dentro do WhatsApp: o botão leva ao Google Agenda ou oferece abrir no Safari.
- **CT-17.3** Mudar `config.casamento` muda o evento (teste unitário do domínio).
- **CT-17.4** Depois de 23/01/2027 o botão some.

## Questões em aberto

- Vocês querem esse botão? Ele cria mais um item no cartão de ações, que hoje tem só dois botões.
- Duração do evento no calendário (proposta: 6 h) e texto do botão.

## Implementação (26/10/2026)

Implementada na branch `feat/spec-17-salvar-na-agenda`. Respostas adotadas para as questões em aberto e desvios do
desenho acima:

- **O botão entrou**, abaixo de "Como chegar", com o texto **"Salvar na agenda"**. É **texto novo e ainda não aprovado
  pelo casal**: está em `content.botoes.agenda`, com um comentário avisando; se não gostarem, basta trocar o texto ou
  apagar o botão (`criarBotaoDaAgenda`).
- **Duração do evento: 6 h** (`config.agenda.duracaoEmHoras`), a confirmar: o convite não diz quando a festa termina.
  Lembrete 1 dia antes (`lembreteEmDias`) e nome do arquivo (`nomeDoArquivo`) também ficam em `config.agenda`, o que
  muda o item "`config.ts` não muda" do desenho.
- **Domínio puro** (`src/domain/agenda/evento-de-agenda.ts`): `gerarEventoDeAgenda` devolve o `.ics` (CRLF, linhas
  dobradas em 75 bytes sem partir caractere, vírgulas e ponto e vírgula escapados, `UID` estável, alarme `-P1D`) e o
  link do Google Agenda, os dois do mesmo evento. O título é "nomes · cerimônia", o local é "local, endereço", e a
  descrição leva o endereço do convite e o mapa: nada digitado de novo. Testado com os dados reais em
  `tests/integration/evento-de-agenda.test.ts` (o domínio não pode importar `config` nem `content`, nem nos testes).
- **Escolha do caminho:** nova porta `Capacidades.baixaArquivos()`, com adaptador em
  `infrastructure/ambiente/capacidades-do-navegador.ts`. Baixa o `.ics` (`<a download>` com `data:text/calendar`)
  onde o navegador baixa; **no iPhone e no iPad (qualquer navegador, inclusive o do WhatsApp) e na dúvida abre o Google
  Agenda** em outra aba. Não foi possível testar em aparelho real (CT-17.1 e CT-17.2 estão na matriz).
- **O `.ics` é montado quando o bloco de informações aparece**, não no toque: são cerca de 1 kB e isso evita código
  para refazer o `href` (RNF-17.1 pedia "sob demanda"; o custo medido é desprezível).
- **Peso:** o JavaScript crítico cresceu 1,1 kB gzip (de 54,7 para 55,8 kB), um pouco acima da meta de 1 kB da
  RNF-17.1, e segue longe do orçamento de 120 kB.
- **`pnpm verificar`:** o endereço base do Google Agenda entrou na lista de permitidos da regra `servico-externo`.
- **Some depois do casamento** junto com "Como chegar" (`agendaVisivel`), e o cartão de ações some por inteiro.
