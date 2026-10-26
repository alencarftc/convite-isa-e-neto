# Convite · Isabella & David

Convite digital interativo do casamento de **Isabella Vaz e David Neto**, em 22/01/2027, às 17h, no
Sítio Olinda (Benevides–PA). Site estático de página única enviado por WhatsApp: um bosque pintado, um
baú com chave, balões com a história do casal, um envelope com selo e a carta com o convite.

Repositório: <https://github.com/alencarftc/convite-isa-e-neto>

## Começando

Requisitos: **Node ≥ 22.12** e **pnpm** (`corepack enable`, ou `npm i -g pnpm`).

```bash
pnpm install
pnpm dev          # http://localhost:5173 (porta fixa)
```

Testar no celular, na mesma rede Wi-Fi: `pnpm dev:rede`.
Simular a data (só em desenvolvimento): `http://localhost:5173/?data=2027-01-22T10:00`.

## Scripts

| Comando                                                                        | Faz                                                                 |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `pnpm dev` · `pnpm dev:rede` · `pnpm preview`                                  | servidor de desenvolvimento (5173) · na rede · serve o build (4173) |
| `pnpm build`                                                                   | gera `dist/` (base relativa, pronto para o GitHub Pages)            |
| `pnpm check`                                                                   | **todos os gates** (o mesmo que o CI roda)                          |
| `pnpm test` · `test:unit` · `test:integration` · `test:arch` · `test:coverage` | testes (Vitest)                                                     |
| `pnpm lint` · `lint:css` · `typecheck` · `format:check` · `arch` · `size`      | gates individuais                                                   |
| `pnpm lint:fix` · `pnpm format`                                                | corrigem lint e formatação                                          |
| `pnpm verificar`                                                               | gate de publicação (texto pendente, datas, links)                   |
| `pnpm changeset` · `pnpm version-packages`                                     | changesets e versão                                                 |

## Como o código está organizado

Monolito em **clean architecture**: `domain` ← `application` ← `infrastructure` / `presentation`, com
`src/main.ts` como raiz de composição. As regras são verificadas por testes de arquitetura.

```text
src/
├── domain/ · application/ · infrastructure/ · presentation/ · config/ · styles/
└── main.ts
tests/   integration/ · architecture/
docs/    requisitos, specs, arquitetura, qualidade, decisões
```

## Documentação

Comece por [`docs/README.md`](docs/README.md): índice, mapa "qual documento para qual tarefa" e a
origem de cada arquivo. Para agentes de código: [`AGENTS.md`](AGENTS.md) e [`CLAUDE.md`](CLAUDE.md).

## Contribuindo

- Commits e títulos de PR em **Conventional Commits** (português): `feat(scenes): adiciona baú e chave`.
- Todo PR traz um **changeset** (`pnpm changeset`).
- `pnpm check` precisa passar. Os hooks (Husky) já rodam o essencial a cada commit e push.

Detalhes em [`docs/qualidade.md`](docs/qualidade.md).
