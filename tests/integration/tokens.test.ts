import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { razaoDeContraste } from '@/domain/acessibilidade/contraste';

const css = readFileSync(
  join(import.meta.dirname, '..', '..', 'src', 'styles', 'tokens.css'),
  'utf8',
);

function cor(nome: string): string {
  const valor = new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1];
  if (!valor) throw new Error(`token --${nome} não encontrado em tokens.css`);
  return valor;
}

/** Combinações de texto e fundo realmente usadas pelo convite (SPEC-09, "Contraste de texto"). */
const COMBINACOES = [
  ['texto principal sobre marfim (carta, cartões, dicas)', 'cor-texto', 'cor-marfim', 10],
  ['texto principal sobre bege (envelope)', 'cor-texto', 'cor-bege', 4.5],
  ['texto suave sobre marfim (rótulos, dica de volume)', 'cor-texto-suave', 'cor-marfim', 4.5],
  ['botão principal: marfim sobre tinta escura', 'cor-marfim', 'cor-texto', 10],
] as const;

describe('tokens.css (SPEC-09, SPEC-01)', () => {
  it.each(COMBINACOES)('%s tem contraste suficiente', (_descricao, texto, fundo, minimo) => {
    expect(razaoDeContraste(cor(texto), cor(fundo))).toBeGreaterThanOrEqual(minimo);
  });

  it('o texto suave é um tom mais claro que o principal, mas ainda passa de 4,5:1 sobre marfim e bege', () => {
    expect(razaoDeContraste(cor('cor-texto-suave'), cor('cor-marfim'))).toBeLessThan(
      razaoDeContraste(cor('cor-texto'), cor('cor-marfim')),
    );
    expect(razaoDeContraste(cor('cor-texto-suave'), cor('cor-bege'))).toBeGreaterThanOrEqual(4.5);
  });

  it('o texto é tinta marrom-escura, não azul: a carta e as dicas não ficam frias sobre o bege (ADR-0012)', () => {
    const [vermelho, , azul] = [1, 3, 5].map((i) =>
      Number.parseInt(cor('cor-texto').slice(i, i + 2), 16),
    );
    expect(vermelho).toBeGreaterThan(azul ?? 0);
  });

  it('a tinta da carta é um cinza claro cuja diferença para o papel dá a tinta marrom, e o cinza passa do limite de inversão (ADR-0016)', () => {
    const canais = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
    const diferenca = (a: string, b: string) =>
      canais(a).map((valor, indice) => Math.abs(valor - (canais(b)[indice] ?? 0)));
    const brilho = (hex: string) => {
      const [r = 0, g = 0, b = 0] = canais(hex);
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };

    for (const [tinta, resultado] of [
      ['cor-tinta-sobre-papel', 'cor-texto'],
      ['cor-tinta-suave-sobre-papel', 'cor-texto-suave'],
    ] as const) {
      const esperado = canais(cor(resultado));
      diferenca(cor('cor-papel'), cor(tinta)).forEach((valor, indice) => {
        expect(
          Math.abs(valor - (esperado[indice] ?? 0)),
          `${tinta} canal ${String(indice)}`,
        ).toBeLessThanOrEqual(1);
      });
      // Os navegadores que escurecem a página invertem o texto com brilho abaixo de 150 (e só ele).
      expect(brilho(cor(tinta)), tinta).toBeGreaterThan(160);
    }
  });

  it('a carta mistura o texto por diferença com o papel, sem tocar nos filetes dourados (ADR-0016)', () => {
    const carta = readFileSync(
      join(import.meta.dirname, '..', '..', 'src', 'styles', 'carta.css'),
      'utf8',
    );

    expect(carta).toMatch(
      /\.carta__bloco:not\(\.carta__filete\)\s*\{[^}]*color:\s*var\(--cor-tinta-sobre-papel\);[^}]*mix-blend-mode:\s*difference/,
    );
    expect(carta).toMatch(/forced-colors:\s*active/);
  });

  it('dourado e serenidade são decoração: abaixo de 3:1 sobre marfim (só o "&" e a data da carta, a pedido do casal, o usam em texto)', () => {
    expect(razaoDeContraste(cor('cor-dourado'), cor('cor-marfim'))).toBeLessThan(3.5);
    expect(razaoDeContraste(cor('cor-serenidade'), cor('cor-marfim'))).toBeLessThan(3);
  });

  it('"Ir direto ao convite" fica sobre "Pular" quando recebe foco: --z-atalho vence --z-interface', () => {
    const z = (nome: string) => Number(new RegExp(String.raw`--${nome}:\s*(\d+)`).exec(css)?.[1]);

    expect(z('z-atalho')).toBeGreaterThan(z('z-interface'));
  });

  it('o corpo do texto tem pelo menos 18 px no celular (RF de tamanho)', () => {
    expect(css).toMatch(/--texto-corpo:\s*clamp\(18px,/);
  });
});
