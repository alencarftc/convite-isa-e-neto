# src/presentation

Cenas, componentes, DOM e animação (GSAP). É a única camada que desenha.

- Pode importar `application`, `domain` e GSAP. **Nunca** `infrastructure`: as portas chegam por `ctx`
  (`{ root, content, config, state, events, audio }`, SPEC-01) ou por parâmetro.
- Cena segue o contrato `{ init, run, skip, destroy }`; `run()` devolve `Promise`; use
  `gsap.context()` para o `destroy()` desfazer tudo; `skip()` leva ao estado final sem animação.
- **Sem literais:** texto de `content`, tempo/curva de `config`, cor/camada de `tokens.css`.
- Anime só `transform` e `opacity`. Respeite `prefers-reduced-motion` (`gsap.matchMedia()`), `100dvh`,
  áreas de toque ≥ 44 px, foco visível, `aria-live` onde a spec manda. Todo texto é HTML real.
- Monte DOM com `createElement`/`textContent` (nunca `innerHTML` com conteúdo).
- Teste de integração em `tests/integration/` (happy-dom), com `vi.useFakeTimers()` para tempos.
- CSS em `src/styles/`, classes BEM (`bloco__elemento--modificador`), sem hex/`rgb()`/`z-index` numérico.
