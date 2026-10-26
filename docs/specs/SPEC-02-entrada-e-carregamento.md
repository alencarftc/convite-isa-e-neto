# SPEC-02 · Entrada e carregamento

> Espelho local da sub-aba "SPEC-02 · Entrada e carregamento" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon
> Onde esta spec diz `.js`, leia `.ts` ([ADR-0001](../decisions/0001-typescript-e-clean-architecture.md)).

**Histórias:** US-02.1, US-02.2, US-02.3, US-02.4 · **Prioridade:** Must (US-02.4 Should) · **Pontos:** 13

## Resumo

A entrada mostra a névoa e os nomes do casal no primeiro segundo, enquanto as imagens do bosque carregam por trás. Quando o essencial está pronto, aparece "Toque para entrar". Esse toque é também o gesto que libera o som. Se a internet for lenta, o convite não fica preso: segue com o que tiver e, no limite, cai no modo de segurança.

## Escopo

**Dentro:** HTML e CSS inicial, névoa em repouso, nomes, textos da entrada, botão Pular (a parte visual), pré-carregamento crítico e secundário, limites de tempo.

**Fora:** a névoa se dissipando e a revelação do bosque (SPEC-03), a lógica de áudio (SPEC-08) e a regra de quando Pular aparece (SPEC-09).

## Comportamento

| Momento | O que o convidado vê | O que acontece por trás |
| --- | --- | --- |
| 0 s | Fundo marfim e névoa já se movendo | HTML e CSS crítico já vieram no primeiro pedido; começa o pré-carregamento crítico |
| 0,2 s | "Isabella & David" surge em 0,6 s, em Great Vibes, no centro | As fontes foram pré-carregadas no `<head>` |
| Até 4 s (meta em 4G) | "Toque para entrar" e "Para uma experiência completa, aumente o volume." surgem em 0,4 s | Imagens críticas carregadas e decodificadas |
| Segunda visita | Também aparece "Pular para o convite", abaixo | `state.visitado` é verdadeiro (SPEC-09) |
| 8 s sem o crítico | Os textos aparecem mesmo assim | O carregamento continua |
| Toque | Os textos somem em 0,3 s | Libera o som, emite `entrada:tocou`, começa o carregamento secundário |
| Toque com o bosque ainda carregando | A névoa continua; surge "Preparando o bosque…" em texto discreto | O bosque só é revelado quando as imagens críticas estiverem prontas |
| 20 s depois do toque, sem bosque | A névoa dá lugar à carta e às informações | Modo de segurança (SPEC-09) |

**Névoa em repouso:** duas camadas translúcidas deslizando em sentidos opostos, cada uma até 4% da largura em 12 s, indo e voltando, com a opacidade respirando entre 0,85 e 1. Usa a imagem 7 se existir; senão, gradientes radiais em CSS.

## Requisitos funcionais

- **RF-02.1** O `index.html` traz, sem depender de JavaScript, o fundo marfim, a névoa em CSS e os nomes do casal.
- **RF-02.2** As duas fontes são pré-carregadas no `<head>` (`<link rel="preload" as="font" type="font/woff2" crossorigin>`) e usam `font-display: swap`.
- **RF-02.3** O pré-carregamento crítico baixa e decodifica (`img.decode()`) as imagens da orientação atual: céu baunilha (02), lago (04), árvores (05), primeiro plano (06), baú fechado (08) e chave (10).
- **RF-02.4** "Toque para entrar" aparece quando o crítico termina ou quando se passam `config.duracoes.limiteCritico` (8 s), o que vier primeiro.
- **RF-02.5** A área de toque da entrada cobre a tela inteira e é um `<button>` (Enter e Espaço funcionam); "Pular para o convite" é outro botão, acima dela, que não dispara a entrada.
- **RF-02.6** No toque, na mesma função do evento: liberar o áudio (SPEC-08), emitir `entrada:tocou` e resolver `entrada.run()` com `'entrar'` ou `'pular'`.
- **RF-02.7** Depois do toque, o carregamento secundário segue a ordem da tabela abaixo, sem bloquear a animação.
- **RF-02.8** Se o bosque não estiver pronto 20 s após o toque (`limiteSeguranca`), o orquestrador entra no modo de segurança.
- **RF-02.9** Se o aparelho girar antes do toque, o crítico da outra orientação também é carregado.

**Ordem do carregamento secundário**

| Ordem | Itens | Usado em |
| --- | --- | --- |
| 1 | Som ambiente e efeitos da chave e da tampa | Bosque e baú |
| 2 | Baú aberto (09), pétalas (16), balões (11), as cinco fotos | Baú e história |
| 3 | Música 1 | História |
| 4 | Céu de pôr do sol (03) | História |
| 5 | Envelope (12, 13), selo (15), papel da carta (14), som do selo | Carta |
| 6 | Casal (17), música 2 | Convite |

## Requisitos não funcionais

