# ADR-0006 · Arte provisória, fontes do próprio site e manifesto de imagens

- **Status:** aceita em 2026-10-26
- **Contexto:** as cenas dependem de 18 imagens que ainda serão geradas e de duas fontes que a
  SPEC-01 exige servidas do próprio site (CA-01.3.2). Sem arte não dá para conferir enquadramento,
  camadas, profundidade nem animação; com arte improvisada solta, o risco é publicá-la por engano.

## Decisão

1. **Manifesto em `config.imagens`:** cada chave (`ceu`, `lago`, `bauFechado`…) aponta para um
   arquivo ou, nas camadas do cenário, para dois (`vertical` 9:16 e `horizontal` 16:9). O tipo e as
   listas de carregamento ficam no domínio (`catalogo-de-imagens.ts`): `CHAVES_CRITICAS` (as seis da
   SPEC-02) e `FILA_SECUNDARIA` (ordem de uso). Cada spec de cena acrescenta as suas chaves.
2. **Arte provisória gerada por script** (`pnpm arte:provisoria` → `public/assets/provisorio/*.svg`):
   formas simples na paleta do projeto, com o marcador `ARTE PROVISÓRIA`. O manifesto aponta para
   ela hoje; trocar pelas imagens geradas é editar `config.imagens` e apagar a pasta.
3. **O gate de publicação barra a arte provisória:** `pnpm verificar` falha com
   `arte-provisoria` enquanto algum caminho do manifesto contiver `/provisorio/`, e com
   `arquivo-ausente` se uma imagem do manifesto ou um dos seis MP3 não existir em `public/`.
4. **Fontes em WOFF2 no próprio site:** os pacotes `@fontsource/great-vibes` e
   `@fontsource/cormorant-garamond` (OFL) são _devDependencies_ só como origem; `pnpm fontes` copia os
   quatro arquivos latinos (cobrem o português) para `public/fonts/`, com as licenças. O HTML
   pré-carrega as duas fontes dos nomes; `font-display: swap` e fontes de reserva com `size-adjust`.
5. **Camada da interface acima da névoa:** `--z-interface` passou a 100 (a SPEC-01 dava 80, abaixo de
   `--z-nevoa: 90`), porque o botão de som precisa estar à vista desde a entrada (RF-08.5).
6. **Tempos da entrada e do carregamento em `config.duracoes`** (nomes, chamada, saída, névoa em
   repouso, aviso de espera, nova tentativa de imagem), pela regra de nenhum tempo solto no código.

## Consequências

- O convite já roda de ponta a ponta com arte de mentira e fica visivelmente provisório; o
  `verificar` impede que isso chegue aos convidados.
- A névoa da entrada é só CSS (a imagem 07 é opcional na spec); se a imagem for gerada, entra como
  chave nova do manifesto.
- O CSS fica em arquivo separado (≈2 kB gzip), não embutido no HTML: o primeiro quadro depende de
  uma requisição a mais, aceitável pela meta de 1,5 s em 4G (CT-02.1, a medir).
