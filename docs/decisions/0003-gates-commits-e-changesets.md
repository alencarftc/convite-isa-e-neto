# ADR-0003 · Gates de qualidade, Conventional Commits e changesets

- **Status:** aceita em 2026-10-26
- **Contexto:** o convite tem prazo curto (pronto em 10/11/2026, envio até 15/11) e **não pode ser
  corrigido com calma depois do envio**: o WhatsApp guarda a prévia do link e as famílias já terão
  aberto o convite. Erros precisam ser pegos antes da publicação.

## Decisão

1. **Um conjunto de gates automáticos** (formatação, lint, estilo, tipos, arquitetura, testes com
   cobertura, build, orçamento de peso), rodando em hooks locais e no CI com os mesmos comandos
   (`pnpm check`). Detalhes em [qualidade.md](../qualidade.md).
2. **Conventional Commits em português**, validados por commitlint no `commit-msg` e, no CI, nos
   commits e no título do PR (squash merge). Escopos fechados, cabeçalho até 72 colunas.
3. **Changesets** em todo PR: o histórico de versões do convite sai do `CHANGELOG.md`, e `v1.0` é a
   tag do envio (SPEC-10).
4. **Dois níveis de verificação:** `pnpm check` (código) e `pnpm verificar` (publicação: texto
   pendente, datas, links). O segundo falha de propósito enquanto houver pendências de conteúdo.
5. **Dev server fixo na 5173** (`strictPort`), sempre ligado durante o trabalho.

## Consequências

- Nenhum commit entra com formatação ou tipo quebrado; nenhum PR entra sem teste verde.
- O fluxo é mais cerimonioso para mudanças pequenas; `changeset --empty` e o `lint-staged`
  reduzem o atrito.
- A cobertura mínima de 95% em `domain` e `application` protege as regras mais sensíveis (datas,
  fuso, estados), onde um erro seria visível a todos os convidados.
