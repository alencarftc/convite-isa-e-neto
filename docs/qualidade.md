# Qualidade, gates e fluxo de trabalho

Tudo roda com **pnpm** (versão fixa em `packageManager`) e **Node ≥ 22.12**. Rode `pnpm check` antes de
abrir PR: é exatamente o que o CI roda.

## Gates

| Comando                 | O que garante                                                                                                                                                                                                                                                                                  | Hook / CI                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `pnpm format:check`     | Prettier: formatação única (`pnpm format` corrige)                                                                                                                                                                                                                                             | CI · lint-staged (corrige) |
| `pnpm lint`             | ESLint estrito com tipos (`strictTypeChecked`), imports ordenados, pureza do domínio                                                                                                                                                                                                           | CI · lint-staged           |
| `pnpm lint:css`         | Stylelint: BEM, sem cor/`z-index` fora de `tokens.css`                                                                                                                                                                                                                                         | CI · lint-staged           |
| `pnpm typecheck`        | `tsc --noEmit` com `strict` e flags extras                                                                                                                                                                                                                                                     | CI · pre-push              |
| `pnpm arch`             | dependency-cruiser: regras entre camadas, sem ciclos, sem pacote não declarado                                                                                                                                                                                                                 | CI · pre-push              |
| `pnpm test`             | Vitest: unidade + integração + arquitetura                                                                                                                                                                                                                                                     | CI · pre-push              |
| `pnpm test:coverage`    | Idem, com limites: global 85%/80% (ramos); `domain` e `application` 95%/90%                                                                                                                                                                                                                    | CI                         |
| `pnpm build`            | `vite build` (base relativa para o GitHub Pages)                                                                                                                                                                                                                                               | CI                         |
| `pnpm size`             | Orçamento da SPEC-12: JS ≤ 120 kB gzip, HTML ≤ 30 kB                                                                                                                                                                                                                                           | CI                         |
| `pnpm verificar`        | Gate de **publicação**: sem texto pendente `[…]`, datas `-03:00` e coerentes com os textos, links https, endereço publicado completo, sem serviço externo, sem arte provisória, arquivos existem e dentro do orçamento de peso por arquivo e por grupo (crítico ≤ 1,45 MB, experiência ≤ 8 MB) | antes de publicar          |
| `publicar.yml` (CI)     | A cada envio para `main`: `verificar` + `check` + publicação no GitHub Pages (SPEC-10)                                                                                                                                                                                                         | automático                 |
| `pnpm fontes`           | Copia os WOFF2 dos pacotes `@fontsource` para `public/fonts/` (ADR-0006)                                                                                                                                                                                                                       | ao trocar versão da fonte  |
| `pnpm arte:provisoria`  | Regera os SVGs provisórios em `public/assets/provisorio/` (ADR-0006)                                                                                                                                                                                                                           | ao mudar o enquadramento   |
| `pnpm changeset:status` | O PR traz changeset                                                                                                                                                                                                                                                                            | CI (só em PR)              |
| commitlint              | Conventional Commits (ver abaixo)                                                                                                                                                                                                                                                              | commit-msg · CI            |

`pnpm check` = `format:check` → `lint` → `lint:css` → `typecheck` → `arch` → `test:coverage` → `build` → `size`.

`pnpm verificar` não está no `check` de propósito: enquanto o verso do louvor e as fotos estiverem
pendentes ele **deve** falhar; é a trava de "não envie ainda" (SPEC-12, SPEC-10).

### Hooks locais (Husky)

- `pre-commit`: `lint-staged` corrige e formata só o que mudou.
- `commit-msg`: `commitlint` valida a mensagem.
- `pre-push`: `typecheck` + `arch` + `test`.

Não use `--no-verify`. Se um hook falhar, conserte a causa.

## Testes

| Tipo        | Onde                                       | Ambiente  | O que testa                                                                |
| ----------- | ------------------------------------------ | --------- | -------------------------------------------------------------------------- |
| Unidade     | `src/**/*.test.ts`, `scripts/**/*.test.ts` | node      | domínio, casos de uso (portas falsas), adaptadores, regras do `verificar`  |
| Integração  | `tests/integration/*.test.ts`              | happy-dom | camadas reais conectadas (config + caso de uso + relógio + DOM), `main.ts` |
| Arquitetura | `tests/architecture/*.test.ts`             | node      | o código real respeita as camadas; fixtures provam que as regras disparam  |

Convenções: nome do teste descreve o comportamento em português; um teste cita o caso da spec quando
existe (`// CT-07.7`); relógio e armazenamento sempre por porta/falsa, nunca `Date.now()` real;
`vi.useFakeTimers()` para minutos. Escolha rápida: `pnpm test:unit`, `pnpm test:integration`,
`pnpm test:arch`, `pnpm test:watch`.

Os testes em aparelhos reais (matriz da SPEC-12, abrindo pelo WhatsApp) continuam manuais e estão em
[specs/SPEC-12](./specs/SPEC-12-desempenho-e-qualidade.md).

## Dev server

- **Sempre na porta 5173** (`vite.config.ts` usa `strictPort: true`: se estiver ocupada, falha em vez
  de subir em outra). Comece com `pnpm dev`; para testar no celular, `pnpm dev:rede`.
