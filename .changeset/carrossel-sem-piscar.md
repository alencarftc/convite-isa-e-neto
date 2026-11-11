---
'convite-isa-e-neto': patch
---

O carrossel de fotos deixa de piscar em celulares de tela de alta densidade (Motorola Edge 70 Fusion+, 144 Hz): as fotos fora de vista ficam
escondidas e a camada de GPU só existe enquanto a foto se move, em vez de dez camadas permanentes; o zoom para fora da tela. Entra também uma
chave de diagnóstico do piscar só para desenvolvimento (`?sem=`, `?fps=`, `?velho=carrossel`) (ADR-0043).
