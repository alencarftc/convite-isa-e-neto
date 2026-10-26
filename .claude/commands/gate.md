---
description: Roda todos os gates de qualidade (pnpm check), diagnostica a primeira falha e corrige
allowed-tools: Bash(pnpm *), Read, Edit, Grep, Glob
---

Rode `pnpm check` e relate o resultado real de cada etapa (formato, lint, css, tipos, arquitetura,
testes com cobertura, build, tamanho).

Se algo falhar:

1. Identifique a **primeira** falha e a causa raiz (leia o arquivo e a regra violada; não silencie com
   `eslint-disable`, `@ts-ignore` ou baixando limites de cobertura).
2. Corrija na camada certa (ver `docs/arquitetura.md`). Violação de arquitetura se resolve movendo o
   código ou criando uma porta, nunca afrouxando `.dependency-cruiser.cjs`.
3. Rode só o gate que falhou para confirmar e depois `pnpm check` completo.

Termine dizendo o que passou, o que corrigiu e o que ficou pendente. Não faça commit.