- **RNF-02.1** Névoa e nomes visíveis em até 1,5 s em 4G; o CSS crítico vem embutido no HTML, com até 14 KB.
- **RNF-02.2** O carregamento crítico não passa de 1,8 MB, somando as imagens, as fontes e o JavaScript (SPEC-12).
- **RNF-02.3** Imagens críticas com `fetchpriority="high"`; as secundárias, com prioridade baixa.

## Desenho técnico

**Marcação da entrada**

```html
<body data-fase="carregando">
  <section class="entrada" aria-labelledby="entrada-nomes">
    <div class="nevoa" aria-hidden="true"><span></span><span></span></div>
    <h1 id="entrada-nomes" class="entrada__nomes">Isabella &amp; David</h1>
    <button class="entrada__tocar" hidden>
      <span class="entrada__chamada">Toque para entrar</span>
      <span class="entrada__volume">Para uma experiência completa, aumente o volume.</span>
    </button>
    <button class="entrada__pular" hidden>Pular para o convite</button>
    <p class="entrada__aguarde" role="status" hidden>Preparando o bosque…</p>
  </section>
  <!-- cena, carta e informações: SPEC-03 a SPEC-07 -->
</body>
```

O texto da marcação é só para o primeiro quadro; o JavaScript reescreve os rótulos a partir de `content.entrada` (SPEC-01). `.entrada__tocar` ocupa a tela inteira (`position: fixed; inset: 0`), com os textos centralizados abaixo dos nomes.

**Módulo de pré-carregamento**

```js
// src/preload.js
export const preload = {
  critico(),            // Promise<{ completo: boolean }>; resolve em até limiteCritico
  criticoPronto(),      // Promise que só resolve quando o crítico terminar de fato
  secundario(),         // dispara a fila da tabela de ordem, sem bloquear
  imagem(chave),        // Promise<HTMLImageElement> de um asset específico (fila ou cache)
};
```

- Cada imagem: `new Image()`, `src` pelo `srcset` da orientação atual, `await img.decode()`; o resultado fica em cache por chave.
- Falha numa imagem: uma nova tentativa após 1 s; se falhar de novo, a imagem fica marcada como ausente.
- Imagem crítica ausente depois da nova tentativa: no toque, o orquestrador vai direto ao modo de segurança.

**Animações da entrada**

| Elemento | Propriedades | Duração | Curva | Quando |
| --- | --- | --- | --- | --- |
| Nomes | `opacity` 0→1, `y` 12→0 | 0,6 s | `power2.out` | 0,2 s após carregar |
| Camadas da névoa | `xPercent` ±4, `opacity` 0,85↔1 | 12 s, vai e volta | `sine.inOut` | Sempre, até o toque |
| Toque para entrar | `opacity` 0→1 | 0,4 s | `power2.out` | Crítico pronto ou 8 s |
| Textos ao tocar | `opacity` 1→0 | 0,3 s | `power2.out` | No toque |

## Conteúdo e assets

- `content.entrada.nomes`, `.tocar`, `.volume` e `.aguarde`; `content.dicas.pular`.
- Imagens 02, 04, 05, 06, 08 e 10 na orientação atual; imagem 7, se existir.
- Fontes Great Vibes e Cormorant Garamond em WOFF2.

## Casos de borda

| Situação | Reação |
| --- | --- |
| A fonte cursiva demora | Os nomes aparecem numa serifada parecida e trocam quando a fonte chega; o tamanho não pula (`size-adjust` na fonte de reserva) |
| Toque antes de "Toque para entrar" aparecer | Ignorado: o botão ainda está oculto |
| Toque duplo rápido | Só o primeiro conta: o botão fica desabilitado depois do primeiro toque |
| Aparelho girado antes do toque | Carrega também o crítico da outra orientação (RF-02.9) |
| Sem internet depois que o HTML chegou | A névoa e os nomes aparecem; após o toque e 20 s, modo de segurança com os textos que já estão no HTML |
| Imagem crítica com erro 404 | Nova tentativa; persistindo, modo de segurança no toque |

## Casos de teste

- **CT-02.1** Com a rede limitada a "Fast 4G" nas ferramentas do navegador e o cache vazio, cronometrar névoa e nomes (≤ 1,5 s) e "Toque para entrar" (≤ 4 s). *(CA-02.1.1, CA-12.1.1)*
- **CT-02.2** Gravar a tela no celular e conferir quadro a quadro que não há tela branca. *(CA-02.1.2)*
- **CT-02.3** Tocar em pontos diferentes da tela, incluindo os cantos, e usar Enter no computador. *(CA-02.2.2)*
- **CT-02.4** Com a rede "Slow 3G", conferir que "Toque para entrar" aparece aos 8 s e que o bosque só é revelado inteiro. *(CA-02.4.1)*
- **CT-02.5** Bloquear no navegador o endereço de uma imagem crítica, tocar e conferir o modo de segurança. *(CA-02.4.2)*

## Questões em aberto

- Se a imagem 7 (névoa) não ficar boa, a névoa fica só em CSS; decidir depois de gerar as imagens.
