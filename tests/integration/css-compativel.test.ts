import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * SPEC-15: o CSS não pode depender de recursos que aparelhos mais antigos não entendem sem uma
 * alternativa. Sem `color-mix()` a declaração inteira é descartada (névoa sem fundo, etiquetas sem
 * fundo); sem `dvh`, alturas e margens se perdem. Estes testes impedem a volta do problema.
 */
const pasta = join(import.meta.dirname, '..', '..', 'src', 'styles');
const arquivos = readdirSync(pasta)
  .filter((nome) => nome.endsWith('.css'))
  .map((nome) => ({
    nome,
    // comentários podem citar `color-mix()` para explicar o porquê; só o código conta
    css: readFileSync(join(pasta, nome), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
  }));

interface Declaracao {
  readonly propriedade: string;
  readonly valor: string;
}

/** Blocos `{ … }` sem aninhamento, com as declarações na ordem em que aparecem. */
function blocos(css: string): Declaracao[][] {
  return [...css.matchAll(/\{([^{}]*)\}/g)].map(([, corpo]) =>
    (corpo ?? '')
      .split(';')
      .map((linha) => linha.trim())
      .filter((linha) => linha !== '' && !linha.startsWith('/*'))
      .map((linha) => {
        const separador = linha.indexOf(':');
        return {
          propriedade: linha.slice(0, separador).trim(),
          valor: linha.slice(separador + 1).trim(),
        };
      }),
  );
}

describe('CSS compatível com aparelhos mais antigos (SPEC-15)', () => {
  it('nenhum arquivo usa color-mix(): a transparência vem de tokens pré-calculados (RF-15.2)', () => {
    for (const { nome, css } of arquivos) {
      expect(css, nome).not.toContain('color-mix(');
    }
  });

  it('toda declaração em dvh tem, antes dela e no mesmo bloco, a mesma propriedade em vh (RF-15.3)', () => {
    const semAlternativa: string[] = [];
    for (const { nome, css } of arquivos) {
      for (const declaracoes of blocos(css)) {
        declaracoes.forEach((declaracao, indice) => {
          if (!/\bdvh\b/.test(declaracao.valor)) return;
          const alternativa = declaracao.valor.replaceAll('dvh', 'vh');
          const anterior = declaracoes
            .slice(0, indice)
            .some((d) => d.propriedade === declaracao.propriedade && d.valor === alternativa);
          if (!anterior)
            semAlternativa.push(`${nome}: ${declaracao.propriedade}: ${declaracao.valor}`);
        });
      }
    }

    expect(semAlternativa).toEqual([]);
  });

  it('as media queries usam a notação clássica, que todo navegador entende (RF-15.4)', () => {
    for (const { nome, css } of arquivos) {
      expect(css, nome).not.toMatch(/@media[^{]*\(\s*(?:width|height)\s*[<>]=?/);
    }
  });

  it('os tokens de transparência são hex de 8 dígitos e batem com a cor de base e a opacidade do nome', () => {
    const tokens = readFileSync(join(pasta, 'tokens.css'), 'utf8');
    const base = (nome: string) =>
      new RegExp(`--${nome}:\\s*(#[0-9a-f]{6});`).exec(tokens)?.[1] ?? '';

    const derivados = [...tokens.matchAll(/--(cor-[a-z]+)-(\d{2}):\s*(#[0-9a-f]{8});/g)];
    expect(derivados.length).toBeGreaterThanOrEqual(14);
    for (const [, cor, porcento, valor] of derivados) {
      const esperado = `${base(cor ?? '')}${Math.round((Number(porcento) / 100) * 255)
        .toString(16)
        .padStart(2, '0')}`;
      expect(valor, `--${cor ?? ''}-${porcento ?? ''}`).toBe(esperado);
    }
  });

  it('todo var(--cor-…-NN) usado existe em tokens.css', () => {
    const tokens = readFileSync(join(pasta, 'tokens.css'), 'utf8');
    for (const { nome, css } of arquivos) {
      for (const [, token] of css.matchAll(/var\((--cor-[a-z]+-(?:\d{2}|claro))\)/g)) {
        expect(tokens, `${nome}: ${token ?? ''}`).toContain(`${token ?? ''}:`);
      }
    }
  });
});
