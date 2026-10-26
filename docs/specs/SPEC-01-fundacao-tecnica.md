# SPEC-01 · Fundação técnica

> Espelho local da sub-aba "SPEC-01 · Fundação técnica" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon
> **Nota de implementação:** o projeto adota TypeScript e clean architecture (ver [ADR-0001](../decisions/0001-typescript-e-clean-architecture.md)). Onde esta spec diz `.js`, leia `.ts`; o mapeamento de módulos está em [`arquitetura.md`](../arquitetura.md).

**Histórias:** US-01.1, US-01.2, US-01.3, US-01.4 · **Prioridade:** Must · **Pontos:** 12

## Resumo

A fundação é um projeto Vite com JavaScript puro, em que cada cena é um módulo com o mesmo contrato e um orquestrador as encadeia. Textos, datas, links e durações ficam fora das cenas, em `content.js` e `config.js`; cores, fontes e camadas ficam em variáveis CSS. Um modo de segurança garante que, se algo falhar, o convidado ainda veja a carta e as informações.

## Escopo

**Dentro:** repositório, configuração do Vite, estrutura de pastas, orquestrador, contrato das cenas, barramento de eventos, estado global, `content.js`, `config.js`, tokens CSS, modo de segurança e ferramentas de teste em desenvolvimento.

**Fora:** a animação de cada cena (SPEC-02 a SPEC-07), o áudio (SPEC-08) e a publicação (SPEC-10).

## Comportamento: estados do orquestrador

| Estado | Entra quando | Sai quando | Spec |
| --- | --- | --- | --- |
| `carregando` | A página abre | Imagens críticas prontas ou 8 s | SPEC-02 |
| `aguardando-entrada` | "Toque para entrar" aparece | Toque em Entrar ou em Pular | SPEC-02 |
| `bosque` | Toque de entrada | Bosque revelado (3 s) | SPEC-03 |
| `aguardando-bau` | Fim do bosque | Toque no baú ou na chave | SPEC-04 |
| `bau` | Toque no baú | Tampa aberta (2 s) | SPEC-04 |
| `historia` | Tampa aberta | Último balão sai (15 s) | SPEC-05 |
| `carta` | Fim da história | Envelope pousado (3 s) | SPEC-06 |
| `aguardando-selo` | Envelope pousado | Toque no selo ou 4 s | SPEC-06 |
| `convite` | Selo rompido | Carta aberta (7 s) | SPEC-06 |
| `informacoes` | Carta aberta, Pular ou animação reduzida | — (estado final) | SPEC-07 |
| `seguranca` | Erro, falta de imagem ou mais de 20 s sem bosque | — (estado final) | SPEC-09 |

## Requisitos funcionais

- **RF-01.1** O projeto usa Vite com o modelo de JavaScript puro, Node 20 ou mais novo e os comandos `dev`, `build` e `preview`. *(proposta)*
- **RF-01.2** O `vite.config.js` usa `base: './'`, para que o build funcione em qualquer subpasta do GitHub Pages.
- **RF-01.3** As pastas seguem a estrutura da aba "Documentação do projeto".
- **RF-01.4** `src/content.js` exporta `content` e `src/config.js` exporta `config`, nos formatos desta spec; as cenas só leem textos, datas, links e tempos desses dois arquivos.
- **RF-01.5** `src/styles/tokens.css` define todas as cores, fontes, tamanhos, espaçamentos e camadas; os demais arquivos CSS só usam essas variáveis.
- **RF-01.6** Cada cena em `src/scenes/` exporta o contrato `{ init, run, skip, destroy }` descrito abaixo.
- **RF-01.7** Um barramento de eventos (`src/events.js`) oferece `on`, `off` e `emit`; os eventos válidos estão na tabela desta spec.
- **RF-01.8** Um objeto `state` guarda a fase atual, se o som está ligado, se é uma visita repetida e se a animação reduzida está ativa.
- **RF-01.9** Qualquer erro numa cena, `window.onerror` ou `unhandledrejection` leva ao modo de segurança (SPEC-09) e registra o erro com `console.error`.
- **RF-01.10** Só em desenvolvimento, aceitar `?data=AAAA-MM-DDTHH:MM` para simular a data (SPEC-07) e `?erro=<cena>` para forçar um erro numa cena.

## Requisitos não funcionais

