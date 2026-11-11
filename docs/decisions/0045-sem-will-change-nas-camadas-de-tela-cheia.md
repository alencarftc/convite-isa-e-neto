# ADR-0045 · Sem `will-change` fixo nas camadas de tela cheia da cena

- **Status:** aceita em 2026-11-10
- **Contexto:** depois da [ADR-0044](./0044-animacoes-da-cena-pelo-navegador.md) o início do convite parou de piscar no Motorola Edge 70
  Fusion+ (144 Hz), mas o **convite aberto** (a carta, os cartões, a rolagem) continuava piscando. No aparelho, por divisão:
  `?sem=js` (todas as peças de JavaScript desligadas) **não** parava o piscar; `?sem=css` (os nove efeitos de CSS desligados) **parava**;
  e dentro do CSS, **`?sem=willchange`** (todo `will-change` desligado) **parava**.

## Causa

`.camada` (as cinco imagens de tela cheia da cena) e `.vida` (os três espaços de tela cheia da cena viva, quase sempre vazios)
tinham `will-change: transform` fixo: sete camadas de GPU de tela cheia mantidas na memória o tempo todo, **também com o convite
aberto**, quando a carta já cobre a cena e a deriva está pausada. Numa tela de 1272 × 2772 px isso é, só nessas camadas, perto de 100
MB de textura, somados à carta, ao carrossel e às pétalas. É o mesmo princípio da [ADR-0043](./0043-carrossel-sem-camadas-permanentes.md)
(o carrossel): peça grande não fica em camada de GPU permanente. (O número é uma estimativa; não medi a memória do aparelho.)

## O que mudou

- `bosque.css`: `.camada` perde o `will-change`. `vida.css`: `.vida` perde o `will-change`.
- Quem promove a camada agora é a **animação**: no celular, a deriva (`Element.animate`) a promove enquanto roda e a solta quando para;
  no mouse, o GSAP promove durante o movimento (`translate3d`). Com o convite aberto, a deriva está pausada e as camadas não ficam
  fixas na GPU.
- Ficam com `will-change` fixo só peças pequenas ou passageiras: a névoa da entrada (some ao entrar), o envelope, as peças da história,
  a folha, o esquilo e a pétala. O teste `tests/integration/camadas-de-gpu.test.ts` conta as declarações e barra uma nova.
- Chave de diagnóstico (só em desenvolvimento): `?com=camadas` devolve o `will-change` de antes às camadas e aos espaços da vida, para
  comparar no aparelho.

## Não verificado

Não medi o piscar depois da mudança: só o celular dela mostra. O teste de divisão dizia "algum `will-change`", não qual; esta mudança
tira os das peças de tela cheia, que são as que pesam. Se ainda piscar, os candidatos restantes são o do envelope (fixo, pequeno), os
da vida (folha, esquilo, pétala) e os da história.
