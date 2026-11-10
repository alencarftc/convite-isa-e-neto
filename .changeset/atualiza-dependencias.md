---
'convite-isa-e-neto': patch
---

Atualiza as dependências e as GitHub Actions (consolida os PRs do dependabot): gsap 3.15.1, vite 8.3.7, vitest e cobertura 5.1.0, eslint 10.14.0, typescript-eslint 8.72.2, dependency-cruiser 18.7.2, globals 17.14.0; `actions/checkout`, `setup-node` e `upload-artifact` na 7, `download-artifact` na 8 e `pnpm/action-setup` na 6. O lint-staged 17 e o `@types/node` 26 ficam de fora (exigem Node mais novo que o mínimo do projeto) e o dependabot passa a ignorar esses dois majors.

No `publicar.yml`, o gate de pendências de conteúdo termina verde com um aviso (sem a anotação vermelha de erro) enquanto `BLOQUEAR_COM_PENDENCIAS` não for `true`.
