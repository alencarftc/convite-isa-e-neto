# src/domain

Regras puras do convite: datas, contagem, fases, eventos, tipos de `config` e `content`.

- **Só importa `domain`.** Nada de DOM, GSAP, Howler, Node, `window`, `localStorage`, timers.
- **Determinístico:** sem `Date.now()` nem `Math.random()`; o instante entra por parâmetro (`agora: number`).
- Datas em ms; sempre com fuso explícito (`analisarInstante`); dia civil = `diaEmBrasilia` (UTC−3).
- Funções pequenas e puras, nomes em português, tipos `readonly`. Erros só para entrada inválida
  (`RangeError`), nunca para fluxo normal.
- Teste ao lado (`x.test.ts`), cobertura mínima **95%** (ramos 90%). Cite o caso da spec: `// CT-07.7`.
- Violou? `pnpm arch` e o ESLint (`no-restricted-globals`) falham. Veja `docs/arquitetura.md`.
