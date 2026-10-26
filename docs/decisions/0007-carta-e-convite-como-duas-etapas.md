# ADR-0007 · Carta e convite como duas etapas de um mesmo DOM

- **Status:** aceita em 2026-10-26
- **Contexto:** a SPEC-06 descreve o envelope (`tlCarta`) e a abertura (`tlConvite`) como duas
  timelines e a carta como HTML presente desde o carregamento, inerte até abrir. O orquestrador
  (ADR-0004) espera uma `Cena` por etapa, e as duas timelines compartilham elementos e estado
  (origem da abertura, envelope, carta).

## Decisão

1. **`criarCartaEConvite` devolve duas cenas** (`carta` e `convite`) que dividem um único conjunto
   de elementos e o estado de "aberta". A etapa `carta` resolve quando o convidado toca no selo ou
   `duracoes.esperaSelo` (4 s) depois do pouso, o que vier primeiro; a etapa `convite` emite
   `carta:abrindo` com a origem e roda os 7 s da abertura. A fase `aguardando-selo` é avançada pela
   própria cena (ADR-0004).
2. **A carta nasce no DOM na `init()`**, dentro de `<main class="conteudo">` com `inert`, invisível
   e com a página sem rolagem (`overflow: hidden`), até `convite:aberto` (ou 6 s, quando a rolagem é
   liberada). Ela é gerada por `montarCarta(content.carta)`, nunca escrita à mão. O `<noscript>`
   estático e a geração em build ficam para a SPEC-09.
3. **As informações rolam abaixo da carta, no mesmo `.conteudo`:** a cena final recebe um `destino`
   (o `.conteudo` criado pela carta), de modo que o modo de segurança (`skip()` em tudo) mostra
   carta e informações juntas.
4. **O envelope usa uma "carta dobrada" própria**, um retângulo atrás das imagens do envelope que
   sobe pela abertura; a carta real aparece desdobrando (escala vertical a partir do topo) quando ela
   desaparece. Evita animar o layout da carta real (RNF-06.2).
5. **A cena sobe 18% da altura por `transform`**; a faixa da base que fica à mostra é preenchida por
   `.convite__chao` (token `--cor-chao`), que precisa ser ajustado com a arte final do primeiro plano.
6. **A visita é registrada por um caso de uso** (`registrarVisita`): `convite:aberto` →
   `estado.marcarVisitado()` → `convite:visitado`. É isso que liga "Pular para o convite" (SPEC-02) e
   desliga a dica da história (SPEC-05) a partir da segunda abertura.
7. **Pétalas em duas direções**: `soltarPetalas` (sobem, SPEC-04) e `chuvaDePetalas` (caem), com a
   mesma regra de só usar as variações já carregadas.

## Consequências

- A etapa `carta` não conhece a `convite` (só dividem estado dentro da mesma fábrica); o orquestrador
  continua sem saber de envelope nem de selo.
- Trocar a arte (envelope, selo, papel, casal) é só atualizar `config.imagens`; os ajustes finos
  (posição do selo, do casal, cor do chão) estão em variáveis CSS e no token `--cor-chao`.
- O texto da carta existe uma única vez, em `content.carta`, e é conferido palavra por palavra contra o
  documento de requisitos nos testes de integração.
