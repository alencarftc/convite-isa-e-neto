import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cruise, type IConfiguration, type ICruiseResult } from 'dependency-cruiser';
import { describe, expect, it } from 'vitest';

const requerer = createRequire(import.meta.url);
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const regras = requerer('../../.dependency-cruiser.cjs') as IConfiguration;

async function analisar(alvos: string[]): Promise<ICruiseResult> {
  const resultado = await cruise(alvos, {
    ...regras.options,
    ruleSet: regras,
    validate: true,
    baseDir: raiz,
    tsConfig: { fileName: path.join(raiz, 'tsconfig.json') },
  });
  if (typeof resultado.output === 'string')
    throw new Error('Saída inesperada do dependency-cruiser');
  return resultado.output;
}

const violacoesDe = (saida: ICruiseResult): string[] =>
  saida.summary.violations
    .filter((violacao) => violacao.rule.severity === 'error')
    .map((violacao) => violacao.rule.name);

describe('arquitetura do código real', () => {
  it('src e scripts respeitam todas as regras de dependência entre camadas', async () => {
    const saida = await analisar(['src', 'scripts']);

    const erros = saida.summary.violations
      .filter((violacao) => violacao.rule.severity === 'error')
      .map((violacao) => `${violacao.rule.name}: ${violacao.from} -> ${violacao.to}`);

    expect(erros).toEqual([]);
    expect(saida.summary.totalCruised).toBeGreaterThan(10);
  });
});

// Garantia de que as regras de fato disparam: cada fixture quebra uma regra de propósito.
describe('as regras detectam violações (fixtures)', () => {
  const fixture = (nome: string) => `tests/architecture/fixtures/${nome}`;

  it('domínio que importa infraestrutura', async () => {
    const saida = await analisar([fixture('dominio-importa-infraestrutura')]);
    expect(violacoesDe(saida)).toContain('dominio-e-puro');
  });

  it('domínio que importa um pacote npm', async () => {
    const saida = await analisar([fixture('dominio-importa-pacote')]);
    expect(violacoesDe(saida)).toContain('dominio-e-puro');
  });

  it('aplicação que importa infraestrutura', async () => {
    const saida = await analisar([fixture('aplicacao-importa-infraestrutura')]);
    expect(violacoesDe(saida)).toContain('aplicacao-so-depende-do-dominio');
  });

  it('apresentação que importa infraestrutura', async () => {
    const saida = await analisar([fixture('apresentacao-importa-infraestrutura')]);
    expect(violacoesDe(saida)).toContain('apresentacao-nao-conhece-infraestrutura');
  });

  it('infraestrutura que importa apresentação', async () => {
    const saida = await analisar([fixture('infraestrutura-importa-apresentacao')]);
    expect(violacoesDe(saida)).toContain('infraestrutura-nao-conhece-apresentacao');
  });

  it('camada que importa o main.ts', async () => {
    const saida = await analisar([fixture('camada-importa-main')]);
    expect(violacoesDe(saida)).toContain('camadas-nao-importam-a-raiz-de-composicao');
  });

  it('dependência circular', async () => {
    const saida = await analisar([fixture('ciclo')]);
    expect(violacoesDe(saida)).toContain('sem-ciclos');
  });

  it('fluxo válido (apresentação -> aplicação -> domínio) não gera erro', async () => {
    const saida = await analisar([fixture('fluxo-valido')]);
    expect(violacoesDe(saida)).toEqual([]);
  });
});
