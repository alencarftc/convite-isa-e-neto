# ADR-0015 · Cena vertical da pintura mestre, balões de 5 s e o aviso de tema

- **Status:** aceita em 2026-11-01
- **Contexto:** o casal viu a [ADR-0014](./0014-ajustes-da-cena-viva-no-celular.md) no celular e devolveu sete pontos:
  os nomes da entrada não devem quebrar; as árvores pareciam distorcidas; o baú e o casal ainda pareciam sobre a água
  e havia "mato" demais no chão; cada balão devia ficar 5 s e o texto dele não era legível; o papel que sai do envelope
  tinha um fundo escuro e o texto da carta quase não se lia. O casal sugeriu gerar de novo as imagens para o celular. A
  pintura mestre em retrato (`01-cena-mestre-9x16`) já existia, então esta ADR a usa. Tudo foi conferido em 375 × 812,
  360 × 740, no celular deitado (812 × 375) e no computador (1366 × 768).

## O que mudou

| #   | Pedido                                                           | Solução                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "Isabella & David" sem quebra de linha                           | A entrada voltou a uma linha só. A quebra do "&" vale só na carta, onde aparecem nome e sobrenome (Isabella Vaz / & / David Neto). Saíram o `escreverNomes` e o `.entrada__e` da ADR-0014.                                                                                                                                                                                                                                                                                       |
| 2   | Árvores distorcidas; jardim com "mato"; baú e casal sobre a água | Na vertical a cena é a **pintura mestre 9:16 sem o céu**: o bosque, as rosas, o lago, o muro de pedra e um gramado limpo, numa composição pensada para o celular. `pnpm arte` recorta o céu dela (`removerCeu`: região conexa a partir de uma semente, bolsões entre as folhas, nuvens brancas soltas e a borda das folhas com a cor das folhas) e o céu de verdade, que a história troca de baunilha para pôr do sol, aparece por trás. O baú pisa no gramado e o casal também. |
| 3   | Cada balão por 5 s, um de cada vez; texto legível                | `duracoes.balao` passou de 0,55 para 5 s e os balões voltaram a vir um depois do outro (a ADR-0014 os pôs em cascata, em 5 s no total: leitura errada do pedido). O ciclo também é de 5 s, com a frase à vista por cerca de 3,5 s, e a história inteira dura 25 s. A frase ganhou uma placa marfim com filete dourado dentro da nuvem, em letra maior, e o balão ficou maior (68% da largura da tela).                                                                           |
| 4   | Casal acima da água; parado com o mouse no computador            | O casal pisa no gramado (`--casal-base` 26%, a cena sobe 22%). O espaço `.casal` ganhou profundidade igual à do baú (`data-prof`), então acompanha o mouse como o resto da cena: ±18 × ±9 px, medido.                                                                                                                                                                                                                                                                            |
| 5   | Fundo escuro no papel que sai do envelope; texto ilegível        | Ver "O modo escuro forçado" abaixo. A carta dobrada é só a imagem do papel, sem cor de fundo, moldura nem sombra retangular; a sombra segue o contorno (`drop-shadow`). O texto suave da carta ficou mais escuro (9,2:1 sobre marfim, antes 7,4:1).                                                                                                                                                                                                                              |
| 6   | (decorrente) baú no computador                                   | `bau.bottom` na horizontal de 25% para 20%: a base do baú entra nas flores.                                                                                                                                                                                                                                                                                                                                                                                                      |

## A cena vertical

- A pintura ocupa a chave `lago` do manifesto (a camada do meio), do tamanho da tela. As chaves `arvores` e
  `primeiroPlano` apontam, na vertical, para `assets/scene/vazio.webp` (1 × 1 transparente) e as camadas somem por CSS.
  Na horizontal nada mudou: as quatro camadas de sempre.
- Saíram o `molduraVertical`, o `lagoVertical` e o `primeiroPlanoVertical` do `pnpm arte`, e os três arquivos
  (`04-lago-9x16`, `05-arvores-9x16`, `06-primeiro-plano-9x16`) da ADR-0014. O `chao` (a faixa sob a carta) passou a sair
  da borda de baixo da pintura. O limite de `lago` subiu de 150 para 520 kB (a pintura tem 441 kB); o lago do computador
  continua nos 150 kB.
- Peso: o carregamento crítico no celular caiu (a pintura de 441 kB no lugar de 119 + 270 + 213 kB das três peças).
- A água na vertical é uma elipse sobre o lago da pintura (`config.vida.agua.regiao.vertical`): a mata, o muro e o
  gramado ficam parados. O canvas cobre a tela inteira (a região só limita onde há onda), então custa mais que a faixa de
  antes; o medidor de quadros já passa ao nível leve se o aparelho não aguentar. **Não medido em aparelho real.**
- Perda: na vertical já não há camadas com profundidades diferentes (uma pintura só); o céu e o resto ainda derivam
  separados, e o baú e o casal se movem um pouco mais que a pintura.
- As folhas se soltam da copa da direita da pintura (`copa.vertical`) e o esquilo corre a 10% da base, no gramado.

## O modo escuro forçado

A ADR-0012 pedia `color-scheme: only light`. No Chrome isso funciona, mas o celular do casal continua escurecendo o
convite: com o modo escuro forçado, os botões e o balão da dica ficam escuros e, na carta, **o texto vira claro sobre o
papel creme**, que é imagem e não muda (a queixa dos pontos 5 e 7). Reproduzido no Chrome com
`--enable-features=WebContentsForceDark` e sem a recusa; com `light dark` (declarar suporte aos dois temas) o Chrome
continuava escurecendo; com **`color-scheme: dark`** na raiz e no `<meta>` o convite fica exatamente como no tema claro,
em todas as etapas. O convite não usa nenhuma cor padrão do navegador, então declarar `dark` só escurece a barra de
rolagem, que ganhou `scrollbar-color` com as cores do convite. O `supported-color-schemes` saiu.

**Não pude testar no aparelho do casal** (não sei qual navegador é). Se o escurecimento persistir, é preciso saber se
o link abre no WhatsApp, no Chrome ou no Samsung Internet. O teste `tema-claro.test.ts` guarda a declaração.

## Consequências

- Os espelhos de `docs/` e os dois Claude Docs seguem com o comportamento antigo; vale esta ADR até lá.
- A ADR-0014 fica como registro: a moldura de árvores montada, o lago prolongado, o mosaico de rosas e a cascata de balões
  de 5 s no total foram **substituídos** por esta.
- `pnpm verificar` continua falhando pelas mesmas pendências (fotos dos balões, MP3, verso do louvor, textos da pausa,
  arte provisória das folhas e do esquilo, URL).
- Alternativa em aberto: se o casal ainda quiser camadas de árvores, lago e primeiro plano geradas na vertical para
  recuperar o efeito de profundidade, os prompts saem das imagens 04 a 06 com a proporção 9:16, e o `pnpm arte` as
  recebe no lugar de `cenaVertical`.
