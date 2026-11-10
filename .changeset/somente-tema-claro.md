---
'convite-isa-e-neto': patch
---

O convite só tem o tema claro: o `color-scheme: dark` (um desvio da ADR-0015) volta a `only light`, no `<meta>` e na CSS, e um teste
garante que nenhuma folha de estilo declara tema escuro nem usa `prefers-color-scheme` (ADR-0042).
