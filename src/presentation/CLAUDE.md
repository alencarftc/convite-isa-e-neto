# src/presentation

Cenas, componentes, DOM e animação (GSAP). É a única camada que desenha.

- Pode importar `application`, `domain` e GSAP. **Nunca** `infrastructure`: as portas chegam por `ctx`
  (`{ root, content, config, state, events, audio }`, SPEC-01) ou por parâmetro.
- Cena segue o contrato `{ init, run, skip, destroy }`; `run()` devolve `Promise`; use
  `gsap.context()` para o `destroy()` desfazer tudo; `skip()` leva ao estado final sem animação.
- **Sem literais:** texto de `content`, tempo/curva de `config`, cor/camada de `tokens.css`.
- Anime só `transform` e `opacity`. Respeite `prefers-reduced-motion` (`gsap.matchMedia()`), `100dvh`,
  áreas de toque ≥ 44 px, foco visível, `aria-live` onde a spec manda. Todo texto é HTML real.
- Monte DOM com `createElement`/`textContent` (nunca `innerHTML` com conteúdo); os helpers `criar` e
  `criarImagem` estão em `dom.ts`.
- **`init()` não pede imagem de etapa.** Ele roda antes do toque de entrada: um `<img src>` ali baixa a
  experiência inteira de uma vez (SPEC-02, RF-02.7). Só as críticas e o que o estado final mostra levam
  `src` no `init()`; o resto usa `criarImagem(..., true)` e `carregarImagensTardias` no `run()`
  (`imagens/imagens-tardias.ts`). O teste de abertura em `composicao.test.ts` pega a volta do problema.
- Nada focável dentro de `aria-hidden`, e todo botão que só vale até uma etapa (avançar, pular, atalho)
  se esconde quando ela acaba.
- Teste de integração em `tests/integration/` (happy-dom), com `vi.useFakeTimers()` para tempos.
- CSS em `src/styles/`, classes BEM (`bloco__elemento--modificador`), sem hex/`rgb()`/`z-index` numérico.
