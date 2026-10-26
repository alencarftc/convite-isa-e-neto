import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { content } from '@/config/content';

/**
 * `content.ts` deve bater, palavra por palavra, com "Textos do convite" de `docs/requisitos.md`
 * (docs/README.md, regra 4): são os textos que a noiva aprovou. Este teste pega a divergência no dia
 * em que ela nasce, em vez de na revisão.
 */
const requisitos = readFileSync(
  join(import.meta.dirname, '..', '..', 'docs', 'requisitos.md'),
  'utf8',
);

/** Sem o realce do Markdown e com os espaços em um só. */
const normalizar = (texto: string) => texto.replaceAll('*', '').replace(/\s+/g, ' ').trim();
const documento = normalizar(requisitos);

/** Textos que NÃO vêm de "Textos do convite", e de onde vêm. */
const FORA_DOS_REQUISITOS = [
  /^rotulos\./, // nomes acessíveis dos controles: SPEC-04, SPEC-05, SPEC-06, SPEC-07 e SPEC-09
  /^entrada\.aguarde$/, // SPEC-02
  /^dicas\.(atalho|rolar)$/, // SPEC-09 e SPEC-06
  /^baloes\[\d+\]\.(foto|alt|foco)$/, // arquivos e descrições das fotos: dependem do casal
  /^botoes\.agenda$/, // texto novo da SPEC-17, ainda sem a aprovação do casal
];

function folhas(valor: unknown, caminho: string): [string, string][] {
  if (typeof valor === 'string') return [[caminho, valor]];
  if (Array.isArray(valor)) {
    return valor.flatMap((item: unknown, indice) => folhas(item, `${caminho}[${String(indice)}]`));
  }
  if (typeof valor === 'object' && valor !== null) {
    return Object.entries(valor).flatMap(([chave, item]) =>
      folhas(item, caminho === '' ? chave : `${caminho}.${chave}`),
    );
  }
  return [];
}

/** O modelo da contagem traz marcadores; o documento escreve `[dd] dias`, `[hh] horas`, `[mm] minutos`. */
const comoNoDocumento = (texto: string) =>
  texto
    .replace('{dias}', '[dd] dias')
    .replace('{horas}', '[hh] horas')
    .replace('{minutos}', '[mm] minutos');

describe('content.ts e "Textos do convite" de docs/requisitos.md', () => {
  const textos = folhas(content, '').filter(
    ([caminho]) => !FORA_DOS_REQUISITOS.some((regra) => regra.test(caminho)),
  );

  it('há textos suficientes para o teste valer (a lista de exceções não engoliu tudo)', () => {
    expect(textos.length).toBeGreaterThan(40);
  });

  it.each(textos)('%s está no documento, igual', (_caminho, texto) => {
    // `toBe(true)` com mensagem curta: `toContain` imprimiria o documento inteiro a cada falha.
    const esperado = normalizar(comoNoDocumento(texto));
    expect(documento.includes(esperado), `não está em docs/requisitos.md: "${esperado}"`).toBe(
      true,
    );
  });

  it('um texto trocado seria apanhado: o teste não é vazio', () => {
    expect(documento).not.toContain(normalizar('Isabella & David — Convite de casamentos'));
  });
});
