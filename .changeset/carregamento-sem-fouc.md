---
'convite-isa-e-neto': patch
---

O CSS vai no `<head>` (`src/styles/index.css`) e, no build, dentro do HTML: a primeira tela já nasce estilizada, sem FOUC, e a
renderização não espera mais um arquivo de estilos. O papel da carta volta a aparecer no servidor de desenvolvimento (a URL da
variável CSS é completada contra a base do documento) (ADR-0037).
