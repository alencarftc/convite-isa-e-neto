---
description: Agrupa as mudanças e cria commits Conventional Commits válidos (português, até 72 colunas)
allowed-tools: Bash(git status*), Bash(git diff*), Bash(git log*), Bash(git add *), Bash(git commit *), Bash(pnpm *)
---

Crie os commits das mudanças atuais.

1. `git status` e `git diff` para entender o que mudou; `git log -5 --oneline` para acompanhar o estilo.
2. Separe em commits **lógicos** (uma mudança por commit). Misturou formatação, dependência e feature?
   Divida.
3. Mensagem: `<tipo>(<escopo>): <assunto>`; tipos `feat fix docs style refactor perf test build ci chore
revert`; escopos `domain application infra presentation scenes audio content config styles assets
docs deps build ci tooling tests release`; assunto no presente, sem ponto final, até 72 colunas. Corpo
   (opcional) explica o porquê, linhas de até 100 colunas. Quebra: `!` + `BREAKING CHANGE:`. Cite
   `Refs: SPEC-xx, US-xx.y` quando houver.
4. Confirme que há um changeset (`.changeset/*.md`) para mudanças de comportamento; se faltar, crie com
   `pnpm changeset`.
5. Faça o commit **sem** `--no-verify`. Se o hook falhar, corrija a causa e crie um commit novo.
6. Termine ao final da mensagem com o trailer de coautoria indicado pelo ambiente, se houver.

Não faça `git push`.
