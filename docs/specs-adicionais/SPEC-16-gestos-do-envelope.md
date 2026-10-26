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
