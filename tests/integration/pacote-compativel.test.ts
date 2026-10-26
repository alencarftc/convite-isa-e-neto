// @vitest-environment node
import { fileURLToPath } from 'node:url';

import { parse } from 'acorn';
import { build } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * SPEC-15, RF-15.5: o pacote gerado só pode usar sintaxe que os aparelhos do `browserslist` entendem.
 * O piso é o Safari/iOS 15.1: tem campos e métodos privados de classe e `await` no topo do módulo,
 * mas não tem blocos estáticos de classe (16.4) nem `#campo in objeto` (16.4). Em vez de confiar
 * só na configuração do build, o teste constrói de verdade e lê o resultado.
 */
const TEMPO_DO_BUILD = 60_000;

interface No {
  readonly type: string;
  readonly left?: unknown;
  readonly [propriedade: string]: unknown;
}

const ehNo = (valor: unknown): valor is No =>
  typeof valor === 'object' && valor !== null && typeof (valor as No).type === 'string';

/** Percorre a árvore inteira, na ordem em que os nós aparecem. */
function* percorrer(no: unknown): Generator<No> {
  if (Array.isArray(no)) {
    for (const item of no as unknown[]) yield* percorrer(item);
  } else if (ehNo(no)) {
    yield no;
    for (const valor of Object.values(no)) yield* percorrer(valor);
  }
}

let javascript = '';
let css = '';

beforeAll(async () => {
  const resultado = await build({
    configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
    logLevel: 'silent',
    build: { write: false },
  });
  const saidas = Array.isArray(resultado) ? resultado : [resultado];
  const arquivos = saidas.flatMap((saida) => ('output' in saida ? saida.output : []));
  const texto = (nome: string) =>
    arquivos
      .filter((arquivo) => arquivo.fileName.endsWith(nome))
      .map((arquivo) => (arquivo.type === 'chunk' ? arquivo.code : String(arquivo.source)))
      .join('\n');
  javascript = texto('.js');
  css = texto('.css');
}, TEMPO_DO_BUILD);

describe('pacote gerado dentro do alvo (SPEC-15, RF-15.5)', () => {
  it('o JavaScript existe e é lido como ES2022 sem erro (CT-15.4)', () => {
    expect(javascript.length).toBeGreaterThan(10_000);

    expect(() => parse(javascript, { ecmaVersion: 2022, sourceType: 'module' })).not.toThrow();
  });

  it('não usa blocos estáticos de classe nem `#campo in objeto`, que chegam só no Safari 16.4', () => {
    const arvore = parse(javascript, { ecmaVersion: 2022, sourceType: 'module' });

    const tipos = new Set<string>();
    for (const no of percorrer(arvore)) {
      if (no.type === 'StaticBlock') tipos.add('bloco estático');
      if (no.type === 'BinaryExpression' && ehNo(no.left) && no.left.type === 'PrivateIdentifier') {
        tipos.add('#campo in objeto');
      }
    }

    expect([...tipos]).toEqual([]);
  });

  it('o CSS gerado não tem color-mix() nem media query de faixa (CT-15.3)', () => {
    expect(css.length).toBeGreaterThan(1000);
    expect(css).not.toContain('color-mix(');
    expect(css).not.toMatch(/@media[^{]*\(\s*(?:width|height)\s*[<>]=?/);
  });
});
