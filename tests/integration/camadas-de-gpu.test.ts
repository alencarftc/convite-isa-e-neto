import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const pasta = join(import.meta.dirname, '..', '..', 'src', 'styles');
const folha = (nome: string) => readFileSync(join(pasta, `${nome}.css`), 'utf8');

/** O bloco de regras de um seletor (do seletor à primeira chave que fecha), ou '' se não existir. */
function bloco(css: string, seletor: string): string {
  const inicio = css.search(new RegExp(String.raw`(^|\n)${seletor}\s*\{`));
  if (inicio === -1) return '';
  return css.slice(inicio, css.indexOf('}', inicio) + 1);
}

/**
 * Camadas de GPU permanentes (`will-change`) nas peças grandes faziam o convite piscar no Motorola Edge 70 Fusion+ (ADR-0045): com
 * `?sem=willchange` o piscar do convite parava. As camadas de tela cheia da cena e os espaços da vida não as fixam; quem as pede
 * é a animação, enquanto a peça se move.
 */
describe('camadas de GPU só enquanto a peça se move (ADR-0045)', () => {
  it('as camadas de tela cheia da cena não têm will-change fixo', () => {
    const regras = bloco(folha('bosque'), String.raw`\.camada`);
    expect(regras).not.toBe('');
    expect(regras).not.toContain('will-change');
  });

  it('os espaços da vida (de tela cheia, quase sempre vazios) não têm will-change fixo', () => {
    const regras = bloco(folha('vida'), String.raw`\.vida`);
    expect(regras).not.toBe('');
    expect(regras).not.toContain('will-change');
  });

  it('as fotos do carrossel também não (ADR-0043)', () => {
    const css = folha('informacoes');
    expect(bloco(css, String.raw`\.carrossel__slide`)).not.toContain('will-change');
    expect(bloco(css, String.raw`\.carrossel__foto`)).not.toContain('will-change');
  });

  it('o glow do envelope, apagado, sai do desenho (visibility: hidden depois do esmaecimento): as camadas dele não ficam na GPU com o convite aberto', () => {
    const css = folha('carta');
    const apagado = bloco(css, '[.]envelope__aura');
    const aceso = bloco(css, '[.]envelope--brilhando [.]envelope__aura');

    expect(apagado).toMatch(/visibility:[ ]*hidden/);
    expect(apagado).toMatch(/transition:[^;]*visibility 0s linear/);
    expect(aceso).toMatch(/visibility:[ ]*visible/);
  });

  it('o glow do envelope é estático: nenhuma animação de CSS nele, nem em suas camadas (ADR-0046)', () => {
    const css = folha('carta');

    for (const seletor of ['[.]envelope__aura', '[.]envelope__halo', '[.]envelope__glow']) {
      const regras = bloco(css, seletor);
      expect(regras, seletor).not.toBe('');
      expect(regras, seletor).not.toMatch(/animation/);
    }
    expect(css).not.toMatch(/@keyframes envelope-/);
  });

  it('nenhuma folha de estilo fixa `will-change`: a camada de GPU é de quem anima, só enquanto a peça se move (ADR-0047)', () => {
    const folhas = readdirSync(pasta).filter((nome) => nome.endsWith('.css'));
    expect(folhas.length).toBeGreaterThan(0);
    for (const nome of folhas) {
      const declaracoes = (folha(nome.replace(/.css$/, '')).match(/^s*will-change:/gm) ?? [])
        .length;
      expect(declaracoes, nome).toBe(0);
    }
  });
});
