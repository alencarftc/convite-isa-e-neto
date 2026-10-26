# AGENTS.md

Instruções para agentes de código (Claude Code, Codex, Cursor, Copilot…) neste repositório. Humanos
também podem ler: é o resumo do que importa antes de mexer.

## O projeto

Convite digital interativo do casamento de **Isabella Vaz e David Neto** (22/01/2027, 17h, Sítio Olinda,
Benevides–PA). Site estático de página única, enviado por WhatsApp (um link por família): uma abertura
cinematográfica de ~30 s num bosque pintado (névoa → baú com chave → 5 balões com fotos → envelope com
selo → carta), depois contagem regressiva, mensagem, dress code, "Confirmar presença" (Google Forms,
até 31/12/2026) e "Como chegar".

**Prazos:** pronto e testado até **10/11/2026**; envio até **15/11/2026**. Depois do envio quase nada
pode mudar (o WhatsApp guarda a prévia do link), então erro tem de ser pego antes: confie nos gates.

**Stack:** Vite 8 · TypeScript estrito · GSAP 3 · Howler.js (proposto) · pnpm 10 · Node ≥ 22.12 ·
Vitest · ESLint · Prettier · Stylelint · dependency-cruiser · Husky · commitlint · Changesets.

## Comandos (sempre `pnpm`, nunca `npm`/`yarn`)

| Comando                                                                     | Faz                                                                                                      |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                                                  | servidor de desenvolvimento em **http://localhost:5173** (porta fixa)                                    |
| `pnpm dev:rede`                                                             | idem, exposto na rede (teste no celular)                                                                 |
| `pnpm check`                                                                | **todos os gates**: formato, lint, css, tipos, arquitetura, testes+cobertura, build, tamanho             |
| `pnpm test` / `test:unit` / `test:integration` / `test:arch` / `test:watch` | Vitest, por projeto                                                                                      |
| `pnpm lint:fix` · `pnpm format`                                             | corrige lint e formatação                                                                                |
| `pnpm arch`                                                                 | regras de dependência entre camadas                                                                      |
| `pnpm verificar`                                                            | gate de **publicação** (texto, datas, links, arte provisória, arquivos); falha enquanto houver pendência |
| `pnpm changeset`                                                            | cria o changeset do PR (`--empty` se não muda comportamento)                                             |

**Dev server:** deve ficar ligado na **5173** (`strictPort`). Se já estiver rodando, reutilize; não suba
outro. No Claude Code ele sobe por `.claude/launch.json` (config `dev`), o que dá acesso ao log do Vite
e ao console do navegador.

## Arquitetura (clean architecture, monolito)

```
domain  ←  application  ←  infrastructure
                       ←  presentation          main.ts conhece todas; ninguém conhece main.ts
config → domain (só tipos)
```

- `domain`: regras puras (datas, contagem, fases, eventos). Sem DOM, sem GSAP, sem Howler, sem `Date.now()`.
- `application`: casos de uso (fábricas que recebem portas), `ports/`, barramento de eventos.
- `infrastructure`: adaptadores das portas (relógio, localStorage, e futuramente áudio e preload).
- `presentation`: cenas, DOM, CSS, GSAP. Recebe as portas por `ctx`; **nunca** importa `infrastructure`.
- `main.ts`: único lugar que instancia adaptadores e liga as camadas.

As regras são executáveis (`pnpm arch`, `tests/architecture/`). Detalhes e receitas:
[docs/arquitetura.md](docs/arquitetura.md).

## Convenções de código

- **Português** em identificadores, comentários e mensagens (`calcularContagem`, `obterInformacoes`);
  pastas de camada e nomes de arquivo em inglês/kebab-case (`contagem-regressiva.ts`).
- Imports: relativo dentro da camada; `@/…` entre camadas. A ordem é automática (ESLint).
- **Nenhum** texto visível, duração, link ou cor no código das cenas: texto em `src/config/content.ts`,
  tempo/link em `src/config/config.ts`, cor/fonte/camada em `src/styles/tokens.css`. O Stylelint barra
  hex, `rgb()` e `z-index` numérico fora dos tokens.
- Tempos em **segundos** (como no GSAP), lidos de `config.duracoes`; datas sempre com fuso **-03:00**
  (Brasília). Nunca dependa do fuso do aparelho.
