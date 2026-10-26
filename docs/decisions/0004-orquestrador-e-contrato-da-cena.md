# ADR-0004 · Orquestrador, contrato da cena e modo de segurança

- **Status:** aceita em 2026-10-26
- **Contexto:** a SPEC-01 descreve o orquestrador como um `main.js` com `await` em sequência e
  cenas com `init(ctx)`. Em clean architecture a camada `application` não pode conhecer o DOM,
  e o convite precisa ser montado cena a cena (cada spec entrega uma), sempre chegando ao final.

## Decisão

1. **`Cena<R>` mora em `application`** com `{ init(), run(), skip(), destroy() }`. O `ctx` da spec
   (`root, content, config, state, events, audio`) vai para a **fábrica** de cada cena, em
   `presentation`, e não para `init`: assim o contrato não cita `HTMLElement`.
2. **`skip()` e `destroy()` valem mesmo sem `init()`** (ou depois de um `init()` que falhou). O
   modo de segurança depende disso: ele chama `skip()` em tudo, inclusive no final.
3. **O orquestrador recebe um `PlanoDoConvite`** (`entrada?`, `etapas[]`, `final`), montado em
   `main.ts` só com as cenas que existem. Cada spec de cena acrescenta a sua etapa; nenhuma spec
   reescreve o orquestrador. As fases intermediárias (`aguardando-bau`, `aguardando-selo`) são
   avançadas pela própria cena via `estado.definirFase`.
4. **A fase só anda para a frente** (`transicaoValida`, no domínio). `informacoes` e `seguranca`
   valem de qualquer fase e são finais: erro depois do final só é registrado (SPEC-09), exceto se o
   próprio final ainda não apareceu, caso em que o orquestrador o mostra de novo, sem animação.
5. **`falhar(erro)` é o único caminho de erro:** registra (`console.error`), muda a fase, emite
   `seguranca` (o áudio para) e chama `skip()` em todas as cenas, cada uma protegida por
   `try/catch`. `window.error` (só arquivos do próprio site) e `unhandledrejection` chegam a ele
   por `ouvirErrosGlobais`.
6. **`?erro=<cena>`** (só em desenvolvimento) troca o `run()` da cena por uma rejeição
   (`comErroForcado`), para provar o modo de segurança sem quebrar código de verdade (CT-01.7).
7. **O pré-carregamento e o desbloqueio de áudio não ficam no orquestrador:** a cena de entrada
   (SPEC-02) cuida do carregamento por trás da névoa, e o áudio escuta `entrada:tocou`, emitido
   dentro do gesto do toque (SPEC-08). O orquestrador só espera `entrada.run()`.

## Consequências

- O orquestrador é testável com cenas falsas, sem DOM nem GSAP (cobertura de `application` ≥ 95%).
- Quem escreve uma cena nova precisa garantir `skip()` e `destroy()` idempotentes e independentes
  de `init()`.
- O `ctx` completo só existe a partir das specs de cena; até lá, a fábrica recebe só o que usa.
