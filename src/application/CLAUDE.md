# src/application

Casos de uso, portas e o barramento de eventos.

- **Só importa `domain`** (e a própria camada). Sem DOM, GSAP, Howler, `localStorage`, `Date.now()`.
- `ports/`: interfaces pequenas e específicas (`Relogio`, `Preferencias`). Uma porta nasce quando
  um caso de uso precisa dela; sem porta "para o futuro".
- `use-cases/`: fábricas `criarX({ portas, config, conteudo })` que devolvem uma função. Sem estado
  global escondido; o estado vive em objetos criados na raiz de composição.
- Teste com **portas falsas** (objetos literais), sem DOM; não importe `infrastructure` nem `config/`
  nos testes (isso é integração, vai para `tests/integration/`). Cobertura mínima **95%**.
- Erros de escuta no barramento sobem a quem emitiu; o orquestrador os converte em modo de segurança
  (SPEC-09). Som nunca pode ser condição para a animação avançar (SPEC-08, RF-08.8).
