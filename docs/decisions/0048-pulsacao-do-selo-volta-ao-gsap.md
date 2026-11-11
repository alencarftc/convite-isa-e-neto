# ADR-0048 · A pulsação do selo volta ao GSAP

- **Status:** aceita em 2026-11-11
- **Contexto:** depois da [ADR-0047](./0047-nenhum-will-change-fixo.md) o convite ainda piscava no Motorola Edge 70 Fusion+ quando o envelope
  aparecia (o selo piscava) e, depois do toque no selo, o convite todo. O casal testou `?sem=css`, `?com=dvh` e `?sem=vida` e o piscar
  continuou nos três. Isso tirou do caminho as peças de CSS (o `?sem=css` desliga o `will-change`, os filtros, as máscaras, o glow, as
  misturas e o resto), a altura da cena e a água, os pássaros, as folhas e o esquilo.

## O que sobrou

O último teste em que `?sem=css` resolveu foi feito com a pulsação do selo ainda no GSAP. Depois dele só mudaram a CSS (equivalente ao que o
`?sem=css` já fazia: sem `will-change`, sem `clip-path`) e **uma** peça de JavaScript no envelope: a pulsação do selo, que a
[ADR-0046](./0046-inicio-fluido-sem-retangulo-de-toque-e-brilho-do-envelope.md) passou de `gsap.to` para `Element.animate` (escala de 1 até
`pulsoDoSelo.escala`, em vai e volta, para sempre). Um `scale` infinito do navegador num elemento sem `will-change`, sobre o envelope e perto
de camadas de tela cheia, é a única diferença que explica o selo piscar e o piscar continuar depois do toque.

## O que mudou

- `presentation/carta/cena-carta.ts`: o selo pulsa de novo por `gsap.to(selo, { scale, yoyo: true, repeat: -1 })`; ao toque `pararOPulso()`
  só mata o tween e a abertura (um `gsap.to` do selo) parte da escala em que ele estava. Saíram os usos de `animarNoNavegador` e `curvaCss`
  nesse arquivo, e o ramo do GSAP de reserva virou o único.
- `tests/integration/carta.test.ts`: o teste da pulsação agora confere o tween do GSAP (`yoyo`, `repeat: -1`, `scale = pulsoDoSelo.escala`) e
  que o selo não tem nenhuma animação do navegador; o do toque confere que o tween some.
- Diagnóstico só de desenvolvimento: `?sem=pulso` (também dentro de `?sem=js` e `?sem=tudo`) desfaz a pulsação do selo a cada quadro por
  4 s depois de `carta:pousou`, para separar "o selo pulsando" de "o resto do envelope".

## Não verificado

Não medi o piscar no aparelho. Se o GSAP voltar a piscar o selo, `?sem=pulso` no `pnpm dev:rede` diz se a pulsação é a culpada; se ele piscar
mesmo sem pulsar, o próximo passo é dividir o resto do envelope (`?sem=glow`, `?ocultar=petalas`, `?ocultar=cena`) e comparar com a produção.
