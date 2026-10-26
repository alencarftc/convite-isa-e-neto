---
description: Implementa uma spec do convite (ex.: /spec 04) com testes e respeitando as camadas
argument-hint: <número da spec, 01 a 12>
---

Implemente a **SPEC-$ARGUMENTS**.

1. Leia, nesta ordem: `docs/specs/SPEC-$ARGUMENTS-*.md`, as histórias e critérios de aceite do épico
   correspondente em `docs/epicos-e-historias.md` (use `Grep` por `EP-$ARGUMENTS` e `CA-$ARGUMENTS.`),
   `docs/specs/SPEC-01-fundacao-tecnica.md` (contrato de cena, eventos, estado) e `docs/arquitetura.md`.
   Textos vêm de `docs/requisitos.md` ("Textos do convite"); não invente texto.
2. Antes de codar, escreva um plano curto: quais arquivos em qual camada, quais portas novas, quais
   testes (CT-$ARGUMENTS.x). Pergunte só se houver decisão de produto em aberto ("Questões em aberto").
3. Implemente com testes primeiro nas regras de `domain`/`application`. Cenas ficam em
   `src/presentation/scenes/`, recebem as portas por `ctx` e não importam `infrastructure`.
   Tempos de `config.duracoes`, textos de `content.ts`, cores de `tokens.css`.
4. Cubra os critérios de aceite com testes (unidade ou integração) citando o CA/CT no teste.
5. Rode `pnpm check`; confira no dev server (5173) e descreva o que você viu. O que depender de aparelho
   real (som no iPhone, WhatsApp) liste como verificação manual pendente.
6. Atualize `docs/` se a implementação mudar algo documentado e crie o changeset (`pnpm changeset`).

Não faça commit a menos que seja pedido.
