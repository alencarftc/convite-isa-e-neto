# SPEC-16 · Gestos do envelope: deslizar e selo na entrada

> **Aprovada em 26/10/2026.** Spec adicional do repositório (ainda fora do Claude Docs). Origem: B5 e B6 da [revisão](./README.md).

**Histórias:** US-16.1, US-16.2 · **Prioridade:** Could · **Pontos:** 5 · **Depende de:** SPEC-02, SPEC-06

## Resumo

No briefing, a noiva marcou como interações de interesse **abrir envelope, deslizar elementos e percorrer cenas**, e
descreveu a experiência como "abrir como se tivesse abrindo um envelope mesmo". Hoje todas as interações são toques, e
o envelope só aparece depois da história. Esta spec propõe duas coisas independentes e opcionais: um gesto de
**deslizar** para abrir o envelope, que convive com o toque, e o **selo I&D já na tela de entrada**, como no convite
base, para o convite "começar" por um selo.

## Escopo

**Dentro:** o gesto de arrastar o selo, a tela de entrada com o selo e os testes.

**Fora:** a escolha de mudar o roteiro (decisão 1 continua: o envelope pousa depois da história) e o som.

## Comportamento

### A. Deslizar para abrir

Na etapa do envelope, além de tocar no selo (que continua funcionando e continua abrindo sozinho em 4 s), o convidado
pode **arrastar o selo** para baixo ou para o lado: o selo acompanha o dedo até 120 px, com resistência; ao soltar além de
60 px, a abertura roda a mesma `tlConvite`; antes disso, o selo volta ao lugar com uma mola curta. `carta:abrindo`
informa `origem: 'gesto'`.

### B. Selo na entrada

A tela de entrada (névoa, nomes, "Toque para entrar") ganha o selo azul com as iniciais I&D, acima dos nomes, pulsando
devagar. Tocar em qualquer ponto continua entrando. Quando o convidado chega ao envelope, o selo é **o mesmo**, de modo
que o começo e o fim da abertura rimam.

## Requisitos funcionais

- **RF-16.1** O gesto usa `pointerdown/move/up` com `touch-action: none` só sobre o selo; o resto da tela rola e toca normalmente.
- **RF-16.2** Teclado: Enter e Espaço no botão do envelope continuam abrindo (o gesto é um acréscimo, não um substituto).
- **RF-16.3** O deslocamento usa só `transform`. Com animação reduzida, o selo não acompanha o dedo: um toque ou o gesto
  abrem direto.
- **RF-16.4** A dica continua sendo "Toque no selo" (texto aprovado). Se quiserem "Toque ou deslize o selo", precisa de
  aprovação (texto novo).
- **RF-16.5** Selo na entrada: usa `config.imagens.selo` e `content.envelope.iniciais`; a área de toque da entrada não
  muda (a tela inteira, RF-02.5); o selo é decorativo (`aria-hidden`).
- **RF-16.6** O toque na entrada continua liberando o som dentro do gesto (SPEC-02, RF-02.6).

## Requisitos não funcionais

- **RNF-16.1** O gesto não interfere com a rolagem da página nem com o zoom do navegador.
- **RNF-16.2** Resposta visual ao gesto em até 100 ms.

## Desenho técnico

- `presentation/carta/gesto-do-selo.ts`: `ligarGestoDoSelo({ selo, limite, aoAbrir })`, com `gsap.quickTo` para o
  acompanhamento; usado por `cena-carta.ts` junto com o clique.
- `EventosConvite['carta:abrindo'].origem` ganha `'gesto'` (domínio) e o orquestrador não muda.
- `index.html` e `entrada.css`: o selo na entrada reaproveita o `.selo` (imagem e iniciais), posicionado acima dos nomes.

## Casos de teste

- **CT-16.1** Arrastar o selo mais de 60 px abre o envelope; menos de 60 px, ele volta.
- **CT-16.2** Tocar, esperar 4 s e arrastar levam à mesma abertura; só a primeira origem vale.
- **CT-16.3** Com animação reduzida, o selo não segue o dedo.
- **CT-16.4** A entrada mostra o selo I&D e o toque em qualquer ponto ainda entra, com som liberado.
- **CT-16.5** Em tela de toque e com mouse, rolar a página fora do selo continua funcionando.

## Questões em aberto

- A noiva quer um gesto de deslizar? Onde: no selo (proposta), no envelope ou nos balões?
- O selo na entrada combina com a névoa que ela viu no roteiro, ou prefere só os nomes?

## Implementação (26/10/2026)

Implementada na branch `feat/spec-16-gestos-do-envelope`. Respostas adotadas e desvios do desenho acima:

- **As duas partes entraram** (gesto no selo e selo na entrada), no selo e não nos balões. A dica continua "Toque no
  selo" (RF-16.4): não há texto novo.
- **Gesto:** `pointerdown/move/up` no botão que já cobre o envelope, mas só começa se o dedo pousar sobre o selo
  (com 10 px de folga); tocar em outro ponto é um clique comum. Andar menos que 10 px ainda é um toque. O
  deslocamento é `limite × tanh(distância / limite)` (domínio, `gesto-do-selo.ts`): cresce e se aproxima de 120 px sem
  passar, o que dá a resistência. Só conta o movimento para baixo e para os lados. Soltar com 60 px ou mais abre
  (`carta:abrindo` com `origem: 'gesto'`); antes disso o selo volta com `elastic.out(1, 0.5)` (`curvas.mola`).
- **`gsap.set` em vez de `quickTo`:** os eventos de ponteiro já chegam a cada quadro, então não há o que suavizar, e o
  `set` responde na hora (RNF-16.2) sem brigar com a pulsação do selo.
- **`touch-action: pinch-zoom` no botão do envelope**, em vez de `none` só no selo: dedo único arrasta, mas a pinça de
  zoom continua funcionando (RNF-16.1). A página não rola nessa etapa de qualquer modo (RF-06.9). Fora do envelope nada
  muda. O `click` que o navegador dispara depois de um arrasto é ignorado (uma vez), e a marca é limpa a cada novo toque.
- **Se o navegador recusar a captura do ponteiro**, o gesto segue sem ela: o erro não pode levar o convite ao modo de
  segurança por causa de um enfeite (descoberto no navegador com um evento sintético).
- **Animação reduzida:** o selo não acompanha o dedo, mas arrastar além do limiar ainda abre, e o toque também.
- **Selo na entrada:** o HTML reserva o lugar (`.entrada__selo`, 88 px, vazio e `aria-hidden`) antes dos nomes, então os
  nomes não mudam de lugar quando a cena o preenche (CLS continua 0). A cena monta a imagem de `config.imagens.selo` e as
  iniciais de `content.envelope.iniciais`; pulsa a cada `config.entrada.seloPeriodo` (3,2 s), parado com animação
  reduzida. É "o mesmo" selo na aparência (mesma imagem e iniciais), não o mesmo elemento do DOM.
- **A imagem do selo não virou crítica:** a SPEC-02 fixa seis imagens críticas (RF-02.3). O selo aparece quando a
  imagem chega, sem atrasar "Toque para entrar"; se falhar, fica o espaço vazio.
- **A tela inteira continua sendo o toque da entrada** e o toque libera o som no próprio gesto (RF-16.6): o selo não
  captura nada.
