import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { config } from '../../src/config/config';
import { content } from '../../src/config/content';
import { PLANO_B } from '../../src/domain/plano-b/plano-b';
import { gerarNoscript } from './noscript';
import {
  gerarHeadDoPlanoB,
  gerarScriptDoPlanoB,
  gerarTextoDoPlanoB,
  LIMITE_DO_SCRIPT_EM_BYTES,
  MARCADOR_DO_HEAD_DO_PLANO_B,
  MARCADOR_DO_TEXTO_DO_PLANO_B,
} from './plano-b';

const index = readFileSync(join(import.meta.dirname, '..', '..', 'index.html'), 'utf8');

/** Todos os textos (folhas) de um objeto, na ordem do arquivo. */
function textosDe(valor: unknown): string[] {
  if (typeof valor === 'string') return [valor];
  if (Array.isArray(valor)) return valor.flatMap((item: unknown) => textosDe(item));
  if (typeof valor === 'object' && valor !== null) {
    return Object.values(valor).flatMap((item: unknown) => textosDe(item));
  }
  return [];
}

const escapar = (texto: string) =>
  texto.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

describe('script do plano B (SPEC-15, RF-15.6)', () => {
  it('cabe em 0,5 kB e não depende de nada além do navegador (RNF-15.2)', () => {
    const script = gerarScriptDoPlanoB(config.duracoes.limitePlanoB);

    expect(Buffer.byteLength(script)).toBeLessThanOrEqual(LIMITE_DO_SCRIPT_EM_BYTES);
    expect(script).not.toMatch(/\bimport\b|\bgsap\b|=>|\bconst\b|\blet\b/i);
  });

  it('usa o limite de config.duracoes.limitePlanoB, em milissegundos, e os nomes do contrato', () => {
    const script = gerarScriptDoPlanoB(config.duracoes.limitePlanoB);

    expect(script).toContain(`},${String(config.duracoes.limitePlanoB * 1000)});`);
    expect(script).toContain(`w.${PLANO_B.variavel}!=="${PLANO_B.marca}"`);
    expect(script).toContain(`l.add("${PLANO_B.classe}")`);
  });

  it('o limite vem do config: 10 s por padrão', () => {
    expect(config.duracoes.limitePlanoB).toBe(10);
    expect(gerarScriptDoPlanoB(2.5)).toContain('},2500);');
  });
});

describe('texto do plano B (SPEC-15, RF-15.7)', () => {
  const texto = gerarTextoDoPlanoB(content, config);

  it('traz os mesmos textos e links que o <noscript>: uma fonte só', () => {
    const noscript = gerarNoscript(content, config);

    for (const trecho of [
      ...textosDe(content.carta),
      content.dressCode,
      ...textosDe(content.mensagem),
      ...content.baloes.map((balao) => balao.frase),
    ]) {
      expect(texto, `texto ausente: ${trecho}`).toContain(escapar(trecho));
      expect(noscript).toContain(escapar(trecho));
    }
    expect(texto).toContain(`href="${config.links.formulario}"`);
    expect(texto).toContain(content.botoes.comoChegar);
  });

  it('é escondido por padrão (classe plano-b-texto) e só aparece com a classe no <html>', () => {
    const { head } = { head: gerarHeadDoPlanoB(config) };

    expect(texto).toContain('class="sem-js plano-b-texto"');
    expect(head).toContain('.plano-b-texto { display: none; }');
    expect(head).toContain(`html.${PLANO_B.classe} .plano-b-texto { display: block; }`);
    expect(head).toContain(`html.${PLANO_B.classe} #app { display: none; }`);
  });

  it('não repete ids do <noscript> (CA: ids únicos na página)', () => {
    const noscript = gerarNoscript(content, config);
    const ids = [...(texto + noscript).matchAll(/ id="([^"]+)"/g)].map(([, id]) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('só usa variáveis dos tokens: nenhum hex nem rgb() (CA-01.3.1)', () => {
    const head = gerarHeadDoPlanoB(config);

    expect(head + texto).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(head + texto).not.toMatch(/rgba?\(/);
  });
});

describe('index.html e o plano B', () => {
  it('o marcador do script fica no <head>, antes do pacote, e o do texto no <body>', () => {
    expect(index.split(MARCADOR_DO_HEAD_DO_PLANO_B)).toHaveLength(2);
    expect(index.split(MARCADOR_DO_TEXTO_DO_PLANO_B)).toHaveLength(2);
    expect(index.indexOf(MARCADOR_DO_HEAD_DO_PLANO_B)).toBeLessThan(index.indexOf('<body'));
    expect(index.indexOf(MARCADOR_DO_HEAD_DO_PLANO_B)).toBeLessThan(
      index.indexOf('<script type="module"'),
    );
    expect(index.indexOf(MARCADOR_DO_TEXTO_DO_PLANO_B)).toBeGreaterThan(index.indexOf('<body'));
  });
});
