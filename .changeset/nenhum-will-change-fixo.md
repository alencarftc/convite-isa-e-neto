---
'convite-isa-e-neto': patch
---

Sai todo `will-change` fixo da CSS (o do envelope, das pétalas, das folhas, do esquilo, da história e da névoa da entrada): ele mantinha camadas de GPU paradas e o convite piscava no Motorola Edge 70 Fusion+. A camada passa a ser de quem anima, só enquanto a peça se move (ADR-0047).
