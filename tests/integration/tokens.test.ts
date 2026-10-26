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
  ['texto principal sobre marfim (carta, cartões, dicas)', 'cor-texto', 'cor-marfim', 7],
  ['texto principal sobre bege (envelope)', 'cor-texto', 'cor-bege', 4.5],
  ['texto suave sobre marfim (rótulos, dica de volume)', 'cor-texto-suave', 'cor-marfim', 4.5],
  ['botão principal: marfim sobre azul-noite', 'cor-marfim', 'cor-texto', 7],
] as const;

describe('tokens.css (SPEC-09, SPEC-01)', () => {
  it.each(COMBINACOES)('%s tem contraste suficiente', (_descricao, texto, fundo, minimo) => {
    expect(razaoDeContraste(cor(texto), cor(fundo))).toBeGreaterThanOrEqual(minimo);
  });

  it('o texto suave perde para o texto principal e só vale sobre marfim (4,1:1 sobre bege: não usar)', () => {
    expect(razaoDeContraste(cor('cor-texto-suave'), cor('cor-bege'))).toBeLessThan(4.5);
  });

  it('dourado e serenidade são decoração: abaixo de 3:1 sobre marfim, nunca em texto de leitura', () => {
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
