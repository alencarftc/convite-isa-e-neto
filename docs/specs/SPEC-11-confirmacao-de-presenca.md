# SPEC-11 · Confirmação de presença

> Espelho local da sub-aba "SPEC-11 · Confirmação de presença" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon

**Histórias:** US-11.1 a US-11.4 · **Prioridade:** Must (US-11.3 Should) · **Pontos:** 6 · **Situação:** formulário e encerramento publicados em 26/10/2026; faltam o teste, o compartilhamento e a aba de resumo

## Resumo

A confirmação é um Google Forms por família (forms.gle/yviZrELgrH2zrRGc7), criado pelo script anexado ao documento de requisitos. Cada resposta vira uma linha na planilha "Confirmações — Isabella & David". Esta spec completa o que falta: compartilhar a planilha com o casal, criar uma aba de resumo com os totais, destacar respostas repetidas e testar o fluxo inteiro antes do envio.

## Escopo

**Dentro:** estrutura do formulário (já publicado), colunas da planilha, aba de resumo, destaque de duplicidades, compartilhamento, encerramento automático e procedimento de teste.

**Fora:** o botão no convite e os estados por data (SPEC-07).

## Comportamento

| Etapa | O convidado | O casal |
| --- | --- | --- |
| Abre o formulário | Vê título, descrição com data, horário, local e prazo | — |
| Seção 1 | Informa nome da família, WhatsApp e se a família vai | — |
| "Sim, estaremos lá!" | Vai à seção 2: quantas pessoas e nome e idade de cada uma; depois, ao recado | — |
| "Infelizmente não poderemos ir" | Vai direto ao recado | — |
| Envia | Vê "Recebemos sua resposta. Obrigado por fazer parte da nossa história!" | Uma linha nova aparece na planilha em segundos; a aba "Resumo" atualiza |
| A partir de 01/01/2027 | Vê "As confirmações foram encerradas em 31 de dezembro de 2026." | A lista está fechada |

## Requisitos funcionais

- **RF-11.1** Colunas da aba de respostas (ordem criada pelo formulário): A Carimbo de data/hora · B Nome da família ou do responsável · C WhatsApp para contato · D A família vai ao casamento? · E Quantas pessoas da família vão · F Nome e idade de cada pessoa que vai · G Recado. Confira as letras na planilha real antes de criar as fórmulas.
- **RF-11.2** A planilha é compartilhada com Isabella e David como editores (ou leitores, se você preferir controlar as mudanças); nunca com link público, porque tem telefones e nomes de crianças.
- **RF-11.3** Uma aba "Resumo" mostra: famílias que vão, famílias que não vão, total de pessoas confirmadas, respostas com "8 ou mais" (para conferir a lista de nomes) e a data da última resposta.
- **RF-11.4** Na aba de respostas, uma formatação condicional destaca linhas com o mesmo WhatsApp repetido, para o casal decidir qual vale.
- **RF-11.5** O encerramento automático em 01/01/2027 às 00h (UTC−3) já está agendado pelo script (gatilho `encerrarConfirmacoes`). Confira em script.google.com › Acionadores que ele existe.
- **RF-11.6** As respostas de teste são apagadas da planilha e do formulário (Respostas › Excluir todas as respostas) antes do envio aos convidados.

## Requisitos não funcionais

- **RNF-11.1** Dados pessoais (telefones, nomes e idades) ficam só na conta Google do responsável e com o casal.
- **RNF-11.2** Ao terminar o casamento, a planilha pode ser arquivada ou apagada pelo casal.

## Desenho técnico

**Aba "Resumo"** (fórmulas no padrão brasileiro do Google Planilhas, com `;` como separador)

| Célula | Rótulo (coluna A) | Fórmula (coluna B) |
| --- | --- | --- |
| Linha 1 | Famílias que vão | `=CONT.SE('Respostas ao formulário 1'!D:D;"Sim, estaremos lá!")` |
| Linha 2 | Famílias que não vão | `=CONT.SE('Respostas ao formulário 1'!D:D;"Infelizmente não poderemos ir")` |
| Linha 3 | Pessoas confirmadas | `=SOMARPRODUTO(SEERRO(VALOR(ESQUERDA('Respostas ao formulário 1'!E2:E;1));0))` |
| Linha 4 | Respostas com "8 ou mais" (conferir os nomes) | `=CONT.SE('Respostas ao formulário 1'!E:E;"8 ou mais")` |
| Linha 5 | Total de respostas | `=CONT.VALORES('Respostas ao formulário 1'!A2:A)` |
| Linha 6 | Última resposta | `=MÁXIMO('Respostas ao formulário 1'!A2:A)`, com formato de data e hora |

A linha 3 lê o primeiro caractere da quantidade: "8 ou mais" conta como 8, e por isso a linha 4 aponta essas respostas para conferência pela lista de nomes. O nome da aba de respostas ("Respostas ao formulário 1") é o padrão em português; ajuste se for outro.

**Destaque de WhatsApp repetido**

Na aba de respostas: Formatar › Formatação condicional, intervalo `A2:G`, regra "A fórmula personalizada é":

```text
=E($C2<>"";CONT.SE($C:$C;$C2)>1)
```

Com preenchimento bege. O mesmo número escrito de formas diferentes (com e sem DDD, com e sem traço) não é detectado; nesses casos, o casal confere pelo nome da família.

## Conteúdo e assets

Textos do formulário em "Textos do convite" e no script, no documento de requisitos. Link: forms.gle/yviZrELgrH2zrRGc7.

## Casos de borda

| Situação | Reação |
| --- | --- |
| Família responde duas vezes | Linha destacada pela regra de WhatsApp; o casal mantém a mais recente |
| Família muda de ideia depois de responder | Responde de novo; a resposta mais recente vale (edição de resposta está desligada no formulário) |
| "8 ou mais" | Conta como 8 no total; a linha 4 do resumo aponta para conferência |
| Lista de nomes com quantidade diferente da informada | Vale a lista de nomes; o casal corrige a quantidade na planilha |
| Alguém tenta responder depois do prazo | O formulário mostra a mensagem de encerramento |
| O gatilho de encerramento não rodou | Em 01/01/2027, fechar manualmente: Respostas › desligar "Aceitando respostas" |

## Casos de teste

- **CT-11.1** Responder com "Sim", 3 pessoas e uma lista de 3 nomes com idades; conferir a linha na planilha e o resumo (1 família, 3 pessoas). *(CA-11.1.1, CA-11.2.1, CA-11.3.1)*
- **CT-11.2** Responder com "Não": o formulário pula para o recado; o resumo conta 1 família que não vai. *(CA-11.1.2)*
- **CT-11.3** Responder de novo com o mesmo WhatsApp: as duas linhas ficam destacadas. *(CA-11.3.2)*
- **CT-11.4** Em script.google.com › Acionadores, conferir o gatilho `encerrarConfirmacoes` para 01/01/2027. *(CA-11.4.1)*
- **CT-11.5** Apagar as respostas de teste e conferir o resumo zerado antes do envio. *(CA-12.3.2)*

## Questões em aberto

- Se o casal precisa saber quantas crianças vão (por exemplo, para o bufê). As idades estão em texto livre; para contar crianças automaticamente, o formulário precisaria de uma pergunta separada antes do envio.
- Se o casal terá acesso de editor ou de leitor na planilha.
