# ADR-0010 · Revisão do código: defeitos encontrados e como foram corrigidos

- **Status:** aceita em 2026-10-26
- **Contexto:** depois das 17 specs implementadas, o código foi lido inteiro (domínio, aplicação,
  infraestrutura, cenas, estilos, scripts e testes) e o convite foi exercitado no navegador, em
  desenvolvimento e no build de produção. Cada achado abaixo foi **reproduzido** antes de ser corrigido e
  ganhou um teste que **falha sem a correção** (conferido desfazendo a correção). Os testes antigos que
  não pegaram o defeito foram corrigidos junto.

## Achados e correções

| #   | Achado (como foi visto)                                                                                                                                                                                                                                   | Correção                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Baú inalcançável por leitor de tela.** O container `.cena` era `aria-hidden` e continha o botão do baú e a dica `aria-live` (botão focável dentro de `aria-hidden`, WCAG 4.1.2).                                                                        | `aria-hidden` sai do container e vai para cada camada decorativa; o espaço `.bau` fica à vista. Teste percorre o fluxo e exige que nada focável esteja escondido do leitor.                                       |
| 2   | **Botão "Avançar a história" fantasma.** Continuava visível, cobrindo a tela e no Tab durante o envelope, a carta e o estado final.                                                                                                                       | A região da história se esconde quando ela termina.                                                                                                                                                               |
| 3   | **Atalho "Ir direto ao convite" fantasma e coberto.** Ficava no Tab no estado final (já sem destino) e, ao receber foco, ficava escondido atrás de "Pular", no mesmo canto.                                                                               | Sai do Tab nos estados finais (como "Pular") e ganha o token `--z-atalho`, acima de `--z-interface`.                                                                                                              |
| 4   | **Foco perdido depois de Pular ou do atalho.** O botão sumia e o foco ia para o início da página.                                                                                                                                                         | O estado final leva o foco ao título da carta, como quem viu a abertura (SPEC-09, RF-09.6).                                                                                                                       |
| 5   | **Pétalas congeladas.** "Pular" no meio da chuva (ou da abertura do baú) deixava as pétalas no DOM; paradas no meio da queda ficariam à vista.                                                                                                            | `removerPetalas` no skip; helpers de pétala compartilhados entre o baú e a carta (`petalas.ts`), e a chuva, que estava a 25% de cobertura, ganhou testes.                                                         |
| 6   | **Selo fora do lugar no Chrome 90 a 103.** `.selo` usava a propriedade `translate`, que o Chrome só entende a partir do 104 (o piso prometido é o 90).                                                                                                    | Posição por `top` e `left`, com a conta explicada (selo quadrado, envelope 3 : 2); um teste barra `translate`, `rotate` e `scale`. Medido: centro do selo exatamente em 50% × 60%.                                |
| 7   | **Plano B que não pega erro de montagem.** A marca de que o pacote iniciou ficava na primeira linha do `main.ts`: um erro ao montar o convite deixava a página parada, sem plano B nem modo de segurança.                                                 | A marca passa para depois da montagem; o script do `<head>` também reage a erro de execução do próprio site (não de extensões). 486 bytes, dentro dos 512.                                                        |
| 8   | **`replace` com texto nos plugins do `index.html`.** `$&` e `$'` do conteúdo seriam lidos como padrões de substituição; e os três plugins nunca tinham sido executados por um teste.                                                                      | Substituição por função e testes dos plugins sobre o `index.html` real, incluindo o caso traiçoeiro.                                                                                                              |
| 9   | **Entrada em tela baixa.** Em 812 × 375 (celular deitado) o selo da entrada empurrava os nomes sobre "Toque para entrar".                                                                                                                                 | Até 560 px de altura o grupo sobe e o selo encolhe. Conferido em 812 × 375, 568 × 320 e 375 × 667.                                                                                                                |
| 10  | **A experiência inteira era baixada antes do toque.** No build de produção, aos 45 ms da abertura as 30 imagens eram pedidas juntas, porque cada cena monta o DOM no `init()` com `<img src>`. Desfazia a SPEC-02 (RF-02.7) e gastava dados de quem pula. | Imagens de etapa (balões, fotos, tampa aberta, envelope, selo do envelope, pétalas) só ganham `src` quando a etapa começa (`data-src`); as fotos entram na fila secundária. A abertura cai de 30 para 16 pedidos. |
| 11  | **Fotos do plano B baixadas mesmo escondidas.** Um `<img loading="lazy">` dentro de um bloco `display: none` era baixado.                                                                                                                                 | O texto simples do plano B guarda as fotos em `data-src`; o script do `<head>` dá o `src` só quando o plano B entra.                                                                                              |
| 12  | **Alternativas em `vh` que faltavam (SPEC-15).** O teste que as cobrava usava `\bdvh\b`, que não casa em `52dvh`.                                                                                                                                         | Alternativas escritas e teste corrigido (commit `fix(styles)`).                                                                                                                                                   |
| 13  | **Rejeição de mídia levava ao modo de segurança.** Qualquer `unhandledrejection`, inclusive `NotAllowedError` do `play()`, derrubava o convite; o som nunca pode ser condição (SPEC-08, RF-08.8).                                                         | `NotAllowedError` e `AbortError` viram aviso de som.                                                                                                                                                              |
| 14  | **Testes que falhavam sob carga.** `vi.waitFor` com 1 s e um teste que contava chamadas do `MutationObserver` (dois balões no mesmo quadro viram uma chamada).                                                                                            | Prazo padrão de 5 s no projeto de integração (`suporte/preparar.ts`) e o teste conta mutações. Três execuções seguidas sem falha.                                                                                 |

