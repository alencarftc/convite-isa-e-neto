import { vi } from 'vitest';

/**
 * Prazo padrão de `vi.waitFor` nos testes de integração. As animações dos testes são de verdade,
 * só encolhidas (`configRapida`), e o conjunto inteiro roda em paralelo com o build do pacote:
 * com a máquina ocupada, o 1 s padrão do Vitest estourava em testes que passam sozinhos. Quem
 * precisar de outro prazo continua passando `{ timeout }`.
 */
const PRAZO_PADRAO_EM_MS = 5000;

const original = vi.waitFor.bind(vi);
vi.waitFor = (callback, opcoes) => {
  const prazo = typeof opcoes === 'number' ? { timeout: opcoes } : (opcoes ?? {});
  return original(callback, { timeout: PRAZO_PADRAO_EM_MS, ...prazo });
};
