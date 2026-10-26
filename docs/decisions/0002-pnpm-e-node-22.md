# ADR-0002 · pnpm e Node 22

- **Status:** aceita em 2026-10-26
- **Contexto:** a documentação original usa `npm`. O pedido foi trocar para **pnpm**.

## Decisão

- Gerenciador: **pnpm 10.34.x**, fixado em `packageManager` (o pnpm instalado troca para essa versão
  sozinho). Não existe `package-lock.json`; o lockfile é `pnpm-lock.yaml`.
- Runtime: **Node ≥ 22.12** (`engines`, `.nvmrc` = 22). Vitest 5, commitlint 21, changesets 3 e
  dependency-cruiser 18 exigem Node 22+. A documentação original dizia "Node 20 ou mais novo"; isso
  deixou de valer.
- Versões exatas (`save-exact=true`), `engine-strict=true` e scripts de instalação só para
  `esbuild` (`pnpm.onlyBuiltDependencies`).
- Todos os comandos, hooks e workflows usam `pnpm`; o CI instala com `--frozen-lockfile`.

## Consequências

- Instalação mais rápida e `node_modules` estrito (sem dependência fantasma), o que combina com a regra
  `sem-dependencia-nao-declarada` do dependency-cruiser.
- Quem clonar precisa de Node 22+ e do pnpm (`corepack enable` ou `npm i -g pnpm`).