## Guardas novas (para o problema não voltar)

- **ESLint** barra, no código que vai ao aparelho, APIs que o piso (Safari/iOS 15.1, Chrome 90) não tem:
  `.at()`, `findLast`, `toSorted`, `Object.hasOwn`, `structuredClone`… O build converte a sintaxe, não as
  APIs. Testes ficam de fora (rodam no Node).
- **`content.ts` × `docs/requisitos.md`:** teste que confere cada texto com "Textos do convite" (regra 4 de
  `docs/README.md`), com as exceções declaradas. O texto novo "Salvar na agenda" é uma delas, até o casal
  aprovar.
- **Teste de abertura:** `composicao.test.ts` exige que, ao abrir, nenhuma imagem de etapa tenha `src`.
- **Verificador de sintaxe do pacote** agora se testa com amostras (não é um teste que sempre passa).
- Consolidação: `criar` e `criarImagem` (quatro e duas cópias) em `presentation/dom.ts`;
  `DESLOCAMENTO_BRASILIA_MS` deixou de existir em dois arquivos.

## Desvios em relação à documentação

- **SPEC-03, RNF-03.3** ("o contêiner da cena tem `aria-hidden`") foi trocado por `aria-hidden` em cada
  camada decorativa: a própria SPEC-04 põe o botão do baú dentro da cena, e a SPEC-09 pede foco nele.
- **SPEC-15, RF-15.6** ("`main.ts` marca na primeira linha") foi trocado por "marca quando a montagem
  terminou": é o que faz o plano B pegar um erro de montagem. O contrato (classe, variável, marca) é o
  mesmo; ver ADR-0009.
- **SPEC-13, RF-13.5** ("quem pulou a história não paga os 600 KB das fotos") só passou a ser verdade com
  o achado 10: antes, os balões já baixavam as fotos na abertura.

## Conhecido e aceito

- O céu do pôr do sol (`ceuPorDoSol`) continua sendo pedido no `init()`, com prioridade baixa, embora a
  SPEC-02 o ponha na fila secundária: o estado final de quem pula também o mostra.
- `unhandledrejection` de outras origens não tem como ser filtrado por arquivo (só o `error` tem
  `filename`): uma rejeição não tratada do próprio site, que não seja de mídia, continua levando ao modo
  de segurança, de propósito.
- Nada disto foi visto em aparelho real: a matriz de `docs/operacao/matriz-de-testes.md` continua valendo.
