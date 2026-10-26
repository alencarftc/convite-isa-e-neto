# Instruções para o GitHub Copilot

As instruções completas estão em [`AGENTS.md`](../AGENTS.md); leia-o antes de sugerir código. Resumo:

- Projeto: convite de casamento (Vite 8 + TypeScript estrito + GSAP). Gerenciador: **pnpm** (nunca npm/yarn).
- Clean architecture: `domain` ← `application` ← `infrastructure` / `presentation`; só `src/main.ts`
  liga as camadas. `presentation` nunca importa `infrastructure`; `domain` e `application` não usam
  DOM, `window`, `localStorage` nem `Date.now()` (use as portas).
- Identificadores e comentários em **português**; arquivos em kebab-case.
- Sem texto, cor, tempo ou link no código das cenas: `src/config/content.ts`, `src/config/config.ts`,
  `src/styles/tokens.css`.
- Datas com fuso `-03:00`; use `analisarInstante` e `diaEmBrasilia`.
- Commits: Conventional Commits em português, até 72 colunas, escopos
  `domain application infra presentation scenes audio content config styles assets docs deps build ci tooling tests release`.
- Antes de concluir: `pnpm check`.
