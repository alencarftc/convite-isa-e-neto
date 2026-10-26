# tests

Testes que cruzam camadas. Testes de unidade ficam **ao lado do código** (`src/**/x.test.ts`).

- `integration/`: camadas reais conectadas (config + caso de uso + adaptador + DOM em happy-dom),
  e a fumaça do `main.ts`. Tempo com `vi.useFakeTimers()`; relógio por `criarRelogio` ou falso.
- `architecture/`: roda o dependency-cruiser sobre `src` e `scripts` e sobre `fixtures/`, que violam
  cada regra de propósito. **Nunca importe de `fixtures/`.** Regra nova = fixture nova + asserção.
- Nome do teste descreve o comportamento em português; cite o caso da spec quando existir.
- Rodar: `pnpm test:integration`, `pnpm test:arch`, `pnpm test` (tudo) ou `pnpm test:coverage`.
