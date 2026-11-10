import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { config } from '../../src/config/config';
import { content } from '../../src/config/content';
import type { ConfigConvite } from '../../src/domain/config/config-convite';
import {
  gerarDadosEstruturados,
  gerarMetadados,
  gerarRobots,
  gerarSitemap,
  MARCADOR_DOS_METADADOS,
  separarEndereco,
} from './metadados';

const html = gerarMetadados(content, config);
const raiz = join(import.meta.dirname, '..', '..');
const index = readFileSync(join(raiz, 'index.html'), 'utf8');

const comIndexacao = (indexavel: boolean): ConfigConvite => ({
  ...config,
  publicacao: { ...config.publicacao, indexavel },
});

describe('gerarMetadados (SPEC-10, RF-10.1 e RF-10.3)', () => {
  it('traz título e descrição da prévia, iguais aos de content (CT-10.1)', () => {
    expect(html).toContain('<title>Isabella &amp; David — Convite de casamento</title>');
    expect(html).toContain(
      'property="og:description" content="Uma carta foi escrita para você. Toque para abrir."',
    );
    expect(html).toContain(
      'property="og:title" content="Isabella &amp; David — Convite de casamento"',
    );
  });

  it('og:url e og:image levam o endereço completo, com https:// (prévia não aceita caminho relativo)', () => {
    expect(html).toContain(`property="og:url" content="${config.publicacao.url}"`);
    expect(html).toContain(
      `property="og:image" content="${config.publicacao.url}${config.publicacao.imagemDaPrevia}"`,
    );
    expect(html).toMatch(/og:image" content="https:\/\//);
  });

  it('a imagem da prévia declara 1200 × 630 px, o tipo e a descrição (RF-10.2)', () => {
    expect(html).toContain('og:image:width" content="1200"');
    expect(html).toContain('og:image:height" content="630"');
    expect(html).toContain('og:image:type" content="image/jpeg"');
    expect(html).toContain(
      `og:image:alt" content="${content.previa.descricaoDaImagem.replace('&', '&amp;')}"`,
    );
  });

  it('liga o favicon de 32 px e o ícone de tela inicial do iPhone (RF-10.3, CT-10.2)', () => {
    expect(html).toContain(
      `rel="icon" type="image/png" sizes="32x32" href="${config.publicacao.icone32}"`,
    );
    expect(html).toContain(`rel="apple-touch-icon" href="${config.publicacao.iconeApple}"`);
  });

  it('escapa o "&" e as aspas nos atributos, sem quebrar o HTML', () => {
    const perigoso = gerarMetadados(
      { ...content, previa: { ...content.previa, titulo: 'A "B" & <C>', descricao: 'x' } },
      config,
    );

    expect(perigoso).toContain('content="A &quot;B&quot; &amp; &lt;C&gt;"');
    expect(perigoso).toContain('<title>A "B" &amp; &lt;C&gt;</title>');
  });
});

describe('SEO (09/11/2026, ADR-0036)', () => {
  it('o endereço do convite é o domínio do casal, com https:// e barra no fim', () => {
    expect(config.publicacao.url).toBe('https://isabellaeneto.com.br/');
  });

  it('a descrição para buscadores é a descritiva (o que, quando e onde); a curta aprovada fica na prévia', () => {
    expect(html).toContain(
      `<meta name="description" content="${content.previa.descricaoParaBusca}" />`,
    );
    expect(content.previa.descricaoParaBusca).toContain('22 de janeiro de 2027');
    expect(content.previa.descricaoParaBusca).toContain('Sítio Olinda');
    // Entre 70 e 160 caracteres: o Google corta mais que isso, e menos que isso desperdiça o espaço.
    expect(content.previa.descricaoParaBusca.length).toBeGreaterThanOrEqual(70);
    expect(content.previa.descricaoParaBusca.length).toBeLessThanOrEqual(180);
    expect(html).toContain('property="og:description" content="Uma carta foi escrita');
  });

  it('o endereço canônico é o do domínio, e o nome do site e as marcas do Twitter Card vêm junto', () => {
    expect(html).toContain(`<link rel="canonical" href="${config.publicacao.url}" />`);
    expect(html).toContain('property="og:site_name" content="Isabella &amp; David"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain(
      `name="twitter:image" content="${config.publicacao.url}${config.publicacao.imagemDaPrevia}"`,
    );
  });

  it('indexável: os buscadores podem listar e seguir; não indexável: noindex, nofollow', () => {
    expect(html).toContain(
      '<meta name="robots" content="index, follow, max-image-preview:large" />',
    );
    expect(gerarMetadados(content, comIndexacao(false))).toContain(
      '<meta name="robots" content="noindex, nofollow" />',
    );
  });

  it('o robots.txt libera tudo e aponta o sitemap do domínio; desligado, proíbe tudo', () => {
    expect(gerarRobots(config)).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://isabellaeneto.com.br/sitemap.xml\n',
    );
    expect(gerarRobots(comIndexacao(false))).toBe('User-agent: *\nDisallow: /\n');
  });

  it('o sitemap lista só o convite, com o endereço de config', () => {
    const sitemap = gerarSitemap(config);

    expect(sitemap).toContain('<loc>https://isabellaeneto.com.br/</loc>');
    expect(sitemap.match(/<url>/g)).toHaveLength(1);
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('o endereço da carta se separa em rua, cidade e estado', () => {
    expect(separarEndereco('R. Nações Unidas, 407 · Benevides, PA')).toEqual({
      rua: 'R. Nações Unidas, 407',
      cidade: 'Benevides',
      estado: 'PA',
    });
    expect(separarEndereco('Sem separador')).toEqual({
      rua: 'Sem separador',
      cidade: '',
      estado: '',
    });
  });

  it('os dados estruturados são um schema.org/Event com a data, o local e o endereço do convite', () => {
    const evento = gerarDadosEstruturados(content, config) as Record<string, unknown>;
    const local = evento['location'] as Record<string, unknown>;
    const endereco = local['address'] as Record<string, unknown>;

    expect(evento['@type']).toBe('Event');
    expect(evento['name']).toBe(content.previa.nomeDoEvento);
    expect(evento['startDate']).toBe(config.casamento); // 2027-01-22T17:00:00-03:00, com o fuso
    expect(evento['url']).toBe(config.publicacao.url);
    expect(local['name']).toBe(content.carta.local);
    expect(endereco['addressLocality']).toBe('Benevides');
    expect(endereco['addressRegion']).toBe('PA');
    expect(endereco['addressCountry']).toBe('BR');
  });

  it('o JSON-LD está no head, é JSON válido e um "</script>" no texto não o fecha antes da hora', () => {
    const bloco = /<script type="application\/ld\+json">(.*)<\/script>/s.exec(html)?.[1] ?? '';
    const perigoso = gerarMetadados(
      { ...content, previa: { ...content.previa, nomeDoEvento: 'A</script><b>' } },
      config,
    );

    expect(() => {
      JSON.parse(bloco);
    }).not.toThrow();
    expect(perigoso.match(/<\/script>/g)).toHaveLength(1); // só o que fecha o próprio bloco
    expect(perigoso).toContain(
      'A' + String.fromCharCode(0x5c) + 'u003c/script>' + String.fromCharCode(0x5c) + 'u003cb>',
    );
  });
});

describe('index.html (SPEC-10, RF-10.4)', () => {
  it('tem o marcador dos metadados e não repete título, descrição, robots nem og:* à mão', () => {
    expect(index.split(MARCADOR_DOS_METADADOS)).toHaveLength(2);
    expect(index).not.toMatch(/<title>/);
    expect(index).not.toMatch(/property="og:/);
    expect(index).not.toMatch(/<meta name="robots"/); // vem de config.publicacao.indexavel
  });

  it('o CNAME do GitHub Pages é o domínio de config.publicacao.url', () => {
    const cname = readFileSync(join(raiz, 'public', 'CNAME'), 'utf8').trim();

    expect(cname).toBe(new URL(config.publicacao.url).host);
    expect(cname).toBe('isabellaeneto.com.br');
  });

  it('não sobra um robots.txt estático em public/: o do build vem de config (senão os dois brigariam)', () => {
    expect(() => readFileSync(join(raiz, 'public', 'robots.txt'), 'utf8')).toThrow();
  });

  it('a cor do tema é o azul serenidade da paleta', () => {
    expect(index).toContain('<meta name="theme-color" content="#91A8D0" />');
  });
});