- **RNF-01.1** Módulos ES, sem framework de interface; dependências de produção: só GSAP e a biblioteca de áudio (SPEC-08).
- **RNF-01.2** Nenhum texto visível, cor, tempo ou link escrito diretamente no código das cenas.
- **RNF-01.3** Comentários e nomes de funções em português, para casar com o conteúdo e com esta documentação.
- **RNF-01.4** O `index.html` já nasce com fundo marfim, para nunca mostrar tela branca (SPEC-02).

## Desenho técnico

**Contrato de cada cena**

```js
// src/scenes/<cena>.js
export default {
  init(ctx) {},   // monta o DOM da cena e prepara as timelines (pausadas); ctx = { root, content, config, state, events, audio }
  run() {},       // toca a cena e devolve uma Promise que resolve quando a cena termina (inclusive a espera por toque)
  skip() {},      // leva a cena direto ao estado final, sem animação (usado por Pular, animação reduzida e modo de segurança)
  destroy() {},   // remove ouvintes e mata timelines (gsap.context().revert())
};
```

**Orquestrador**

```js
// src/main.js (esboço)
async function iniciar() {
  try {
    await preload.critico();                 // SPEC-02
    const escolha = await entrada.run();      // resolve 'entrar' ou 'pular'
    audio.desbloquear();                      // SPEC-08: precisa acontecer dentro do toque
    if (escolha === 'pular' || state.reduzido) return irParaFinal();
    await bosque.run();
    await bau.run();
    await historia.run();
    await carta.run();
    await convite.run();
    informacoes.mostrar();
  } catch (erro) {
    seguranca(erro);                          // SPEC-09
  }
}

function irParaFinal() {
  [bosque, bau, historia, carta, convite].forEach(c => c.skip());
  informacoes.mostrar();
}
```

Cada `run()` usa `gsap.context()` para que `destroy()` desfaça tudo de uma vez. A fase atual vai para `state.fase` e para o atributo `data-fase` do `<body>`, para o CSS reagir a cada etapa.

**Eventos**

| Evento | Emitido por | Ouvido por | Dados |
| --- | --- | --- | --- |
| `entrada:tocou` | Entrada | Áudio, pré-carregamento | `{ escolha: 'entrar' \| 'pular' }` |
| `bosque:pronto` | Bosque | Baú | — |
| `bau:girou` | Baú | Áudio (fechadura) | — |
| `bau:abriu` | Baú | Áudio (tampa), História | — |
| `historia:inicio` | História | Áudio (música 1), Bosque (luz) | `{ duracao }` |
| `historia:balao` | História | Acessibilidade | `{ indice, frase }` |
| `historia:fim` | História | Carta | — |
| `carta:pousou` | Carta | Dica do selo | — |
| `carta:abrindo` | Carta | Áudio (selo, música 2) | `{ origem: 'toque' \| 'tempo' }` |
| `convite:aberto` | Convite | Informações, estado (visita registrada) | — |
| `som:alterado` | Botão de som | Áudio | `{ ligado }` |
| `seguranca` | Orquestrador | Todas as cenas (param) | `{ erro }` |

**Estado global**

```js
// src/state.js
export const state = {
  fase: 'carregando',
  somLigado: lerPreferencia('convite:som', true),          // SPEC-08
  visitado: lerPreferencia('convite:visitado', false),      // SPEC-09
  reduzido: matchMedia('(prefers-reduced-motion: reduce)').matches,
  toque: matchMedia('(pointer: coarse)').matches,           // SPEC-04
  orientacao: matchMedia('(orientation: portrait)').matches ? 'vertical' : 'horizontal',
};
```

`lerPreferencia` usa `localStorage` dentro de `try/catch`; se o armazenamento falhar (navegação privada, navegador interno restrito), vale o padrão.

## Conteúdo e configuração

```js
// src/config.js
export const config = {
  casamento: '2027-01-22T17:00:00-03:00',
  prazoConfirmacao: '2026-12-31T23:59:59-03:00',
  links: {
    formulario: 'https://forms.gle/yviZrELgrH2zrRGc7',
    mapa: 'https://www.google.com/maps/search/?api=1&query=R.+Na%C3%A7%C3%B5es+Unidas%2C+407+-+Benevides%2C+PA%2C+68795-000',
  },
  duracoes: {           // segundos
    nevoa: 3, bau: 2, balao: 3, carta: 3, convite: 7,
    esperaSelo: 4, dicaChave: 1.5, reforcoDica: 8,
    limiteCritico: 8, limiteSeguranca: 20,
  },
  curvas: { suave: 'sine.inOut', saida: 'power2.out', pouso: 'power3.out' },
  volumes: { ambiente: 0.35, ambienteSobMusica: 0.15, efeitos: 0.8, musica: 0.6 },   // SPEC-08
  musicas: { inicio1: 0, inicio2: 0 },   // SPEC-08: trecho inicial de cada música, em segundos
};
```