- Anime só `transform` e `opacity`. Todo texto é HTML real. Botões com ≥ 44 px (principais 48 px).
- TypeScript: sem `any`, sem `enum`, `import type` para tipos, sem `!` fora de testes.
- Sem comentários óbvios; comente o **porquê** e cite a spec/RF quando decidir algo (`// SPEC-07, RF-07.3`).

## Fluxo de trabalho

1. **Leia antes de codar:** a spec do épico em `docs/specs/` e as histórias/critérios de aceite em
   `docs/epicos-e-historias.md`. O mapa "qual doc para qual tarefa" está em [docs/README.md](docs/README.md).
2. **Teste primeiro** quando for regra de domínio/aplicação (cobertura mínima 95% nessas camadas).
   Cite o caso da spec no teste (`// CT-07.7`).
3. Implemente na camada certa. Regra nova de negócio → `domain`; orquestração → `application`;
   tudo que toca navegador/biblioteca → `infrastructure` ou `presentation`.
4. Rode `pnpm check` e deixe verde. Cena nova: confira no navegador (5173) e no celular (`dev:rede`).
5. **Commits:** Conventional Commits em português, até 72 colunas, escopo da lista
   (`domain application infra presentation scenes audio content config styles assets docs deps build ci tooling tests release`).
   Ex.: `feat(scenes): adiciona baú e chave`. Quebra: `!` + `BREAKING CHANGE:`. Guia: [docs/qualidade.md](docs/qualidade.md#commits).
6. Todo PR traz um **changeset**. Não use `--no-verify`; se um hook falhar, conserte a causa.
7. Mudou decisão técnica? Escreva um ADR em `docs/decisions/`. Mudou spec/texto? Atualize o Claude Docs
   (fonte da verdade) e o espelho em `docs/`.

## Não faça

- Não adicione dependência sem necessidade: o bundle tem orçamento (JS ≤ 120 kB gzip; crítico ≤ 1,8 MB).
- Não importe `infrastructure` na `presentation`, nem DOM/biblioteca no `domain`/`application`.
- Não escreva texto do convite "de cabeça": copie de `docs/requisitos.md` ("Textos do convite").
  Não reproduza letra de música (o verso do louvor é pendência do casal).
- Não use fonte, imagem ou som de fora do que a documentação define; assets são gerados/licenciados.
- Não bloqueie zoom, não autoexecute áudio antes do toque de entrada, não ignore `prefers-reduced-motion`.
- Não reformate nem edite à mão os espelhos em `docs/` (requisitos, documentacao, epicos, specs) sem
  atualizar a fonte; eles estão no `.prettierignore` de propósito.
- Não faça `git push --force`, `reset --hard` nem commits que pulem hooks.

## Pegadinhas

- Datas: use `analisarInstante` (exige fuso explícito) e `diaEmBrasilia`; `Date` local do aparelho é bug.
- Navegadores só liberam áudio após um gesto: o toque de "Toque para entrar" é o gatilho (SPEC-02/08).
- O WhatsApp abre o link no navegador interno do app (iOS/Android); `localStorage` pode ser isolado ou
  falhar. Sempre `try/catch` e padrão seguro (`criarPreferencias` já faz).
- `?data=AAAA-MM-DDTHH:MM` simula a data **só em desenvolvimento** (testa os 4 estados da SPEC-07).
- `typescript` está em 6.0.x (typescript-eslint ainda não suporta 7); `lint-staged` em 16.x (Node).
- O convite é **um só link por família**, sem personalização por convidado.

## Estado atual

Feito: ferramentas e CI; SPEC-01 completa (barramento, fases, estado, orquestrador, contrato `Cena`,
modo de segurança); fatia vertical da SPEC-07 (contagem e estados por data, botões). SPEC-08 (porta de áudio, Howler,
botão de som; faltam os MP3). SPEC-02 (entrada e carregamento, com arte
provisória). SPEC-03 (bosque em camadas, névoa, profundidade). SPEC-04 (baú e chave, abertura em 2 s). SPEC-05 (balões, foto, frase, aceleração). SPEC-06 (envelope, selo, carta, abertura em 7 s). SPEC-07 completa (mensagem, traje, cartões ao rolar). SPEC-11 (consistência de datas no `verificar`, lista de conferência da planilha). SPEC-09 (acessibilidade, segurança, noscript). SPEC-10 (publicação, prévia). Próximo: SPEC-12…
Pendências de conteúdo: fotos dos balões, imagens geradas, músicas licenciadas, verso do louvor, URL
publicada (lista em `docs/documentacao.md`).
