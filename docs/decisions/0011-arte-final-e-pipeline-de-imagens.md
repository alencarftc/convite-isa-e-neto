# ADR-0011 · Arte final integrada e pipeline de imagens (`pnpm arte`)

- **Status:** aceita em 2026-10-27; em parte substituída pela [ADR-0012](./0012-ajustes-de-experiencia-apos-testes-no-celular.md) (cursor da chave, siglas do selo por vetor, `--cor-chao`, papel da carta)
- **Contexto:** as imagens geradas chegaram em `public/assets/` como PNG de 1 a 4 MB cada (41 MB no
  total), com resíduos da cor-chave nas bordas, sem recorte em alguns objetos, com extensões duplicadas
  e uma "foto" de casal que na verdade era WebP com fundo cinza chapado. Copiá-las como estavam
  estouraria o orçamento de peso (SPEC-12) e carregaria o site com 41 MB.

## Decisões

1. **Originais fora de `public/`.** Ficam em `arte/originais/` (o Vite copiaria tudo o que está em
   `public/` para o site). O que vai ao ar é sempre derivado deles por `pnpm arte`.
2. **`pnpm arte` (`scripts/arte/`)** lê os originais e escreve os WebP finais em `public/assets/scene|objects|couple/`:
   - procura a **maior qualidade que cabe no orçamento** de cada arquivo (`LIMITE_DAS_IMAGENS`, usando
     até 95% do limite) e só encolhe a imagem se nem a pior qualidade couber;
   - limpa o recorte (alfa normalizado, resíduos da cor-chave removidos, borda comida em 2 px e
     suavizada, cor da borda "descontaminada" para dentro);
   - pares que se sobrepõem (baú fechado e aberto; envelope fechado e aberto) recebem o **mesmo recorte e
     a mesma escala**, para não pularem na troca;
   - o casal (fundo cinza liso) tem o fundo removido a partir das bordas, mais as regiões neutras
     grandes presas dentro do contorno, e as manchas soltas pequenas;
   - gera também o cursor da chave (e imprime a ponta ativa), os ícones (com as iniciais "I&D" em
     caminho de vetor tirado da própria fonte Great Vibes) e a imagem de prévia (`og-image.jpg`).
3. **Moldura de árvores em 9:16 montada.** Só veio a arte 16:9. No celular o `object-fit: cover` mostraria
   o meio vazio da moldura, sem tronco algum; então o 9:16 é montado com as duas laterais da mesma arte
   (cada tronco no seu canto, galhos esmaecendo até o centro).
4. **Lago e primeiro plano valem nas duas orientações** (uma arte só, como `string` no manifesto, sem
   `<source>`). Na horizontal a camada ganha a proporção da própria arte (`aspect-ratio`), porque o
   `cover` cortaria o topo e deixaria colinas e grama terminando numa linha reta.
5. **Ponta do cursor da chave em `config.bau.pontaDoCursor`** (antes um `8 40` escrito no código da cena).
6. **Posições medidas na arte real:** fechadura do baú em 64% × 62%, foto dentro de cada nuvem pelo
   centro do corpo dela, dica do baú acima dele (o primeiro plano a esconderia por baixo), chave
   pairando sobre a tampa, `--cor-chao` igual à média das últimas linhas do primeiro plano com
   gradiente que emenda.
7. **A arte provisória some**, exceto as fotos dos balões (`public/assets/provisorio/foto-*.svg`), que
   continuam pendentes e seguram o `pnpm verificar`. `pnpm arte:provisoria` agora só gera essas fotos.

## Não usado (e por quê)

- `07-nevoa.png`: fumaça branca sobre preto, sem alfa. A névoa da entrada já é feita em CSS e funciona;
  usar a imagem pediria máscara e mais peso.
- `01-cena-mestre-*`: referência de composição, não camada.

## Consequências

- `pnpm verificar` passa de 45 para 17 pendências: só restam as 5 fotos e descrições, o verso do louvor e
  os 6 MP3.
- Trocar uma arte: substitua o original em `arte/originais/` e rode `pnpm arte`; nada é editado à mão em
  `public/assets/`.
- **Decisão em aberto para o casal/mantenedor:** versionar `arte/originais/` (41 MB, cresce o repositório)
  ou mantê-la fora do Git e guardar em outro lugar.
