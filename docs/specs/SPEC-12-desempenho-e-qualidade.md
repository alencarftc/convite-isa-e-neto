# SPEC-12 · Desempenho e qualidade

> Espelho local da sub-aba "SPEC-12 · Desempenho e qualidade" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon
> **Nota de implementação:** os gates de qualidade de código (lint, tipos, testes, arquitetura, build) foram ampliados no repositório; veja [`qualidade.md`](../qualidade.md). O `npm run verificar` descrito aqui é o gate de *conteúdo e orçamento* e roda junto deles. Onde esta spec diz `.js`/`.mjs`, o projeto usa TypeScript.

**Histórias:** US-12.1, US-12.2, US-12.3 · **Prioridade:** Must · **Pontos:** 8

## Resumo

A qualidade do convite é garantida por três coisas. A primeira é um orçamento de peso por arquivo, que mantém o carregamento crítico abaixo de 1,8 MB e o total abaixo de 8 MB. A segunda é uma checagem automática que roda antes de cada publicação. A terceira é uma matriz de testes em aparelhos reais, abrindo o link pelo WhatsApp, cumprida até 10/11/2026.

## Escopo

**Dentro:** orçamento de peso, metas de tempo, compatibilidade, checagem automática (`npm run verificar`), matriz de testes, critério de liberação e acompanhamento depois do envio.

**Fora:** os testes específicos de cada spec, que ficam nelas e são referenciados na matriz.

## Orçamento de peso

| Grupo | Itens | Orçamento |
| --- | --- | --- |
| Crítico: código | HTML com CSS crítico | até 30 KB |
| Crítico: código | JavaScript (GSAP, Howler.js e o código do convite), comprimido | até 120 KB |
| Crítico: fontes | Great Vibes e Cormorant Garamond, WOFF2 | até 50 KB cada |
| Crítico: imagens | 02 (300 KB), 04 (150 KB), 05 (300 KB), 06 (250 KB), 08 (150 KB), 10 (50 KB), na orientação atual | até 1,2 MB |
| **Total crítico** | | **até 1,45 MB** (meta: até 1,8 MB) |
| Secundário: imagens | 03 (300 KB), 09 (150 KB), 11a–c (80 KB cada), 12 e 13 (120 KB cada), 14 (150 KB), 15 (40 KB), 16a–c (15 KB cada), 17 (150 KB) | cerca de 1,3 MB |
| Secundário: fotos | Cinco fotos, 120 KB cada | até 600 KB |
| Áudio | Ambiente (400 KB), efeitos (65 KB), música 1 (1 MB), música 2 (2,9 MB) | cerca de 4,4 MB |
| **Total da experiência** | | **até 7,75 MB** (meta: até 8 MB) |

Cada aparelho baixa só as artes da sua orientação. A imagem 18 é reserva e só entra se substituir as camadas.

## Metas

| Medida | Meta | Como medir |
| --- | --- | --- |
| Névoa e nomes visíveis | até 1,5 s em 4G | Gravação de tela e Chrome DevTools com rede "Fast 4G" e cache vazio |
| "Toque para entrar" | até 4 s em 4G | Idem |
| Fluidez das animações | pelo menos 50 quadros por segundo num Android intermediário | Painel de desempenho do Chrome, com o aparelho conectado |
| Mudança de layout (CLS) | 0 | Lighthouse |
| Lighthouse, celular | Desempenho ≥ 80; Acessibilidade ≥ 95; Boas práticas ≥ 95 | Lighthouse no Chrome |
| Erros no console | Nenhum, no fluxo completo | Console do navegador, no computador e no Android conectado |

## Compatibilidade

| Ambiente | Prioridade | Observações |
| --- | --- | --- |
| WhatsApp no iPhone (navegador interno), iOS atual e anterior | Crítica | O armazenamento pode ser separado do Safari: quem abrir depois no Safari não verá "Pular". Aceitável |
| WhatsApp no Android (navegador interno do sistema), versões recentes | Crítica | Conferir a abertura do formulário e do mapa fora do WhatsApp |
| Safari no iPhone e Chrome no Android | Alta | Quem abre o link pelo navegador |
| iPad e tablets Android | Média | Usam as artes da orientação em que estiverem |
| Chrome, Edge, Safari e Firefox no computador, versões atuais | Média | Cursor de chave e profundidade com o mouse |

## Checagem automática

`npm run verificar` roda `scripts/verificar.mjs` antes de cada build, inclusive na automação de publicação (SPEC-10). Se qualquer item falhar, nada é publicado.