- O servidor fica **ligado durante o trabalho**. Em sessões do Claude Code ele sobe pelo
  `.claude/launch.json` (configuração `dev`), o que dá acesso ao log do Vite, ao console e à página.
  Antes de subir outro, confira se já existe um na 5173.
- Data simulada (só em dev): `http://localhost:5173/?data=2027-01-22T10:00`.
- `pnpm preview` serve o build na 4173.

## Commits

Seguimos [Conventional Commits 1.0](https://www.conventionalcommits.org/pt-br/v1.0.0/), em português,
validados pelo commitlint (`commitlint.config.js`). A mensagem de cada commit — e o **título do PR**,
que vira o commit no squash merge — tem o formato:

```text
<tipo>(<escopo>): <assunto>

<corpo opcional: o porquê, linhas de até 100 colunas>

<rodapé opcional: BREAKING CHANGE, Refs, Co-Authored-By>
```

**Regras**

- Cabeçalho com até **72 colunas**, assunto no presente ("adiciona", "corrige", "remove"), em
  minúsculas quando possível, **sem ponto final**.
- Uma mudança lógica por commit; commits pequenos e que passam no `pnpm check`.
- Corpo explica o **porquê**; o diff já mostra o como. Linha em branco antes do corpo e do rodapé.
- Quebra de compatibilidade: `!` depois do tipo/escopo **e** `BREAKING CHANGE:` no rodapé.
- Referencie a spec ou história no rodapé: `Refs: SPEC-07, US-07.1`.
- Não reescreva commits já enviados; não use `--no-verify`.

**Tipos**

| Tipo       | Quando                                                | Changeset sugerido   |
| ---------- | ----------------------------------------------------- | -------------------- |
| `feat`     | capacidade nova para o convidado ou para o mantenedor | minor                |
| `fix`      | correção de comportamento                             | patch                |
| `perf`     | melhora de desempenho sem mudar comportamento         | patch                |
| `refactor` | reorganiza código sem mudar comportamento             | patch / vazio        |
| `docs`     | só documentação                                       | vazio                |
| `style`    | formatação, sem mudar código                          | vazio                |
| `test`     | só testes                                             | vazio                |
| `build`    | dependências, Vite, pnpm                              | vazio / patch        |
| `ci`       | workflows, hooks                                      | vazio                |
| `chore`    | manutenção que não cabe nos outros                    | vazio                |
| `revert`   | desfaz um commit (`revert: …` + o hash no corpo)      | conforme o revertido |

**Escopos** (obrigatoriamente um destes, ou nenhum): `domain`, `application`, `infra`, `presentation`,
`scenes`, `audio`, `content`, `config`, `styles`, `assets`, `docs`, `deps`, `build`, `ci`, `tooling`,
`tests`, `release`.

**Exemplos**

```text
feat(scenes): adiciona baú e chave com abertura em 2 s
fix(domain): corrige o dia do casamento na virada de 21 para 22/01
perf(assets): reduz o céu baunilha para 300 KB
refactor(application)!: troca Relogio.agora por Relogio.instante

BREAKING CHANGE: adaptadores de relógio precisam implementar instante().

docs: espelha as specs 08 a 12 do Claude Docs
build(deps): atualiza gsap para 3.15.0
ci: roda o commitlint no título do PR
```

Há um modelo de mensagem em `.gitmessage` (`git config commit.template .gitmessage`).

## Changesets e lançamento

Cada PR traz um changeset (`pnpm changeset`; `pnpm changeset --empty` quando não muda comportamento).
Ele descreve a mudança em uma frase, do ponto de vista de quem usa o convite.

Para lançar (SPEC-10, procedimento de lançamento):

1. `pnpm version-packages` — consome os changesets, sobe a versão e atualiza o `CHANGELOG.md`.
2. Revise e faça o commit: `chore(release): versão 1.0.0`.
3. `pnpm verificar` e a matriz de testes da SPEC-12 completos.
4. `pnpm release:tag` — cria a tag `v1.0.0` (`git push --follow-tags`).

## Dependências

- Versões **exatas** (`save-exact=true`); o `pnpm-lock.yaml` é versionado e o CI usa `--frozen-lockfile`.
- Scripts de instalação só rodam para o que está em `pnpm.onlyBuiltDependencies` (hoje: `esbuild`).
- O `typescript` fica em 6.0.x porque o `typescript-eslint` ainda não aceita 7; o `lint-staged` fica
  em 16.x por exigência de Node. Ao atualizar, rode `pnpm check` inteiro.
- O Dependabot abre PRs semanais já com prefixo `build(deps)`.

## Arquivos de ignore

| Arquivo               | Para quê                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `.gitignore`          | `node_modules`, `dist`, `coverage`, `reports`, `.env*`, arquivos pessoais do Claude e do editor |
| `.gitattributes`      | força LF e marca binários (`webp`, `mp3`, `woff2`…) para o Git não tentar mesclar               |
| `.prettierignore`     | não reformata `pnpm-lock.yaml`, saídas de build e o **espelho fiel** da documentação em `docs/` |
| `eslint.config.js`    | `globalIgnores`: `dist`, `coverage`, `reports`, `docs`, `.changeset`                            |
| `.stylelintignore`    | `dist`, `coverage`, `reports`                                                                   |
| `.cursorignore`       | mantém lockfile, binários e saídas fora do contexto de ferramentas de IA                        |
| `.claude/launch.json` | (não é ignore) configuração `dev` do servidor na 5173 para o Claude Code                        |
