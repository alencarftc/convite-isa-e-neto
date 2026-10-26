# ADR-0001 · TypeScript e clean architecture em monolito

- **Status:** aceita em 2026-10-26
- **Contexto:** a documentação original (Claude Docs, v0.2) propõe "HTML, CSS e JavaScript" em Vite, com
  arquivos soltos em `src/` (`audio.js`, `countdown.js`, `preload.js`…). O pedido para o repositório
  foi: Vite, **monolito com clean architecture**, e gates de qualidade fortes (testes de unidade,
  integração e arquitetura, lint, formatação, commitlint, changesets, build e type-check).

## Decisão

1. **TypeScript estrito** no lugar de JavaScript puro. Os contratos da SPEC-01 (`Cena`, eventos,
   `config`, `content`) viram tipos verificados em tempo de compilação, e o `type-check` vira um gate.
2. **Clean architecture** com quatro camadas (`domain`, `application`, `infrastructure`,
   `presentation`), mais `config` e a raiz de composição `main.ts`. Regras em
   [arquitetura.md](../arquitetura.md), aplicadas por dependency-cruiser e ESLint.
3. O monolito continua **um único bundle** estático, sem framework de interface (RNF-01.1) e com GSAP
   como única biblioteca de animação.

## Como ler a documentação espelhada

| A documentação diz                                   | No repositório vale                                                               |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `content.js`, `config.js`, qualquer `.js` de `src/`  | o equivalente `.ts` (`src/config/content.ts`, `src/config/config.ts`)             |
| `src/countdown.js`, `src/audio.js`, `src/preload.js` | módulos nas camadas certas (tabela "Onde cada spec vai morar")                    |
| `src/scenes/`, `src/styles/`                         | `src/presentation/scenes/` (cenas) e `src/styles/`                                |
| `npm install`, `npm run …`                           | `pnpm install`, `pnpm …` ([ADR-0002](./0002-pnpm-e-node-22.md))                   |
| `vite.config.js`                                     | `vite.config.ts`                                                                  |
| `npm run verificar` + `scripts/verificar.mjs`        | `pnpm verificar` + `scripts/verificar.ts`                                         |
| Vite "proposta"                                      | **Vite 8 confirmado**; a biblioteca de áudio segue em aberto (Howler.js proposto) |

O contrato de cada spec (comportamento, tempos, requisitos, casos de teste) **não muda**: só a forma
de organizar o código.

## Consequências

- O domínio e os casos de uso são testáveis sem navegador e rodam em milissegundos.
- Trocar Howler por Web Audio, ou o relógio, é trocar um adaptador na raiz de composição.
- Há mais arquivos pequenos do que no desenho original; em troca, qualquer violação de camada falha
  no CI.
- As specs com código-exemplo em JS continuam válidas como referência de comportamento; ao
  implementar, traduza para as camadas.
