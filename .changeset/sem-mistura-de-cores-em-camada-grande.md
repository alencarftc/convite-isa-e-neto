---
'convite-isa-e-neto': patch
---

Acaba com o piscar no Motorola Edge 70 Fusion+ (144 Hz): a luz do pôr do sol deixa de ser uma camada de tela cheia em `soft-light` (a mistura obrigava a GPU a refazer a cena inteira a cada quadro) e vira um degradê comum de mesmo tom. O pôr do sol, a subida da cena e o desdobrar da carta rodam no navegador; o céu coberto sai do desenho; a carta ganha camada própria; a água se redesenha a 30 quadros por segundo e o GSAP tem teto de 60. Guardas em `padroes-de-renderizacao.test.ts` impedem a volta do padrão (ADR-0050).
