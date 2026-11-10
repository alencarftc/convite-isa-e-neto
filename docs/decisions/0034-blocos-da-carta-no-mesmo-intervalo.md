# ADR-0034 · Os blocos da carta aparecem no mesmo intervalo

- **Status:** aceita em 2026-11-09
- **Contexto:** o casal viu que, ao abrir o envelope, "alguns textos estão demorando mais do que outros para aparecer" e pediu que
  o conteúdo apareça sempre no mesmo intervalo.

## Causa

Desde a [ADR-0012](./0012-ajustes-de-experiencia-apos-testes-no-celular.md) a carta se revelava bloco a bloco, e o tempo que cada
bloco segurava o seguinte crescia com o tamanho do texto: 0,5 s mais 0,024 s por caractere, com teto de 3 s
(`convite.leitura`). Um ornamento ou um "&" liberava o próximo em meio segundo; o parágrafo do convite (uns 190 caracteres)
segurava o seguinte por 3 s. Com 16 blocos de tamanhos tão diferentes, o ritmo ficava irregular.

## O que mudou

- `config.convite.leitura` (`base`, `porCaractere`, `maximo`) saiu; entrou `config.convite.intervaloDosBlocos`, **1,3 s**: o mesmo
  tempo entre o começo de um bloco e o começo do próximo, qualquer que seja o texto. Cada bloco leva 0,9 s para aparecer
  (`blocosAparecem`), então ainda sobra uma pausa curta antes do seguinte.
- `revelarEmSequencia` recebe esse número (`intervalo`) em vez de uma função que calculava o tempo pelo texto.
- O cálculo `tempoDeLeitura` (`domain/carta/`) e o seu teste foram apagados: nada mais o usava.
- Teste novo em `carta.test.ts`: com o relógio manual do GSAP, anota quando cada um dos 16 blocos começa a aparecer e exige o mesmo
  intervalo entre todos (a menos de um passo de 0,5 ms). Conferido também com uma implementação propositalmente quebrada
  (intervalo que depende do tamanho do texto): o teste falha.
- Medido no Chrome (375 × 812, fluxo completo até a carta aberta, com tudo cabendo na tela): os 15 intervalos entre os 16 blocos
  ficaram entre 1,29 e 1,33 s, para textos de 0 a 182 caracteres.

## O que não muda

- O bloco abaixo da dobra continua esperando o convidado rolar até ele (e "Role para ler" aparece): a carta não corre à frente de
  quem lê. Essa espera é por rolagem, não por tempo, e é o único caso em que um bloco demora mais.
- Nada acelera por toque; quem já rolou além de um bloco o vê de uma vez.

## Consequências

- Um único número ajusta o ritmo da carta inteira: `intervaloDosBlocos` em `config.ts`. Mais lento: 1,6 s; mais rápido: 1,0 s.
- Do primeiro ao último bloco começarem a aparecer passam 15 × 1,3 ≈ 19,5 s, contra uns 21 s antes (a soma dos tempos que
  dependiam do texto): a carta leva quase o mesmo tempo, só que sem os blocos de ritmo desigual.
