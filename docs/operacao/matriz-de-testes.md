# Operação · Matriz de testes e critério de liberação (SPEC-12)

Os testes automáticos (`pnpm check`) cobrem lógica, camadas, texto, contraste, peso e o fluxo completo em um
navegador simulado. O que **só um aparelho real mostra** (som, fluidez, comportamento do navegador do
WhatsApp, leitor de tela, cursor) está nesta matriz, que precisa estar cumprida até **10/11/2026**, com o
convite aberto **pelo link, dentro do WhatsApp**, porque ele se comporta diferente do navegador normal.

A especificação, com os números e as metas, está em
[SPEC-12](../specs/SPEC-12-desempenho-e-qualidade.md). Marque cada célula com ✓ ou ✗ e a data.

## O que já foi medido (sem aparelho)

Lighthouse 12.8 no build de produção (`pnpm preview`), Chrome em modo celular com a rede simulada, em 26/10/2026
(só a abertura, sem tocar na tela, com a arte provisória; refazer com a arte final):

| Medida                  | Meta                  | Resultado                            |
| ----------------------- | --------------------- | ------------------------------------ |
| Desempenho              | ≥ 80                  | **89**                               |
| Acessibilidade          | ≥ 95                  | **100**                              |
| Boas práticas           | ≥ 95                  | **100**                              |
| Mudança de layout (CLS) | 0                     | **0**                                |
| Primeira pintura (FCP)  | névoa e nomes ≤ 1,5 s | 1,2 s                                |
| Maior pintura (LCP)     | —                     | 1,7 s                                |
| Tempo de bloqueio (TBT) | —                     | 430 ms (código do GSAP e do Howler)  |
| Peso até a entrada      | crítico ≤ 1,8 MB      | 197 KB (arte provisória; recalcular) |

Para repetir: `pnpm build`, `pnpm preview` e, em outro terminal, `pnpm dlx lighthouse@12 http://localhost:4173/ --view`.

## Matriz

| Cenário                                | Casos de teste            | iPhone · WhatsApp | iPhone · Safari | Android · WhatsApp | Android · Chrome | Computador |
| -------------------------------------- | ------------------------- | ----------------- | --------------- | ------------------ | ---------------- | ---------- |
| Primeira visita completa               | CT-02.1 a CT-06.5         | ☐                 | ☐               | ☐                  | ☐                | ☐          |
| Som: ambiente, efeitos, músicas, botão | CT-08.1 a CT-08.5         | ☐                 | ☐               | ☐                  | ☐                | ☐          |
| Modo silencioso do iPhone              | CT-08.6                   | ☐                 | ☐               | —                  | —                | —          |
| Sair e voltar ao aplicativo            | CT-08.5                   | ☐                 | ☐               | ☐                  | ☐                | —          |
| Acelerar a história e esperar o selo   | CT-05.3, CT-06.3          | ☐                 | ☐               | ☐                  | ☐                | ☐          |
| Girar o aparelho                       | CT-03.6                   | ☐                 | ☐               | ☐                  | ☐                | —          |
| Segunda visita e Pular                 | CT-09.2                   | ☐                 | ☐               | ☐                  | ☐                | ☐          |
| Animação reduzida                      | CT-09.1                   | ☐                 | ☐               | ☐                  | ☐                | ☐          |
| Leitor de tela                         | CT-05.6, CT-09.3          | ☐                 | —               | ☐                  | —                | —          |
| Teclado                                | CT-04.6, CT-09.4          | —                 | —               | —                  | —                | ☐          |
| Rede lenta e falha de imagem           | CT-02.4, CT-02.5, CT-09.7 | —                 | —               | —                  | —                | ☐          |
| Estados por data                       | CT-07.7                   | —                 | —               | —                  | —                | ☐          |
| Confirmar presença e Como chegar       | CT-07.5, CT-07.6          | ☐                 | ☐               | ☐                  | ☐                | ☐          |
| Formulário e planilha                  | CT-11.1 a CT-11.5         | ☐                 | —               | ☐                  | —                | ☐          |
| Prévia do link                         | CT-10.1                   | ☐                 | —               | ☐                  | —                | —          |

Os estados por data (CT-07.7) e a rede lenta têm teste automático (`?data=` e o carregamento com limites); no
aparelho vale conferir o resultado visual. O iPhone com a chave do modo silencioso ligada (CT-08.6) precisa
ser anotado: o som dos efeitos e do ambiente pode ficar mudo no navegador do WhatsApp, e isso é aceito.

## Critério de liberação

O convite só é enviado quando:

- [ ] Todos os critérios de aceite das histórias Must passam.
- [ ] As colunas "WhatsApp" da matriz estão completas, sem ✗.
- [ ] `pnpm verificar` e `pnpm check` passam e o console não mostra erros no fluxo completo.
- [ ] As metas de tempo e as notas do Lighthouse foram atingidas **com a arte final**.
- [ ] As respostas de teste foram apagadas do formulário e da planilha ([confirmação](./confirmacao-de-presenca.md)).
- [ ] Isabella aprovou o convite publicado, no próprio celular.

## Acompanhamento depois do envio

| Quando             | O que conferir                                               |
| ------------------ | ------------------------------------------------------------ |
| No dia do envio    | Prévia do link e as primeiras respostas chegando na planilha |
| Uma vez por semana | O site no ar e o resumo da planilha com o casal              |
| 01/01/2027         | Formulário fechado e botão substituído pelo aviso no convite |
| 22/01/2027         | "É hoje! Nos vemos às 17h."                                  |
| 23/01/2027         | Mensagem de agradecimento no lugar da contagem               |

## Questões em aberto

- Quais aparelhos reais estão disponíveis (o seu, o da sua esposa, o dos noivos).
- Se o Lighthouse ficar abaixo da meta com a arte final, aceitar ou reduzir a qualidade das camadas maiores (céu e árvores).
