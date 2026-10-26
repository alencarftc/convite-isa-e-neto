## O que muda e por quê

<!-- Uma ou duas frases. Cite a spec/história: SPEC-07, US-07.1. -->

## Checklist

- [ ] O título do PR segue Conventional Commits (`feat(scenes): adiciona baú e chave`); ele vira o commit no squash merge
- [ ] `pnpm check` passa localmente
- [ ] Há um changeset (`pnpm changeset`; use `--empty` se não muda comportamento)
- [ ] Textos novos estão em `src/config/content.ts` e batem com `docs/requisitos.md`
- [ ] Mudou decisão, spec ou arquitetura? `docs/` e o Claude Docs de origem foram atualizados
- [ ] Testado no celular (`pnpm dev:rede`), se mexe em cena, áudio ou toque

## Como testar

<!-- Passos, ou `?data=2027-01-22T10:00` para simular a data. -->
