# Prompts das imagens definitivas (cena viva)

Faltam as imagens que ainda usam arte provisória (`assets/provisorio/`): as **três folhas** (20a–c) e as **duas poses do
esquilo** (21a–b). As fotos dos balões não são geradas: são fotos do casal (veja o fim). As regras abaixo são as de
[`requisitos.md`](../requisitos.md), "Imagens a gerar": prompts em inglês, objeto sobre fundo cinza-claro liso, nenhum
texto, a mesma luz quente vinda de trás e da direita, e a **cena mestre como imagem de referência de estilo** (use
`arte/originais/01-cena-mestre-9x16.png`, a pintura que está no convite), para parecerem pintadas pela mesma mão.

## Bloco de estilo (cole no lugar de `[STYLE]`)

```
Romantic impressionist oil painting in the spirit of late 19th-century Belle Époque pastoral art, visible soft brushstrokes, subtle canvas texture, dreamy hazy atmosphere, gentle diffused light. Color palette: soft serenity blue (#91A8D0), warm beige (#DBCEB0), ivory (#F6F3E0) and muted antique gold (#B18E4A); foliage in desaturated sage and grey-olive greens with cool blue-green shadows. Delicate, serene, elegant, low saturation, no harsh contrast. Warm light coming from the back right.
```

Prompt negativo, para geradores que aceitam:

```
text, letters, words, numbers, watermark, signature, logo, border, frame, red flowers, pink flowers, orange flowers, saturated or neon colors, harsh shadows, cast shadow on the ground, modern objects, photorealistic, 3D render, cartoon, anime, blurry, low resolution
```

## 20a–c · Folha caindo (três variações)

Cai das árvores da pintura: folhas de carvalho/olmo, verde-oliva e sálvia, com pontas douradas onde o sol bate. Sai em
quadrado de 2048 px, a folha pequena e centrada, com bastante margem vazia, **sem galho nem cabo preso a nada**. Gere as
três e compare: a sequência fica natural quando elas diferem na forma e no tom.

**20a · Folha dourada, inclinada.**

```
A single autumn-touched leaf falling through the air, a serrated oval oak-like leaf in soft olive and sage green with warm golden-yellow tips where the evening sun hits it, delicate visible veins, edges slightly curled. Seen from the front, tilted about 25 degrees to the left, as a lone falling leaf with no branch and no stem attached to anything. Small simple subject, centered, with generous empty margin around it. Isolated on a plain flat neutral light grey background. [STYLE]
```

**20b · Folha verde, de lado.**

```
A single leaf falling through the air, a serrated oval leaf in deep grey-olive green with a lighter sage underside, the tip pointing upward, turned slightly sideways so one half is foreshortened, fine pale veins, soft golden rim light on one edge. A lone falling leaf with no branch and no stem attached to anything. Small simple subject, centered, with generous empty margin around it. Isolated on a plain flat neutral light grey background. [STYLE]
```

**20c · Folha pequena e redonda.**

```
A single small rounded leaf falling through the air, softer and rounder than an oak leaf, sage green fading to muted golden-russet at one edge, a few delicate veins, one side gently curled, tilted about 15 degrees to the right. A lone falling leaf with no branch and no stem attached to anything. Small simple subject, centered, with generous empty margin around it. Isolated on a plain flat neutral light grey background. [STYLE]
```

## 21a–b · Esquilo (duas poses)

Um caxinguelê (esquilo brasileiro), pequeno, marrom-avermelhado quente e discreto, **de perfil, olhando para a direita**
nas duas imagens (o código o vira com `scaleX`). Gere a **21a primeiro** e use-a como referência da 21b: as duas precisam
ter o mesmo pelo, o mesmo rabo, a mesma proporção e **o mesmo tamanho dentro do quadro** (quadrado de 2048 px, esquilo
centrado), porque o `pnpm arte` recorta as duas juntas e a troca de pose não pode pular.

**21a · Encolhido (parado, sentado).**

```
A small Brazilian red-brown squirrel (caxinguelê) sitting upright on its haunches in a compact hunched pose, tail curled up behind its back in a soft S shape, tiny front paws held near its chest, alert and curious, looking to the right. Strict side view in profile, facing right. Warm chestnut-brown fur with a cream belly, fine delicate fur strokes, soft warm golden rim light from the back right, gentle and discreet, storybook painterly quality like a small detail from an oil painting, not cartoonish. No ground, no shadow, no props. Isolated on a plain flat neutral light grey background. [STYLE]
```

**21b · Esticado (no meio do pulo).** Referência: a 21a.

```
The same small red-brown squirrel as in the reference image (same fur, same tail, same proportions, same size in the frame), captured mid-leap: body fully stretched out horizontally, front paws reaching forward, hind legs extended back, tail streaming behind it in a long flowing curve. Strict side view in profile, facing right, same lighting as the sitting version. No ground, no shadow, no props. Isolated on a plain flat neutral light grey background. [STYLE]
```

## Depois de gerar

1. Tire o fundo cinza (o script de `rembg` do [README do épico](./README.md), "Recorte do fundo") e salve os PNG em
   `arte/originais/` com estes nomes: `20-folha-a.png`, `20-folha-b.png`, `20-folha-c.png`, `21-esquilo-encolhido.png` e
   `21-esquilo-esticado.png`.
2. Rode `pnpm arte`: ele prepara `assets/objects/20-folha-*.webp` (limite de 15 kB cada) e `assets/objects/21-esquilo-*.webp`
   (25 kB cada). Os arquivos que ainda não chegaram são pulados, com um aviso.
3. Em `src/config/config.ts`, troque as cinco chaves `folhaA`, `folhaB`, `folhaC`, `esquiloEncolhido` e `esquiloEsticado`
   de `assets/provisorio/*.svg` para os `.webp` novos. O `pnpm verificar` deixa de acusar a arte provisória.
4. Confira no navegador (celular primeiro): o tamanho do esquilo (`config.vida.esquilo.largura`) e das folhas
   (`config.vida.folhas.largura`) se ajustam sobre as imagens.

## Fotos dos balões (não são geradas)

São cinco fotos **do casal**, uma por balão, em `content.baloes[i]` (`foto`, `alt` e `foco`, hoje vazios): quadradas, de
pelo menos 800 px, até 120 kB cada, em `public/photos/`. O `alt` descreve a foto para o leitor de tela e o `foco` é o ponto
do recorte circular (por exemplo, `50% 35%` para rostos). Enquanto elas não chegam, o `pnpm verificar` acusa `foto-pendente`.
