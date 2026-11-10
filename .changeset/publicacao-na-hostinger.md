---
'convite-isa-e-neto': minor
---

A publicação passa a ser na Hostinger: cada merge na `main` roda o build e grava o site pronto na branch `main-dist`, que o Git do
hPanel acompanha (a Hostinger não faz build). `public/.htaccess` traz o redirecionamento para https, o cache e a compressão. O gate
de pendências de conteúdo só avisa até a variável `BLOQUEAR_COM_PENDENCIAS` ser `true`. O CI refaz o job do título do PR quando
ele é editado (ADR-0039).