```css
/* src/styles/tokens.css */
:root {
  --cor-marfim: #F6F3E0;       /* fundo da carta e da página */
  --cor-bege: #DBCEB0;         /* envelope, cartões */
  --cor-serenidade: #91A8D0;   /* só decoração: 2,2:1 sobre marfim */
  --cor-dourado: #B18E4A;      /* só decoração: 2,8:1 sobre marfim */
  --cor-texto: #32425D;        /* 9,1:1 sobre marfim; 6,5:1 sobre bege */
  --cor-texto-suave: #4E5F7E;  /* 5,8:1 só sobre marfim (4,1:1 sobre bege: não usar) */

  --fonte-cursiva: 'Great Vibes', cursive;
  --fonte-texto: 'Cormorant Garamond', Georgia, serif;
  --texto-corpo: clamp(18px, 4.6vw, 20px);
  --texto-nomes: clamp(40px, 11vw, 56px);
  --texto-rotulo: 13px;        /* maiúsculas com letter-spacing: 0.12em */

  --espaco-1: 4px; --espaco-2: 8px; --espaco-3: 12px; --espaco-4: 16px;
  --espaco-5: 24px; --espaco-6: 32px; --espaco-7: 48px;

  --z-ceu: 0; --z-lago: 10; --z-arvores: 20; --z-bau: 30; --z-primeiro-plano: 40;
  --z-baloes: 50; --z-carta: 60; --z-informacoes: 70; --z-interface: 80; --z-nevoa: 90;
}
```

`content.js` segue a estrutura da seção "Conteúdo" da aba principal, com os textos aprovados no documento de requisitos.

## Casos de borda

| Situação | Reação |
| --- | --- |
| Recarga a quente do Vite em desenvolvimento cria cenas duplicadas | `destroy()` de todas as cenas antes de reiniciar (`import.meta.hot.dispose`) |
| Uma cena lança erro no meio da animação | O orquestrador captura, chama `skip()` nas cenas e entra no modo de segurança |
| A aba fica em segundo plano no meio de uma timeline | O GSAP segura o relógio (`lagSmoothing` padrão); ao voltar, a animação continua de onde parou |
| `localStorage` indisponível | Preferências usam o padrão e o convite segue normal |
| O aparelho gira no meio da experiência | `state.orientacao` atualiza e a cena recompõe (SPEC-03), sem reiniciar o orquestrador |

## Casos de teste

- **CT-01.1** Clonar, rodar `npm install` e `npm run dev`; abrir no computador e no celular via `--host`. *(CA-01.1.1, CA-01.1.2)*
- **CT-01.2** Rodar `npm run build` e `npm run preview`; abrir numa subpasta e conferir que imagens e fontes carregam. *(CA-01.1.3)*
- **CT-01.3** Alterar uma frase em `content.js` e uma duração em `config.js`; conferir que só aquilo mudou. *(CA-01.2.1, CA-01.2.2)*
- **CT-01.4** Buscar no código das cenas por aspas com texto em português e por `#` seguido de cor; nenhuma ocorrência fora de `content.js` e `tokens.css`. *(CA-01.2.3, CA-01.3.1)*
- **CT-01.5** Abrir com a aba Rede do navegador e conferir que nenhuma fonte vem de servidor externo. *(CA-01.3.2)*
- **CT-01.6** Percorrer o fluxo inteiro e conferir no console a sequência de `state.fase`. *(CA-01.4.1)*
- **CT-01.7** Abrir com `?erro=historia` e conferir que a carta e as informações aparecem em até 1 s. *(CA-01.4.3)*

## Questões em aberto

- Confirmar Vite e a biblioteca de áudio (SPEC-08) antes de 03/11/2026. *(Vite confirmado em 2026-10-26; áudio segue em aberto.)*
- Nome do repositório, que define o endereço no GitHub Pages (SPEC-10).
