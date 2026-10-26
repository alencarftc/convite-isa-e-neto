import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { config } from '../../src/config/config';
import { content } from '../../src/config/content';
import { gerarNoscript, MARCADOR_DO_NOSCRIPT } from './noscript';

const html = gerarNoscript(content, config);

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

describe('gerarNoscript (SPEC-09, RF-09.9)', () => {
  it('traz todos os textos da carta, iguais aos de content.carta (CA-09.5.1, SPEC-12)', () => {
    for (const texto of textosDe(content.carta)) {
      expect(html, `texto ausente: ${texto}`).toContain(escapar(texto));
    }
  });

  it('traz as cinco fotos e frases da história, na ordem dos balões, entre a carta e o traje (CT-13.6)', () => {
    const posicoes = content.baloes.map((balao) => {
      expect(html).toContain(`<img src="${escapar(balao.foto)}" alt="${escapar(balao.alt)}"`);
      expect(html).toContain(`<figcaption>${escapar(balao.frase)}</figcaption>`);
      return html.indexOf(escapar(balao.frase));
    });

    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
    expect(posicoes[0]).toBeGreaterThan(html.indexOf(escapar(content.carta.assinatura)));
    expect(posicoes[4]).toBeLessThan(html.indexOf(escapar(content.rotulos.traje)));
  });

  it('as fotos da história carregam sob demanda e mantêm o recorte dos balões (RF-13.5, RF-13.4)', () => {
    const fotos = [...html.matchAll(/<img [^>]*>/g)].map(([tag]) => tag);

    expect(fotos).toHaveLength(content.baloes.length);
    for (const [indice, tag] of fotos.entries()) {
      expect(tag).toContain('loading="lazy"');
      expect(tag).toContain('decoding="async"');
      expect(tag).toContain(`object-position: ${content.baloes[indice]?.foco ?? ''}`);
    }
  });

  it('verso do louvor vazio: não gera parágrafo vazio, e a assinatura continua (SPEC-14, RF-14.5)', () => {
    const semVerso = gerarNoscript(
      { ...content, mensagem: { ...content.mensagem, versoLouvor: '' } },
      config,
    );

    expect(semVerso).not.toContain('<p class="mensagem"></p>');
    expect(semVerso).toContain(escapar(content.mensagem.assinatura));
    expect(semVerso.match(/<p class="mensagem">/g)).toHaveLength(
      content.mensagem.paragrafos.length + 1,
    );
  });

  it('traz o traje e a mensagem do casal', () => {
    for (const texto of [content.dressCode, ...textosDe(content.mensagem)]) {
      expect(html).toContain(escapar(texto));
    }
  });

  it('a carta vem na ordem aprovada: versículo, bênção, pais, nomes, convite, data, local, fecho e assinatura', () => {
    const c = content.carta;
    const ordem = [
      c.versiculo,
      c.bencao,
      c.paisNoiva[0] ?? '',
      c.paisNoivo[0] ?? '',
      c.nomes.noiva,
      c.convite,
      c.data,
      c.cerimonia,
      c.endereco,
      c.fecho,
      c.despedida,
      c.assinatura,
    ].map((texto) => html.indexOf(escapar(texto)));

    expect(ordem.every((posicao) => posicao >= 0)).toBe(true);
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
  });

  it('traz os links de confirmar presença e de como chegar, em outra aba e sem expor o opener', () => {
    expect(html).toContain(
      `<a href="${config.links.formulario}" target="_blank" rel="noopener">${content.botoes.confirmar}</a>`,
    );
    expect(html).toContain(`href="${escapar(config.links.mapa)}"`);
    expect(html).toContain(content.botoes.comoChegar);
  });

  it('escapa o "&" do HTML (o "&" dourado do título e o link do mapa)', () => {
    expect(html).toContain(`${content.carta.nomes.noiva} &amp; ${content.carta.nomes.noivo}`);
    expect(html).not.toMatch(/&(?!amp;|lt;|gt;|quot;)/);
  });

  it('esconde a entrada e só usa variáveis dos tokens: nenhum hex nem rgb() (CA-01.3.1)', () => {
    expect(html).toContain('.entrada { display: none; }');
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(html).not.toMatch(/rgba?\(/);
  });

  it('o index.html tem o marcador que o plugin troca, dentro do <body>', () => {
    const index = readFileSync(join(import.meta.dirname, '..', '..', 'index.html'), 'utf8');

    expect(index.split(MARCADOR_DO_NOSCRIPT)).toHaveLength(2);
    expect(index.indexOf(MARCADOR_DO_NOSCRIPT)).toBeGreaterThan(index.indexOf('<body'));
  });

  it('o viewport não bloqueia o zoom (CA-09.4.2)', () => {
    const index = readFileSync(join(import.meta.dirname, '..', '..', 'index.html'), 'utf8');
    const viewport = /<meta name="viewport" content="([^"]*)"/.exec(index)?.[1] ?? '';

    expect(viewport).not.toMatch(/user-scalable|maximum-scale/);
  });
});
