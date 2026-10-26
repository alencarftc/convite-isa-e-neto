# SPEC-09 · Acessibilidade e alternativas

> Espelho local da sub-aba "SPEC-09 · Acessibilidade e alternativas" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon
> Onde esta spec diz `.js`, leia `.ts` ([ADR-0001](../decisions/0001-typescript-e-clean-architecture.md)).

**Histórias:** US-09.1 a US-09.5 · **Prioridade:** Must (US-09.2 e US-09.3 Should) · **Pontos:** 13

## Resumo

O convite tem que chegar a todas as famílias, inclusive a quem não pode ver animações, não ouve, usa leitor de tela, está com o aparelho falhando ou volta só para pegar o endereço. Esta spec define os quatro caminhos alternativos (animação reduzida, pular, leitor de tela e teclado, e modo de segurança) e as regras de legibilidade que valem em todas as cenas.

## Escopo

**Dentro:** animação reduzida, "Pular para o convite", atalho para leitor de tela e teclado, estrutura semântica, gestão de foco, regiões anunciadas, contraste, tamanho de texto, zoom, áreas de toque, modo de segurança e `<noscript>`.

**Fora:** as animações em si (SPEC-02 a SPEC-07) e o som (SPEC-08).

## Comportamento: os caminhos

| Caminho | Quando | O que o convidado vê |
| --- | --- | --- |
| Completo | Padrão | Entrada, bosque, baú, história, carta, convite, informações |
| Animação reduzida | `prefers-reduced-motion: reduce` | Entrada com toque (para liberar o som) → esmaecimento de 0,4 s → cena já no pôr do sol com o casal, carta aberta e informações; música 2 |
| Pular | Segunda visita no mesmo aparelho, tocando em "Pular para o convite" | Igual ao estado final do caminho completo, com a música 2 |
| Atalho de leitor de tela e teclado | Sempre; o botão só fica visível ao receber foco | "Ir direto ao convite": mesmo destino de Pular |
| Modo de segurança | Erro numa cena, imagem crítica ausente ou bosque não carregado 20 s após o toque | Fundo marfim, sem cena, carta e informações; sem som |
| Sem JavaScript | JavaScript desligado ou não carregado | Conteúdo do `<noscript>`: a carta em texto simples e os links de confirmação e mapa |

O atalho "Ir direto ao convite" é um acréscimo técnico de acessibilidade: não aparece para quem navega com o dedo ou o mouse e não muda a decisão de mostrar "Pular" só a partir da segunda visita.

## Requisitos funcionais

- **RF-09.1** `state.reduzido` vem de `matchMedia('(prefers-reduced-motion: reduce)')` e é lido no carregamento; com ele, o orquestrador chama `irParaFinal()` depois do toque de entrada (SPEC-01).
- **RF-09.2** Com animação reduzida, também não há profundidade, névoa em movimento, pétalas nem surgimento dos cartões por rolagem; o botão de som e os links funcionam igual.
- **RF-09.3** Em `convite:aberto`, grava-se `convite:visitado = true`; na visita seguinte, a entrada mostra "Pular para o convite" (`content.dicas.pular`) abaixo de "Toque para entrar".
- **RF-09.4** O primeiro elemento focável da página é "Ir direto ao convite", visível só com foco (`.visualmente-oculto:focus` vira visível).
- **RF-09.5** Estrutura: `<html lang="pt-BR">`; `h1` com os nomes na entrada; `<main>` com a carta (`h2`) e as informações (`h3` nos cartões); a cena e as imagens decorativas com `aria-hidden="true"` e `alt=""`.
- **RF-09.6** Foco ao longo do caminho completo: no botão do baú quando ele é habilitado, no botão de avançar durante a história, no botão do envelope quando ele pousa e no título da carta em `convite:aberto`. Os elementos ainda não revelados ficam com `inert`.
- **RF-09.7** Regiões anunciadas (`aria-live="polite"`): dicas (chave, selo), frases da história e "Preparando o bosque…". A contagem não é anunciada.
- **RF-09.8** Modo de segurança (`seguranca(erro)`): chama `skip()` em todas as cenas, esconde a cena, remove `inert` da carta e das informações, libera a rolagem, para o áudio e leva o foco ao título da carta, tudo em até 1 s depois do erro.
- **RF-09.9** O `<noscript>` traz a carta (blocos 1 a 14 da SPEC-06), o dress code e os links "Confirmar presença" e "Como chegar", com estilo mínimo em CSS.

## Requisitos não funcionais

