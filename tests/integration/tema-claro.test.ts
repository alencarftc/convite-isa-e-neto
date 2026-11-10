import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const raiz = join(import.meta.dirname, '..', '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');
const base = readFileSync(join(raiz, 'src', 'styles', 'base.css'), 'utf8');

/**
 * No celular com o modo escuro ligado, o Chrome, o Samsung Internet e o navegador do WhatsApp escurecem
 * sozinhos as páginas que não dizem que já cuidaram do tema: os fundos marfim viravam preto (ADR-0012) e, em
 * 01/11/2026, o texto da carta virou claro sobre o papel creme, que é imagem e não muda (ADR-0015). `only light`
 * não foi respeitado em todos eles; `dark` é o aviso que respeitam: "esta página já é do tema escuro, não mexa".
 * O convite não usa nenhuma cor padrão do navegador, então a aparência não muda.
 */
describe('o convite avisa que cuida do próprio tema (ADR-0015)', () => {
  it('o index.html declara color-scheme dark, e não só o claro, que os navegadores ignoravam', () => {
    expect(html).toMatch(/<meta\s+name="color-scheme"\s+content="dark"/);
    expect(html).not.toMatch(/only light/);
    expect(html).not.toMatch(/supported-color-schemes/);
  });

  it('a CSS repete o aviso na raiz, para valer mesmo que o <meta> seja ignorado', () => {
    expect(base).toMatch(/html\s*\{[^}]*color-scheme:\s*dark/);
    expect(base).not.toMatch(/color-scheme:\s*only light/);
  });

  it('a barra de rolagem, a única coisa que o aviso escurece, ganha as cores do convite', () => {
    expect(base).toMatch(
      /html\s*\{[^}]*scrollbar-color:\s*var\(--cor-dourado\)\s+var\(--cor-marfim\)/,
    );
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
