# ADR-0029 · A estrela parada tem o formato da centelha que sobe

- **Status:** aceita em 2026-11-08
- **Contexto:** nas memórias em luz ([ADR-0026](./0026-memorias-em-luz-no-lugar-dos-baloes.md)) a centelha que sobe do baú era um orbe redondo,
  mas a estrelinha que ficava parada no céu era um polígono de estrela de quatro pontas. O casal pediu que a que fica parada tenha **o
  mesmo formato** da que sobe.

## O que mudou

- `.memoria__estrela-ponta` perdeu o `clip-path` do polígono e passou a dividir o visual da `.memoria__centelha`: um orbe redondo, de
  núcleo marfim num halo de ouro vivo (o mesmo degradê e o mesmo brilho de 8 px). A estrela é, na aparência, a centelha parada.
- `config.historia.estrela.tamanho` de 20 para **26 px**, o tamanho da centelha.
- Continua pulsando de leve (1,8 s, cada uma a seu tempo), agora de 1 a 1,18 (era 1,3), e sem pulso com animação reduzida.

Conferido no Chrome sem tela a 375 × 812: as cinco do arco, no fim, são orbes dourados iguais à centelha que sobe.
