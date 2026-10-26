# ADR-0009 · Compatibilidade com aparelhos antigos e plano B

- **Status:** aceita em 2026-10-26
- **Contexto:** a SPEC-15 (revisão B2) apontou que o CSS usava recursos recentes sem alternativa
  (`color-mix()`, `dvh`, media queries de faixa) e que o JavaScript ia num pacote único: se ele não
  iniciasse, o convidado ficava preso na entrada. O público inclui pessoas pouco acostumadas com
  tecnologia, em aparelhos mais velhos, abrindo o link dentro do WhatsApp.

## Decisão

1. **O que o convite promete atender** está no `browserslist` do `package.json`: Chrome, Edge e Firefox
   90 ou mais, Safari e iOS 15.1 ou mais. O piso 15.1 mantém o iPhone 6s, o 7 e o SE de 1ª geração,
   que ficam no iOS 15. A lista é a única fonte: `scripts/vite/alvo.ts` a converte em `build.target`.
2. **Sem `browserslist-to-esbuild` nem biblioteca de consulta:** o conversor aceita só
   "navegador >= versão" e falha em qualquer outra forma (não ignora em silêncio). Evita uma
   dependência (e o banco do caniuse) por causa de cinco linhas.
3. **`color-mix()` sai.** Cada uso virou um token pré-calculado com transparência em hexadecimal de
   8 dígitos (`--cor-marfim-88`, `--cor-luz-45`…), e a mistura opaca de luz sobre marfim virou
   `--cor-luz-claro`. O Stylelint proíbe `color-mix`, e um teste confere que o nome do token bate com a
   cor de base e com a opacidade.
4. **`dvh` sempre vem depois de `vh`** no mesmo bloco, como alternativa; o teste lê os `.css` e falha
   se faltar. **Media queries** voltaram à notação clássica (`min-width`, `max-width`), imposta pelo
   Stylelint (`media-feature-range-notation: prefix`).
5. **O pacote é construído de verdade num teste** (`tests/integration/pacote-compativel.test.ts`) e o
   resultado é lido com o `acorn` em ES2022: sem blocos estáticos de classe nem `#campo in objeto`
   (Safari 16.4). `acorn` entra só como dependência de desenvolvimento.
6. **Plano B:** um script inline de menos de 0,5 kB no `<head>` (`scripts/vite/plano-b.ts`, ES5, sem
   dependência) liga a classe `plano-b` no `<html>` se o pacote não deixar a marca
   `window.__convite = 'iniciou'` em `config.duracoes.limitePlanoB` (10 s) ou se o
   `<script type="module">` falhar ao carregar (`error` em captura, pois não borbulha). A classe esconde
   `#app` e mostra o texto simples; quando o pacote chega depois, `main.ts` marca e remove a classe.
   O contrato (classe, variável, marca) vive em `src/domain/plano-b/plano-b.ts` para os dois lados
   usarem os mesmos nomes.
7. **Uma fonte para o texto simples:** `scripts/vite/texto-simples.ts` gera o bloco que o `<noscript>`
   e o plano B mostram, a partir de `content` e `config`. Os ids ficam únicos por sufixo. O HTML
   publicado tem cerca de 9 kB, longe do orçamento de 30 kB.

> **Atualização (ADR-0010):** a marca `window.__convite` passou a ser deixada quando a montagem termina
> sem erro, não na primeira linha do `main.ts`; o script do `<head>` também reage a erro de execução do
> próprio site, e as fotos do texto simples esperam em `data-src`. O resto da decisão vale.

## Consequências

- Um aparelho de fora do alvo, com o pacote funcionando, continua abrindo o convite, só pode perder
  alguma sutileza visual; o plano B só entra quando o JavaScript não inicia.
- A marca no `main.ts` vem **depois** dos imports: se um import quebrar a avaliação do módulo, a marca
  não é deixada e o plano B entra. Se o pacote quebrar depois da marca, vale o modo de segurança
  (ADR-0008).
- O limite de 10 s é uma proposta (SPEC-15, questão em aberto): em rede muito lenta o convidado vê o
  texto simples antes de o convite carregar, e o convite assume quando chegar.
- Falta conferir em aparelho real (CT-15.5); a matriz de testes ganhou a linha.
