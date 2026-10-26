# Operação · Confirmação de presença (SPEC-11)

A confirmação vive fora do site: um Google Forms por família
(<https://forms.gle/yviZrELgrH2zrRGc7>), criado pelo script do documento de requisitos, e uma planilha
de respostas na conta Google do responsável. O convite só aponta para ele (botão da SPEC-07). Esta
página é a **lista de conferência do que depende de uma pessoa**, porque nada disso roda a partir do
repositório. A spec completa, com as fórmulas, está em [SPEC-11](../specs/SPEC-11-confirmacao-de-presenca.md).

## O que o repositório já garante

- O botão "Confirmar presença" abre `config.links.formulario` em outra aba (`target="_blank"`,
  `rel="noopener"`) e some às 00h de 01/01/2027, em Brasília (SPEC-07).
- `pnpm verificar` falha se os textos "Confirme até…" e "As confirmações foram encerradas em…" não citarem
  a data de `config.prazoConfirmacao`, ou se a data e o horário da carta e do aviso "É hoje!" não baterem
  com `config.casamento` (regra `datas-nos-textos`). Mudar a data em um lugar e esquecer o outro não
  passa mais despercebido.

## Lista de conferência (antes do envio, até 10/11/2026)

| #   | Passo                                                                                                                                                                                               | Quem        | Feito |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----- |
| 1   | Compartilhar a planilha "Confirmações — Isabella & David" com Isabella e David como **editores** (ou leitores). Nunca com link público: tem telefones e nomes de crianças.                          | responsável | ☐     |
| 2   | Conferir as letras das colunas na planilha real (A carimbo · B família · C WhatsApp · D vai? · E quantas · F nomes e idades · G recado) antes de criar as fórmulas.                                 | responsável | ☐     |
| 3   | Criar a aba **Resumo** com as seis linhas de [SPEC-11, "Aba Resumo"](../specs/SPEC-11-confirmacao-de-presenca.md); ajustar o nome da aba de respostas se não for "Respostas ao formulário 1".       | responsável | ☐     |
| 4   | Criar a formatação condicional de WhatsApp repetido na aba de respostas (intervalo `A2:G`, fórmula `=E($C2<>"";CONT.SE($C:$C;$C2)>1)`, preenchimento bege).                                         | responsável | ☐     |
| 5   | Em script.google.com › Acionadores, conferir que o gatilho `encerrarConfirmacoes` existe para 01/01/2027 às 00h (UTC−3). Se não existir, fechar à mão em 01/01 (Respostas › "Aceitando respostas"). | responsável | ☐     |
| 6   | Testar o fluxo (CT-11.1 a CT-11.3 abaixo), **pelo WhatsApp**, no iPhone e no Android.                                                                                                               | casal       | ☐     |
| 7   | Apagar as respostas de teste da planilha **e** do formulário (Respostas › Excluir todas as respostas) e conferir o Resumo zerado (CT-11.5).                                                         | responsável | ☐     |
| 8   | Decidir as duas questões em aberto: contagem de crianças e acesso (editor ou leitor).                                                                                                               | casal       | ☐     |

## Roteiro de teste

- **CT-11.1** Responder "Sim, estaremos lá!" com 3 pessoas e três nomes com idades: a linha aparece na
  planilha em segundos e o Resumo marca 1 família e 3 pessoas.
- **CT-11.2** Responder "Infelizmente não poderemos ir": o formulário pula para o recado; o Resumo conta
  1 família que não vai.
- **CT-11.3** Responder de novo com o mesmo WhatsApp: as duas linhas ficam destacadas.
- **CT-11.4** Conferir o gatilho `encerrarConfirmacoes` (passo 5).
- **CT-11.5** Apagar as respostas de teste e conferir o Resumo zerado antes do envio.

## Depois do prazo

Em 01/01/2027 o formulário passa a mostrar a mensagem de encerramento e o botão some do convite. Respostas
repetidas: vale a mais recente (edição de resposta está desligada). "8 ou mais" conta como 8; a linha 4 do
Resumo aponta essas respostas para conferência pela lista de nomes. Depois do casamento, a planilha pode ser
arquivada ou apagada pelo casal (RNF-11.2).

## Por que não é automático

Compartilhar a planilha e agendar acionadores mexem na conta Google de quem criou o formulário e em dados
pessoais dos convidados; por isso ficam com uma pessoa, não com o código do convite (RNF-11.1).
