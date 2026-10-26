@AGENTS.md
@docs/README.md

# Claude Code

Tudo que vale para qualquer agente está em `AGENTS.md` (importado acima). Aqui só o que é específico do
Claude Code.

## Como trabalhar neste repositório

- **Dev server:** ele deve estar rodando na 5173. Antes de iniciar, confira com `preview_list`; se existir,
  reutilize (`preview_logs` para o log do Vite, `read_console_messages` para o console, `get_page_text`/
  `read_page` para verificar a página). Só use `preview_start` com a config `dev` de `.claude/launch.json`.
  Nunca rode `pnpm dev` pelo Bash para servir a página.
- **Antes de dizer "pronto":** rode `pnpm check` (ou `/gate`) e relate o resultado real. Mudança visual:
  confira no navegador e cite o que viu; mudança de som/animação que você não consegue ouvir/ver, diga.
- **Ler docs sob demanda:** não carregue `docs/requisitos.md` (≈70 KB) nem as specs inteiras sem
  necessidade; use `Grep` por `RF-`, `CA-`, `CT-` ou pelo título e leia só a seção. O `CLAUDE.md` de cada
  camada (`src/domain/CLAUDE.md` etc.) carrega sozinho ao trabalhar nela.
- **Commits e PR:** só quando pedidos. Siga Conventional Commits em português (ver `AGENTS.md` e
  `/commit`). O trailer `Co-Authored-By` é aceito pelo commitlint.
- **Plano:** tarefa com mais de um passo → mantenha a lista de tarefas atualizada.

## Comandos de barra do projeto

| Comando          | Faz                                                                      |
| ---------------- | ------------------------------------------------------------------------ |
| `/gate`          | roda `pnpm check`, diagnostica a primeira falha e corrige                |
| `/spec <número>` | implementa uma spec (ex.: `/spec 04`) lendo spec + histórias, com testes |
| `/commit`        | agrupa as mudanças e cria commits Conventional Commits válidos           |

## Regras que valem mesmo sem permissão configurada

- Não leia `.env*`, `node_modules/`, `dist/`, `coverage/` nem `pnpm-lock.yaml` (ruído; veja `.cursorignore`).
- Não rode `npm`/`yarn`, `git push --force`, `git reset --hard` nem commits com `--no-verify`.
- Depois de editar, o Prettier pode reformatar no commit (`lint-staged`); rode `pnpm format` se quiser
  ver o resultado antes.

## Preferências pessoais

Coloque em `CLAUDE.local.md` e `.claude/settings.local.json` (ambos ignorados pelo Git).
