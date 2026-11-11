import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const base = readFileSync(
  join(import.meta.dirname, '..', '..', 'src', 'styles', 'base.css'),
  'utf8',
);

/**
 * Ao tocar no baú e no selo o Chrome do Android pintava um retângulo azul sobre eles, e o dedo parado selecionava o que estava embaixo
 * (11/11/2026). O destaque de toque some em toda a página e a seleção, nas peças do convite; o texto da carta segue selecionável.
 */
describe('toque sem retângulo azul e sem seleção (11/11/2026)', () => {
  it('o destaque de toque do navegador é transparente em todo elemento', () => {
    expect(base).toMatch(/\*\s*\{[^}]*-webkit-tap-highlight-color:\s*transparent/);
  });

  it('o baú, o selo, a cena, a entrada, o inventário e os botões fixos não se selecionam nem abrem o menu de toque longo', () => {
    const bloco = /((?:\.[\w-]+,\s*)+\.botao-movimento)\s*\{([^}]*)\}/.exec(base);
    expect(bloco).not.toBeNull();
    const seletores = bloco?.[1] ?? '';
    for (const classe of ['.entrada', '.cena', '.bau', '.envelope', '.inventario', '.historia']) {
      expect(seletores, classe).toContain(classe);
    }
    expect(bloco?.[2]).toMatch(/user-select:\s*none/);
    expect(bloco?.[2]).toMatch(/-webkit-touch-callout:\s*none/);
  });

  it('o foco do teclado continua visível (acessibilidade)', () => {
    expect(base).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid/);
  });

  it('o texto da carta e dos cartões não está na lista: continua selecionável', () => {
    const bloco = /((?:\.[\w-]+,\s*)+\.botao-movimento)\s*\{/.exec(base);
    for (const classe of ['.carta', '.conteudo', '.cartao', '.mensagem']) {
      expect(bloco?.[1], classe).not.toContain(classe);
    }
  });
});
