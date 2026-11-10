import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const raiz = join(import.meta.dirname, '..', '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');
const base = readFileSync(join(raiz, 'src', 'styles', 'base.css'), 'utf8');
const pastaDeEstilos = join(raiz, 'src', 'styles');

/**
 * Só existe o tema claro (ADR-0042, 10/11/2026). O convite é pintado em tons claros e não tem versão escura: o modo
 * escuro do aparelho não o muda. `only light` é a declaração que proíbe o navegador de escurecê-lo por conta própria
 * (entre 01 e 10/11/2026 ele declarou `dark`, um desvio da ADR-0015 que a ADR-0042 desfaz). O texto da carta segue
 * protegido contra os navegadores que escurecem mesmo assim (ADR-0016).
 */
describe('o convite só tem o tema claro (ADR-0042)', () => {
  it('o index.html declara color-scheme only light e nunca dark', () => {
    expect(html).toMatch(/<meta\s+name="color-scheme"\s+content="only light"/);
    expect(html).not.toMatch(/content="[^"]*dark/);
  });

  it('a CSS repete a declaração na raiz, para valer mesmo que o <meta> seja ignorado', () => {
    expect(base).toMatch(/html\s*\{[^}]*color-scheme:\s*only light\s*;/);
    expect(base).not.toMatch(/color-scheme:\s*[a-z ]*\bdark\b/);
  });

  it('a barra de rolagem usa as cores do convite', () => {
    expect(base).toMatch(
      /html\s*\{[^}]*scrollbar-color:\s*var\(--cor-dourado\)\s+var\(--cor-marfim\)/,
    );
  });

  it('nenhuma folha de estilo troca de cores por prefers-color-scheme nem declara color-scheme dark', () => {
    const folhas = readdirSync(pastaDeEstilos).filter((nome) => nome.endsWith('.css'));
    expect(folhas.length).toBeGreaterThan(0);
    for (const nome of folhas) {
      const css = readFileSync(join(pastaDeEstilos, nome), 'utf8');
      expect(css, nome).not.toContain('prefers-color-scheme');
      expect(css, nome).not.toMatch(/color-scheme:\s*[a-z ]*\bdark\b/);
    }
  });

  it('a cor da barra do navegador é uma só, sem variante para o tema escuro', () => {
    expect(html.match(/<meta\s+name="theme-color"/g)).toHaveLength(1);
    expect(html).not.toMatch(/name="theme-color"[^>]*media=/);
  });
});
