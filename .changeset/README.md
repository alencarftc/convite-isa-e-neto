# Changesets

Toda mudança que altera o comportamento do convite (ou a forma de construí-lo) leva um changeset.

```bash
npm run changeset
```

Escolha o tipo da mudança e escreva uma frase em português, do ponto de vista de quem usa ou mantém o
convite:

- `patch`: correção, ajuste de texto, de tempo ou de asset.
- `minor`: capacidade nova (uma cena, um caminho alternativo, um gate de qualidade).
- `major`: mudança que quebra algo combinado (por exemplo, o formato de `content.ts`).

Commits que só mexem em documentação, testes ou configuração de ferramentas podem usar
`npm run changeset -- --empty`.

O CI roda `npm run changeset:status` nos pull requests e falha se não houver changeset.
O fluxo de lançamento está em [`docs/qualidade.md`](../docs/qualidade.md).
