# ADR-0033 · O carrossel passa a usar as fotos do ensaio

- **Status:** aceita em 2026-11-09
- **Contexto:** o casal atualizou a pasta `fotos/` (ao lado de `src/`, fora do repositório) com cinco fotos do ensaio, todas de
  branco, e pediu que as fotos usadas no convite fossem trocadas pelas remanescentes. Em seguida pediu a ordem: a terceira
  passa a ser a primeira e a segunda, a última. O carrossel da [ADR-0027](./0027-carrossel-dica-do-bau-role-para-ler-e-petalas-infinitas.md)
  (nascido da mini-galeria da [ADR-0025](./0025-mini-galeria-do-casal.md)) tinha seis fotos.

## O que mudou

| Peça     | Mudança                                                                                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fotos    | `public/photos/galeria-1.webp` a `galeria-5.webp`; a `galeria-6.webp` saiu. Lado maior de 900 px (era 800), WebP de qualidade 80, de 18 a 43 kB cada (limite de 110 kB em `orcamento.ts`). Nenhuma tinha orientação EXIF, nenhuma foi girada nem recortada.                                            |
| Ordem    | 1) preto e branco, de mãos dadas; 2) abraço sorrindo para a câmera; 3) beijo no rosto na passarela com folhagem; 4) ele olhando para ela no beco; 5) beijo no rosto no beco de paredes antigas. É a ordem dos arquivos da pasta (`…05`, `…08`, `…07 (4)`, `…09`, `…09 (2)`) depois do pedido do casal. |
| Conteúdo | `content.galeria` com cinco entradas: caminho, texto alternativo e tamanho do arquivo. Os textos alternativos são novos e descrevem cada cena; revisar com o casal.                                                                                                                                    |
| Teste    | `carrossel.test.ts` fixava a sequência de seis fotos (`[1, 2, 3, 4, 5, 0]`); agora a volta é derivada de `content.galeria.length`, e a quantidade de fotos pode mudar sem quebrar o teste.                                                                                                             |

Conferido no Chrome a 375 × 812: as cinco fotos carregam com o tamanho esperado, entram na ordem acima, as em pé ficam inteiras
e as deitadas ficam centralizadas sobre o próprio fundo desfocado, sem cortar rosto.

## Consequências

- O convite carrega menos: cinco fotos de uns 170 kB no total, em vez de seis de uns 300 kB.
- As fotos antigas (selfies e o pedido na praia) continuam no histórico do Git, mas não estão mais no convite.
- As cinco fotos dos balões, que não existem mais como balões desde a [ADR-0026](./0026-memorias-em-luz-no-lugar-dos-baloes.md),
  seguem sem foto (`foto-pendente` no `pnpm verificar`): estas fotos são só do carrossel.