| Checagem | Falha quando |
| --- | --- |
| Texto pendente | `content.js` tem texto entre colchetes, como `[verso do louvor]` ou `[descrever a foto 1]` |
| Assets ausentes | Algum arquivo citado em `content.js`, `config.js`, `index.html` ou no CSS não existe |
| Peso por arquivo | Algum arquivo passa do orçamento desta spec |
| Datas | `config.casamento` ou `config.prazoConfirmacao` não são datas válidas com `-03:00` |
| Links | `config.links.formulario` e `config.links.mapa` não começam com `https://` |
| `<noscript>` | Os nomes, a data e os links do `<noscript>` não batem com `content.js` e `config.js` |
| Prévia | `og:image` e `og:url` não são endereços completos, ou `og-image.jpg` passa de 300 KB |

```js
// scripts/verificar.mjs (esboço)
import { content } from '../src/content.js';
import { config } from '../src/config.js';
const erros = [];
const textos = JSON.stringify(content);
const pendentes = textos.match(/\[[^\]]+\]/g);
if (pendentes) erros.push(`Texto pendente: ${pendentes.join(', ')}`);
// … demais checagens da tabela
if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
console.log('Tudo certo para publicar.');
```

## Matriz de testes

Marque cada célula com ✓ (passou) ou ✗ (falhou) e a data. Cada linha reúne os casos de teste das specs.

| Cenário | Casos de teste | iPhone · WhatsApp | iPhone · Safari | Android · WhatsApp | Android · Chrome | Computador |
| --- | --- | --- | --- | --- | --- | --- |
| Primeira visita completa | CT-02.1 a CT-06.5 | | | | | |
| Som: ambiente, efeitos, músicas, botão | CT-08.1 a CT-08.5 | | | | | |
| Modo silencioso do iPhone | CT-08.6 | | | — | — | — |
| Sair e voltar ao aplicativo | CT-08.5 | | | | | — |
| Acelerar a história e esperar o selo | CT-05.3, CT-06.3 | | | | | |
| Girar o aparelho | CT-03.6 | | | | | — |
| Segunda visita e Pular | CT-09.2 | | | | | |
| Animação reduzida | CT-09.1 | | | | | |
| Leitor de tela | CT-05.6, CT-09.3 | | — | | — | — |
| Teclado | CT-04.6, CT-09.4 | — | — | — | — | |
| Rede lenta e falha de imagem | CT-02.4, CT-02.5, CT-09.7 | — | — | — | — | |
| Estados por data | CT-07.7 | — | — | — | — | |
| Confirmar presença e Como chegar | CT-07.5, CT-07.6 | | | | | |
| Formulário e planilha | CT-11.1 a CT-11.5 | | — | | — | |
| Prévia do link | CT-10.1 | | — | | — | — |

## Critério de liberação

O convite só é enviado quando:

- [ ] Todos os critérios de aceite das histórias Must passam.
- [ ] As colunas "WhatsApp" da matriz estão completas, sem ✗.
- [ ] `npm run verificar` passa e o console não mostra erros no fluxo completo.
- [ ] As metas de tempo e as notas do Lighthouse foram atingidas.
- [ ] As respostas de teste foram apagadas do formulário e da planilha.
- [ ] Isabella aprovou o convite publicado, no próprio celular.

## Acompanhamento depois do envio

| Quando | O que conferir |
| --- | --- |
| No dia do envio | Prévia do link e as primeiras respostas chegando na planilha |
| Uma vez por semana | O site no ar e o resumo da planilha com o casal |
| 01/01/2027 | Formulário fechado e botão substituído pelo aviso no convite |
| 22/01/2027 | "É hoje! Nos vemos às 17h." |
| 23/01/2027 | Mensagem de agradecimento no lugar da contagem |

## Casos de teste

- **CT-12.1** Medir os tempos da tabela de metas com o cache vazio. *(CA-12.1.1)*
- **CT-12.2** Somar os arquivos em `dist/` e conferir o orçamento. *(CA-12.1.2)*
- **CT-12.3** Cumprir as colunas "WhatsApp" da matriz. *(CA-12.2.1)*
- **CT-12.4** Conferir o critério de liberação inteiro até 10/11/2026. *(CA-12.3.1, CA-12.3.2)*

## Questões em aberto

- Quais aparelhos reais estão disponíveis para a matriz (o seu, o da sua esposa, o dos noivos).
- Se o Lighthouse ficar abaixo da meta por causa do peso das imagens, aceitar ou reduzir a qualidade das camadas maiores (céu e árvores).
