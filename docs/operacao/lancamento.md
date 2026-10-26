# Operação · Lançamento (SPEC-10)

O convite é publicado no GitHub Pages por `.github/workflows/publicar.yml` a cada envio para a `main`. O
WhatsApp guarda a prévia do link, então **tudo o que aparece nela, inclusive o endereço, precisa estar
decidido antes do primeiro envio**. A spec completa está em
[SPEC-10](../specs/SPEC-10-compartilhamento-e-publicacao.md).

## Como funciona a publicação

1. Um envio para `main` dispara o workflow.
2. `pnpm verificar` roda primeiro (texto pendente, datas, links, endereço publicado, serviços externos, arte
   provisória, arquivos ausentes). **Hoje ele falha de propósito**: faltam as imagens geradas, as fotos, os MP3,
   o verso do louvor e as imagens da prévia. Enquanto falhar, nada vai ao ar.
3. `pnpm check` roda os gates de código e gera `dist/`.
4. `dist/` é publicado; o endereço do passo `deploy` aparece no GitHub.

Se o build falhar, a versão anterior continua no ar (CT-10.4).

## O que o repositório já faz

- Título, descrição, ícones e `og:*` saem de `content.previa` e `config.publicacao` (`scripts/vite/metadados.ts`),
  com `og:url` e `og:image` em endereço completo.
- `<meta name="robots" content="noindex, nofollow">` e `robots.txt` com `Disallow: /`.
- `viewport-fit=cover` e `theme-color` (azul serenidade).
- O gate barra endereço incompleto, serviço de terceiros (fonte, script, análise de visitas) e arquivos ausentes.

## Antes do primeiro envio (até 10/11/2026; envio até 15/11/2026)

| #   | Passo                                                                                                                                                                  | Quem        | Feito |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----- |
| 1   | Decidir o endereço: o provável é `https://alencarftc.github.io/convite-isa-e-neto/` (já em `config.publicacao.url`). **Não renomear o repositório depois do envio.**   | casal       | ☐     |
| 2   | Decidir se haverá domínio próprio (`public/CNAME`, registro CNAME para `alencarftc.github.io`, "Enforce HTTPS"); se sim, atualizar `config.publicacao.url`.            | casal       | ☐     |
| 3   | Em Settings › Pages do repositório, escolher a fonte **GitHub Actions**.                                                                                               | responsável | ☐     |
| 4   | Criar a imagem da prévia `public/og-image.jpg` (1200 × 630, até 300 KB): cena 16:9 recortada, selo com I&D e "Isabella & David" em Great Vibes (texto aplicado à mão). | casal       | ☐     |
| 5   | Criar `public/favicon/favicon-32.png` e `public/favicon/apple-touch-icon.png` (180 px) com o selo e as iniciais.                                                       | casal       | ☐     |
| 6   | Trocar a arte provisória, as fotos e os MP3 pelos definitivos (`pnpm verificar` lista o que falta) e preencher o verso do louvor e as descrições das fotos.            | casal       | ☐     |
| 7   | Rodar `pnpm verificar` e `pnpm check` até passarem.                                                                                                                    | responsável | ☐     |
| 8   | Colar o link numa conversa de teste no WhatsApp (iPhone e Android): imagem, título e descrição corretos (CT-10.1).                                                     | casal       | ☐     |
| 9   | Conferir o ícone na aba e, no iPhone, na tela inicial (CT-10.2).                                                                                                       | casal       | ☐     |
| 10  | Completar o checklist de testes da SPEC-12 e marcar a versão (`pnpm changeset version`, `pnpm release:tag`; a tag `v1.0` é a do envio).                                | responsável | ☐     |
| 11  | Enviar uma mensagem por família; decidir o texto que acompanha o link (questão em aberto).                                                                             | casal       | ☐     |

## Depois do envio

- Só correções críticas.
- Mudou a prévia (imagem, título, descrição)? O WhatsApp pode manter a antiga. Nos envios seguintes, use o link com
  `?v=2`, que ele trata como outro endereço. Arquivos de `public/` alterados depois do envio ganham sufixo de versão no
  nome (`og-image-v2.jpg`), porque o Pages e o WhatsApp guardam cache (RF-10.6).
- Prévia sem imagem: conferir `og:image` em `https://` com endereço completo e imagem de até 300 KB.
- Nenhum serviço de análise de visitas (RNF-10.3).
