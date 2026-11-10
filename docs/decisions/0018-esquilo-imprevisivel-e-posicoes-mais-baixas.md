# ADR-0018 · Esquilo imprevisível, ao centro, e posições mais baixas

- **Status:** aceita em 2026-11-01
- **Contexto:** o casal viu a [ADR-0017](./0017-esquilo-maior-e-chao-fixo-para-o-bau-e-o-casal.md) e pediu: o baú, o casal e o
  esquilo um pouco mais abaixo, para as posições fazerem sentido; o esquilo aparecendo ao centro (estava sobre o arbusto,
  nas laterais) e um pouco mais abaixo; e que ele **continue aparecendo depois de o convite ser exibido, com animações
  imprevisíveis**. Isto substitui, na SPEC-21, a regra de que ele nunca passa pelo baú e some quando o envelope pousa.

## O que mudou

| Pedido                           | Solução                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baú, casal e esquilo mais baixos | Baú a 11% da base (antes 15%) na vertical e a 16% (antes 20%) na horizontal; casal com os pés a 23% (antes 26%) e a 18% (antes 20%); esquilo com as patas a 20% da base na vertical (antes 27%) e a 16% na horizontal (antes 9%, que o escondia atrás da carta), e menor: 14% da largura da tela na vertical (era 17%) e 3,5% na horizontal. Com a cena erguida, a linha dele e a do casal ficam logo acima da carta, e o esquilo aparece com o convite aberto. |
| Esquilo ao centro                | Ele para dentro da faixa de 30% a 70% da largura da tela (o centro do corpo), em vez de parar antes do baú. Passa por trás do baú e, depois, por trás do casal: na vertical vive no espaço `vida--fundo` (abaixo do baú e do casal); na horizontal, no `vida--chao`, à frente do primeiro plano.                                                                                                                                                                |
| Continuar com o convite aberto   | `visitaPermitida` saiu: ele aparece em todas as fases e só para no modo de segurança. A cena viva já pausa quando a carta cobre a cena.                                                                                                                                                                                                                                                                                                                         |
| Animações imprevisíveis          | `planejarVisita` sorteia cada visita: de 1 a 3 paradas ao centro, o ponto de cada uma, pulinhos ou disparos (pulos longos, baixos e sem respiro, em 35% dos trechos), de 0 a 3 sacudidas de rabo e de 0 a 2 olhadas por parada, saída pelo mesmo lado ou pelo oposto (40%) e espiadas (15%: aparece junto à borda, olha e volta). O intervalo entre visitas ficou de 12 a 28 s.                                                                                 |

## Segunda rodada (mesmo dia)

O casal pediu o esquilo um pouco mais baixo e menor, "por baixo do arbusto e não por cima", e dois defeitos do baú:

| Pedido                             | Solução                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Esquilo "por cima do arbusto"      | Os arbustos são parte da pintura (uma imagem só), então não dá para escondê-lo atrás de verdade. Ele corre numa **passagem** (`.esquilo__passagem`) cujas bordas esmaecem (20% de cada lado na vertical, 16% na horizontal): ele surge e some junto aos arbustos, como se viesse de trás deles, em vez de passar por cima. |
| Baú "flutuando", sombra errada     | A sombra de chão caía 40% ao lado do baú e a projetada (5 px) parecia um segundo baú: a primeira virou uma elipse logo embaixo da base, mais larga que o baú e com o miolo escuro, e a segunda ficou de 1 × 2 px.                                                                                                          |
| Baú aberto "com um baú por detrás" | O baú fechado ficava visível atrás do aberto (as silhuetas diferem). Ele esmaece no fim da abertura da tampa e some também no `skip`.                                                                                                                                                                                      |

## Consequências

- O domínio deixou de conhecer o baú (`CenarioDaVisita` agora só tem a largura da tela e a do esquilo), e a configuração
  perdeu `folgaDoBau` e `pulos` e ganhou `paradas`, `centro`, `corrida`, `chanceDeCorrida`, `chanceDeEspiar`,
  `chanceDeSairPeloOutroLado`, `sacudidasDoRabo` e `olhadas` (intervalos). Os testes cobrem a distribuição.
- Na vertical, quando o esquilo passa pelo centro no estágio do baú, o corpo aparece sobre a tampa (as patas ficam acima da
  base do baú, no gramado, atrás dele).
- A arte dele continua provisória (SVG); as imagens 21a–b chegam depois.
