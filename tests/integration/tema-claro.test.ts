import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const raiz = join(import.meta.dirname, '..', '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');
const base = readFileSync(join(raiz, 'src', 'styles', 'base.css'), 'utf8');

/**
 * No celular com o modo escuro ligado, o Chrome, o Samsung Internet e o navegador do WhatsApp escurecem
 * sozinhos as páginas que não dizem que já cuidaram do tema, e os fundos marfim viravam preto (ADR-0012).
 * `only light` é a recusa explícita; sem ela o convite não é o que o casal pintou.
 */
describe('só tema claro (ADR-0012)', () => {
  it('o index.html recusa o tema escuro forçado nos dois nomes que os navegadores entendem', () => {
    expect(html).toMatch(/<meta\s+name="color-scheme"\s+content="only light"/);
    expect(html).toMatch(/<meta\s+name="supported-color-schemes"\s+content="light"/);
  });

  it('a CSS repete a recusa na raiz, para valer mesmo que o <meta> seja ignorado', () => {
    expect(base).toMatch(/html\s*\{[^}]*color-scheme:\s*only light/);
  });

  it('nenhuma folha de estilo do convite troca de cores por prefers-color-scheme', () => {
    const pasta = join(raiz, 'src', 'styles');
    const folhas = [
      'base',
      'tokens',
      'carta',
      'entrada',
      'bau',
      'bosque',
      'historia',
      'informacoes',
    ];
    for (const nome of folhas) {
      const css = readFileSync(join(pasta, `${nome}.css`), 'utf8');
      expect(css, nome).not.toContain('prefers-color-scheme');
    }
  });
});
