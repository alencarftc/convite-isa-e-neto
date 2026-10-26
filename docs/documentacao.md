# Convite Isabella & David — Documentação do projeto

> Espelho local do documento "Convite Isabella & David — Documentação do projeto" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon
> Ao divergir, vale o documento de origem; atualize este arquivo e registre a mudança em `docs/decisions/` se for uma decisão.

2026-10-26 · Felipe

## Visão geral

O projeto é um convite digital interativo para o casamento de Isabella Vaz e David Neto, enviado por WhatsApp, uma vez por família. A experiência tem uma abertura cinematográfica de 30 segundos num bosque pintado, uma carta de amor e a confirmação de presença ao final. Este documento registra como o site é construído; o que ele precisa fazer está no documento de requisitos.

| Item | Valor |
| --- | --- |
| Requisitos e roteiro aprovado | [Requisitos e preferências](./requisitos.md) |
| Formulário de confirmação | [forms.gle/yviZrELgrH2zrRGc7](https://forms.gle/yviZrELgrH2zrRGc7) |
| Repositório | [a preencher] |
| URL publicada | [a preencher] |
| Convite pronto e testado | 2026-11-10 |
| Envio aos convidados | 2026-11-15 |
| Fim das confirmações | 2026-12-31 |
| Casamento | Sexta-feira, 22/01/2027, às 17h, no Sítio Olinda (Benevides, PA) |

O produto está quebrado em épicos e histórias em [Épicos e histórias](./epicos-e-historias.md), e cada épico tem sua especificação em [Specs](./specs/README.md).

## Stack técnica

O convite é um site estático de página única, sem servidor. Os itens marcados como **proposta** ainda podem mudar antes do desenvolvimento.

| Camada | Escolha | Situação | Observação |
| --- | --- | --- | --- |
| Linguagens | HTML, CSS e JavaScript | Proposta | Sem framework de interface; a experiência é uma sequência única |
| Build | Vite | Proposta | Servidor local, otimização e caminhos para o GitHub Pages |
| Animação | GSAP 3 | Decidido | Referência de animação e experiência: Guillaume Colombel |
| Áudio | Web Audio API ou Howler.js | Proposta | Liberação do som no primeiro toque, transição entre músicas e controle de volume |
| Fontes | Great Vibes e Cormorant Garamond | Decidido | Gratuitas (Google Fonts); hospedar junto do site para não depender de rede externa |
| Hospedagem | GitHub Pages | Decidido | Gratuita, como o convite base |
| Confirmação de presença | Google Forms | Decidido | Aberto em nova aba pelo botão "Confirmar presença" |
| Mapa | Link para o aplicativo de mapas | Decidido | Sem mapa embutido |

## Estrutura de pastas

A estrutura separa conteúdo, cenas e assets. Assim, um texto ou uma imagem muda sem mexer na animação.

```
convite-isabella-david/
├── index.html              # página única, metadados da prévia do WhatsApp
├── public/
│   ├── images/
│   │   ├── scene/          # 01 a 07: cena-mestre, céus, lago, árvores, primeiro plano, névoa
│   │   ├── objects/        # 08 a 16: baú, chave, balões, envelope, carta, selo, pétalas
│   │   ├── couple/         # 17 e 18: casal de costas, cena final
│   │   └── photos/         # fotos reais dos balões
│   ├── audio/              # ambiente, efeitos, música 1, música 2
│   ├── fonts/              # Great Vibes, Cormorant Garamond
│   ├── og-image.jpg        # prévia do WhatsApp, 1200×630
│   └── favicon/            # ícones 32 e 180 px
├── src/
│   ├── main.js             # inicialização e ordem das cenas
│   ├── content.js          # todos os textos do convite
│   ├── config.js           # datas, links, durações
│   ├── scenes/             # entrada, bosque, baú, história, carta, informações
│   ├── audio.js            # liberação do som, camadas, transições
│   ├── cursor.js           # chave no computador, chave flutuante no celular
│   ├── countdown.js        # contagem regressiva e estados do dia e depois
│   ├── preload.js          # carregamento das imagens durante a névoa
│   └── styles/             # base, tipografia, paleta, carta, botões
├── docs/                   # cópia desta documentação, se útil
└── README.md
```

## Como rodar e publicar

Os comandos abaixo assumem a stack proposta (Vite). Ajuste-os se a stack mudar.

**Rodar localmente**

```bash
npm install
npm run dev       # abre em http://localhost:5173
```

Para testar no celular durante o desenvolvimento, rode `npm run dev -- --host` e abra o endereço de rede no aparelho, na mesma rede Wi-Fi.

**Publicar no GitHub Pages**

1. Ajuste `base` no `vite.config.js` para o nome do repositório.
2. Rode `npm run build`; o site sai na pasta `dist/`.
3. Publique `dist/` no GitHub Pages, pela branch `gh-pages` ou por GitHub Actions.
4. Abra a URL publicada no celular e confira a prévia do link no WhatsApp antes do primeiro envio.

**Depois de publicar**

O WhatsApp guarda a prévia do link em cache. Se a imagem, o título ou a descrição mudarem depois de alguém compartilhar o link, a prévia antiga pode continuar aparecendo.

## Fluxo da experiência

> [Diagrama/gráfico interativo omitido na exportação: Fluxo da experiência · rascunho 2 aprovado em 25/10/2026]

O fluxo segue o rascunho 2 aprovado no documento de requisitos. O convidado toca três vezes: para entrar, no baú e, se quiser, no selo. Os atalhos levam direto às informações, sem a abertura.

## Animações

Cada passo do roteiro tem sua timeline do GSAP, e uma timeline principal as encadeia. As esperas por toque ficam fora das timelines: a sequência pausa e só retoma quando o convidado age.

| Timeline | Passo | Duração-alvo | Começa com | Termina com |
| --- | --- | --- | --- | --- |
| `tlEntrada` | Névoa e "Toque para entrar" | Em loop até o toque | Carregamento concluído | Toque na tela |
| `tlBosque` | 1. Bosque | 3 s | Névoa se dissipando | Chave visível; espera o toque no baú |
| `tlBau` | 2. Baú | 2 s | Toque no baú | Tampa aberta |
| `tlHistoria` | 3. História | 15 s | Primeiro balão | Último balão sumindo no céu |
| `tlCarta` | 4. Carta | 3 s | Envelope pousando | Espera o toque no selo, ou 4 s |
| `tlConvite` | 5. Convite | 7 s | Selo se rompendo | Carta aberta; libera a rolagem |

**Convenções de movimento**

- **Delicadeza:** curvas suaves (`sine.inOut`, `power2.out`), sem cortes secos. A luz e o céu mudam por esmaecimento.
- **Impacto:** fica concentrado no passo 5, quando a carta se desdobra, a luz dourada aparece e a música sobe.
- **Tom divertido:** balanço leve nos balões e na chave flutuante, e um pequeno salto da tampa do baú ao abrir.
- **Acelerar:** um toque durante a história aumenta a velocidade de `tlHistoria` (`timeScale`) em vez de pular balões.
- **Profundidade:** as camadas do cenário se movem em velocidades diferentes. No computador, acompanham o mouse; no celular, fazem uma deriva lenta e automática.
- **Animação reduzida:** com `prefers-reduced-motion`, via `gsap.matchMedia()`, as timelines viram esmaecimentos curtos e a carta aparece direto.

## Assets

Os prompts e as regras de geração das imagens estão na seção "Imagens a gerar" do documento de requisitos. Aqui fica o controle de arquivos: nome, pasta e status. Imagens em WebP, com até cerca de 300 KB por cena e 150 KB por objeto.

**Imagens**

| # | Arquivo | Conteúdo | Status |
| --- | --- | --- | --- |
| 01 | `scene/01-cena-mestre-9x16.webp` e `-16x9.webp` | Cena-mestre do bosque |  |
| 02 | `scene/02-ceu-baunilha.webp` | Céu baunilha |  |
| 03 | `scene/03-ceu-por-do-sol.webp` | Céu de pôr do sol |  |
| 04 | `scene/04-lago.webp` | Lago e mata ao fundo |  |
| 05 | `scene/05-arvores.webp` | Árvores de moldura |  |
| 06 | `scene/06-primeiro-plano.webp` | Grama e rosas azuis |  |
| 07 | `scene/07-nevoa.webp` | Névoa (opcional) |  |
| 08 | `objects/08-bau-fechado.webp` | Baú fechado |  |
| 09 | `objects/09-bau-aberto.webp` | Baú aberto |  |
| 10 | `objects/10-chave.webp` | Chave |  |
| 11 | `objects/11-balao-a.webp`, `-b`, `-c` | Balão-nuvem, 3 variações |  |
| 12 | `objects/12-envelope-fechado.webp` | Envelope fechado |  |
| 13 | `objects/13-envelope-aberto.webp` | Envelope aberto |  |
| 14 | `objects/14-papel-carta.webp` | Papel da carta |  |
| 15 | `objects/15-selo.webp` | Selo de cera |  |
| 16 | `objects/16-petala-a.webp`, `-b`, `-c` | Pétala azul, 3 variações |  |
| 17 | `couple/17-casal-costas.webp` | Casal de costas |  |
| 18 | `couple/18-cena-final-9x16.webp` e `-16x9.webp` | Cena final com o casal (reserva) |  |

**Áudio**

| Arquivo | Conteúdo | Quando toca | Status |
| --- | --- | --- | --- |
| `audio/ambiente.mp3` | Vento leve, grama, aves, em loop | Do toque de entrada até o fim, baixo sob as músicas |  |
| `audio/fechadura.mp3` | Chave girando | Passo 2 |  |
| `audio/tampa.mp3` | Tampa do baú abrindo | Passo 2 |  |
| `audio/selo.mp3` | Selo de cera se rompendo, papel | Passo 5 |  |
| `audio/musica-1.mp3` | "Bondade de Deus", instrumental licenciada | Passos 3 e 4 |  |
| `audio/musica-2.mp3` | "Ousado Amor", instrumental licenciada | Passo 5 em diante |  |

**Outros**

| Arquivo | Conteúdo | Status |
| --- | --- | --- |
| `photos/foto-1.jpg` a `foto-5.jpg` | Fotos reais dos balões (pendentes com o casal) |  |
| `fonts/` | Great Vibes e Cormorant Garamond, em WOFF2 |  |
| `og-image.jpg` | Prévia do WhatsApp, 1200×630 |  |
| `favicon/` | Selo com I&D, 32 e 180 px |  |
| Cursor | Chave em 48 px, derivada da imagem 10 |  |

## Conteúdo

Todos os textos ficam em `src/content.js`, e datas, links e durações ficam em `src/config.js`. A versão aprovada dos textos está na seção "Textos do convite" do documento de requisitos; qualquer mudança vale primeiro lá e depois aqui.

O convite é um só para todas as famílias, sem link personalizado. Por isso, nenhum texto depende do nome do convidado.

```js
// src/content.js — estrutura
export const content = {
  entrada: { nomes, tocar, volume, aguarde },
  dicas: { chaveComputador, chaveCelular, avancar, selo, rolar, pular, atalho, somLigado, somDesligado },
  baloes: [ /* 5 frases, até 8 palavras cada */ ],
  envelope: { para },
  carta: { versiculo, referencia, bencao, paisNoiva, paisNoivo, nomes, convite, data, cerimonia, local, endereco, fecho, referenciaFecho, despedida, assinatura },
  contagem: { antes, noDia, depois },
  mensagem: { paragrafos, versoLouvor, assinatura },
  dressCode,
  botoes: { confirmar, prazo, comoChegar, encerrado },
};

// src/config.js — estrutura
export const config = {
  casamento: '2027-01-22T17:00:00-03:00',
  prazoConfirmacao: '2026-12-31T23:59:59-03:00',
  links: { formulario: 'https://forms.gle/yviZrELgrH2zrRGc7', mapa: '<link do Google Maps, ver SPEC-01>' },
  duracoes: { nevoa: 3, bau: 2, balao: 3, carta: 3, convite: 7, esperaSelo: 4, dicaChave: 1.5, reforcoDica: 8, limiteCritico: 8, limiteSeguranca: 20 },
  curvas, volumes, musicas,   // valores completos na SPEC-01
};
```

## Responsividade, acessibilidade e desempenho

O convite é pensado primeiro para o celular, porque chega pelo WhatsApp.

**Responsividade**

- Cenas com a arte 9:16 na vertical e a 16:9 na horizontal, trocadas pelo próprio navegador (SPEC-03).
- A chave vira cursor só em aparelhos com mouse (`pointer: fine`). Em telas de toque, ela aparece flutuando junto à fechadura.
- Use `100dvh` para a altura das cenas, para a barra do navegador do celular não cortar a tela.

**Acessibilidade**

- Textos em azul-noite #32425D sobre marfim (9,1:1) ou bege (6,5:1). O Azul Serenidade e o dourado ficam só na decoração.
- O convite funciona inteiro sem som, e o botão de som fica sempre visível.
- Com animação reduzida ativada no aparelho, a carta aparece direto.
- Todo texto é HTML real, nunca imagem, e cada foto tem texto alternativo.
- "Pular para o convite" aparece a partir da segunda visita, guardado no aparelho do convidado.

**Desempenho**

- Meta: névoa e nomes visíveis em até 1,5 s e "Toque para entrar" em até 4 s numa rede 4G (SPEC-12).
- A névoa de entrada cobre o carregamento: as camadas do bosque carregam antes; balões, carta e músicas carregam enquanto o convidado ainda está na cena.
- Imagens em WebP com `srcset` para 9:16 e 16:9; fontes em WOFF2 com pré-carregamento.
- O áudio só começa a baixar depois do toque de entrada.

## Integrações e metadados

O convite só se conecta a dois serviços externos, ambos por link: o formulário e o mapa.

| Integração | Como funciona | Valor |
| --- | --- | --- |
| Confirmação de presença | Botão "Confirmar presença" abre o Google Forms em nova aba; some depois de 31/12/2026 | [forms.gle/yviZrELgrH2zrRGc7](https://forms.gle/yviZrELgrH2zrRGc7), criado em 26/10/2026 pelo script anexado ao documento de requisitos |
| Planilha de respostas | Criada pelo mesmo script, recebe uma linha por família | [a preencher] |
| Mapa | Botão "Como chegar" abre o endereço no aplicativo de mapas | [Google Maps](https://www.google.com/maps/search/?api=1&query=R.+Na%C3%A7%C3%B5es+Unidas%2C+407+-+Benevides%2C+PA%2C+68795-000) |

**Metadados da prévia do WhatsApp**

```html
<title>Isabella & David — Convite de casamento</title>
<meta name="description" content="Uma carta foi escrita para você. Toque para abrir.">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="Isabella & David — Convite de casamento">
<meta property="og:description" content="Uma carta foi escrita para você. Toque para abrir.">
<meta property="og:image" content="[URL publicada]/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="[URL publicada]">
<meta name="theme-color" content="#91A8D0">
```

O `og:image` precisa de endereço completo (com `https://`); caminho relativo não aparece na prévia.

## Testes

Teste sempre abrindo o link pelo próprio WhatsApp, porque ele abre o convite no navegador interno do aplicativo, que se comporta diferente do navegador normal.

**Aparelhos**

- iPhone, pelo WhatsApp (navegador interno) e pelo Safari
- Android, pelo WhatsApp (navegador interno) e pelo Chrome
- Computador: Chrome, Safari ou Edge, com mouse
- Tablet, na vertical e na horizontal

**Cenários**

- Primeira visita completa: névoa, toque, baú, história, selo, carta e informações
- Som: toca depois do toque de entrada; o botão liga e desliga; a transição entre músicas é suave
- Celular no modo silencioso: o convite funciona inteiro
- Toque para acelerar durante a história
- Sem tocar no selo: a carta abre sozinha em 4 s
- Segunda visita: aparece "Pular para o convite"
- Animação reduzida ativada no aparelho: a carta aparece direto
- Rede 4G lenta: a névoa cobre o carregamento e nada aparece pela metade
- Contagem regressiva certa no horário de Brasília, inclusive para quem está em outro fuso
- Estados de data: antes do casamento, no dia, depois; e o botão de confirmação some depois de 31/12/2026
- "Confirmar presença" abre o formulário, e uma resposta de teste chega na planilha (apague-a depois)
- "Como chegar" abre o endereço certo no aplicativo de mapas
- Prévia do link no WhatsApp com imagem, título e descrição corretos
- Revisão final dos textos e dos nomes com a noiva

## Histórico de versões

| Data | Versão | O que mudou |
| --- | --- | --- |
| 26/10/2026 | 0.1 | Documentação criada; formulário de confirmação criado por script e publicado |
| 26/10/2026 | 0.2 | 12 épicos, 52 histórias com critérios de aceite, plano de entrega e 12 specs; prompt da imagem 12 ajustado para sair sem selo |

## Pendências

- Fotos dos balões (com o casal)
- Registrar o link da planilha de respostas (formulário criado em 26/10/2026)
- Validar a cena-mestre e o casal de costas com a noiva
- Gerar e preparar as 18 imagens
- Escolher as versões instrumentais licenciadas das músicas e os efeitos sonoros
- Inserir o verso do louvor na mensagem do casal
- Confirmar a stack (Vite e áudio) e criar o repositório
- Publicar e preencher a URL final