| Regra | Valor | Onde se verifica |
| --- | --- | --- |
| Contraste de texto | Pelo menos 4,5:1; texto principal 9,1:1 (azul-noite sobre marfim) | Tokens (SPEC-01) |
| Texto sobre a cena | Sempre sobre uma etiqueta marfim (balões, dicas) | SPEC-04, SPEC-05, SPEC-06 |
| Tamanho do corpo | Pelo menos 18 px no celular | `--texto-corpo` |
| Zoom | Permitido: o `viewport` não usa `user-scalable=no` nem `maximum-scale` | `index.html` |
| Áreas de toque | Pelo menos 44 × 44 px; botões principais 48 px de altura; selo 64 × 64 px | SPEC-04, SPEC-06, SPEC-07, SPEC-08 |
| Foco | Sempre visível: contorno de 3 px `--cor-dourado` | Estilos base |
| Texto | Sempre HTML, nunca dentro de imagem | Todas |
| Pisca | Nada pisca mais de 3 vezes por segundo | Todas as animações |

## Desenho técnico

**Modo de segurança**

```js
// src/seguranca.js (esboço)
let ativo = false;
export function seguranca(erro) {
  if (ativo) return;
  ativo = true;
  console.error('[convite] modo de segurança', erro);
  state.fase = 'seguranca';
  document.body.dataset.fase = 'seguranca';
  try { cenas.forEach(c => c.skip()); } catch {}
  try { audio.parar(); } catch {}
  document.querySelector('.conteudo').inert = false;
  document.body.style.overflow = '';
  document.getElementById('carta-titulo').focus();
}
window.addEventListener('error', e => {
  if (e.filename && e.filename.startsWith(location.origin)) seguranca(e.error);   // ignora extensões do navegador
});
window.addEventListener('unhandledrejection', e => seguranca(e.reason));
```

```css
body[data-fase="seguranca"] .cena,
body[data-fase="seguranca"] .entrada,
body[data-fase="seguranca"] .envelope { display: none; }
body[data-fase="seguranca"] .conteudo { opacity: 1; margin-top: var(--espaco-7); }
```

O modo de segurança não depende do GSAP: se a própria biblioteca falhar ao carregar, o CSS e as poucas linhas acima ainda mostram a carta.

**Animação reduzida com GSAP**

```js
const mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: reduce)', () => { state.reduzido = true; });
```

**Visita registrada**

`convite:visitado` fica no `localStorage`. Se o armazenamento falhar, cada visita conta como primeira e "Pular" não aparece; o atalho de teclado continua disponível.

## Conteúdo e assets

- `content.dicas.pular` ("Pular para o convite") e `content.dicas.atalho` ("Ir direto ao convite").
- O `<noscript>` repete os textos de `content.carta`, `content.dressCode` e os links de `config.links`. Essa é a única exceção à regra de não escrever texto no HTML (CA-01.2.3); o build confere que os textos são iguais (SPEC-12).

## Casos de borda

| Situação | Reação |
| --- | --- |
| Erro depois de `convite:aberto` (por exemplo, na contagem) | O modo de segurança não muda o que já está visível; só registra o erro |
| Animação reduzida ativada no meio da experiência | O caminho já escolhido continua; a preferência vale na próxima visita |
| Leitor de tela com o caminho completo | Cada etapa anuncia o botão e a dica; quem preferir usa o atalho |
| Zoom de 200% no celular | A carta e os cartões se reorganizam em uma coluna, sem rolagem lateral |
| Erro de uma extensão do navegador no computador | Pode disparar `window.onerror`. Para evitar falso positivo, o modo de segurança só vale para erros cujo arquivo de origem seja do próprio site |

## Casos de teste

- **CT-09.1** Ativar "reduzir movimento" (iPhone: Acessibilidade › Movimento; Android: Acessibilidade › Remover animações) e abrir: toque, esmaecimento, carta aberta com o casal, sem balões. *(CA-09.1.1, CA-09.1.2)*
- **CT-09.2** Abrir o convite até o fim, fechar e abrir de novo: "Pular para o convite" aparece e leva à carta com a música 2. *(CA-09.2.1, CA-09.2.2)*
- **CT-09.3** Com VoiceOver e com TalkBack, percorrer do início ao fim e anotar o que é lido em cada etapa. *(CA-09.3.1)*
- **CT-09.4** No computador, só com Tab, Enter e Espaço: usar o atalho e, numa segunda rodada, o caminho completo; o foco fica sempre visível. *(CA-09.3.2)*
- **CT-09.5** Com zoom de 200%, ler a carta e usar os botões sem rolagem lateral. *(CA-09.4.1, CA-09.4.2)*
- **CT-09.6** Desligar o JavaScript e abrir: o `<noscript>` mostra a carta e os links. *(CA-09.5.1)*
- **CT-09.7** Abrir com `?erro=bau` e, numa segunda rodada, bloquear o arquivo do GSAP: a carta aparece em até 1 s. *(CA-09.5.2)*

## Questões em aberto

- Se, com animação reduzida, as cinco frases e fotos aparecem de forma estática abaixo da carta (também listada na SPEC-05).
