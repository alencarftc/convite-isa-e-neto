---
'convite-isa-e-neto': patch
---

A deriva das camadas e a aproximação da cena na abertura passam a ser animações do navegador (`Element.animate`) em vez de animações do
GSAP calculadas a cada quadro: no Motorola Edge 70 Fusion+ (144 Hz) as de JavaScript faziam o convite piscar e as de CSS, não. O
GSAP continua como reserva em navegadores sem `animate` (ADR-0044).
