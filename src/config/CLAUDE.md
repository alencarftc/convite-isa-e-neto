# src/config

`config.ts` (datas, links, durações, curvas, volumes) e `content.ts` (todos os textos visíveis). São
**dados tipados** pelo domínio (`ConfigConvite`, `ConteudoConvite`); não têm comportamento.

- Só importa tipos de `domain`.
- `content.ts` deve bater, palavra por palavra, com "Textos do convite" em `docs/requisitos.md`.
  Pendência de texto (ex.: verso do louvor) vai entre colchetes `[assim]`: o `pnpm verificar` impede
  a publicação enquanto existir.
- Datas ISO sempre com `-03:00`. Links `https://`. Tempos em segundos.
- Aumentou o `content.ts`? Aumente também o tipo `ConteudoConvite` em `src/domain/conteudo/`.
