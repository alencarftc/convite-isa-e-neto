---
'convite-isa-e-neto': patch
---

As camadas de tela cheia da cena e os espaços da vida deixam de ter `will-change: transform` fixo: sete camadas de GPU permanentes faziam o
convite aberto piscar no Motorola Edge 70 Fusion+. Quem pede a camada agora é a animação, só enquanto a peça se move (ADR-0045).
