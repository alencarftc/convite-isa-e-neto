# ADR-0017 · Esquilo maior e chão fixo para o baú e o casal

- **Status:** aceita em 2026-11-01
- **Contexto:** o casal viu a [ADR-0016](./0016-tinta-da-carta-contra-o-escurecimento-forcado.md) e devolveu dois pontos: o
  esquilo estava pequeno no celular e aparecia sobre as flores, "no meio do mato"; e o baú e o casal "flutuavam" com o
  cursor no computador, em vez de ficarem fixos na cena.

## O que mudou

| Pedido                            | Solução                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Esquilo pequeno e sobre as flores | Na vertical a largura passou de 7% para 17% da tela (de 26 para 64 px em 375 px) e a linha dele subiu de 10% para 27% da base: o gramado limpo da pintura, acima das rosas dos cantos. Na horizontal, de 3,5% para 4% da tela. A arte continua provisória (SVG); as imagens 21a–b chegam depois. Ele ainda entra por um lado, para antes do baú, olha em volta e volta.                                                  |
| Baú e casal flutuando com o mouse | O baú e o casal tinham profundidade própria (0,75) e se moviam mais que o gramado em que pisam. Agora `config.movimento.profundidadeDasCamadas.solo` dá a eles a profundidade **do chão**, por orientação: na vertical, a da pintura (a camada do lago, 0,3); na horizontal, a do primeiro plano (1). Medido no computador: o baú, o casal e o gramado se movem juntos (±24 × ±12 px) e o lago, ao fundo, menos (±7 px). |

## Consequências

- A chave `bau` saiu de `profundidadeDasCamadas` (virou `solo`); o teste das profundidades cobre as duas orientações.
- No celular o baú e o casal derivam como a pintura (±2 px); a diferença para as outras camadas é só a do céu.
