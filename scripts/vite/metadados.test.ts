import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { config } from '../../src/config/config';
import { content } from '../../src/config/content';
import { gerarMetadados, MARCADOR_DOS_METADADOS } from './metadados';

const html = gerarMetadados(content, config);
const index = readFileSync(join(import.meta.dirname, '..', '..', 'index.html'), 'utf8');

describe('gerarMetadados (SPEC-10, RF-10.1 e RF-10.3)', () => {
  it('traz título e descrição da prévia, iguais aos de content (CT-10.1)', () => {
    expect(html).toContain('<title>Isabella &amp; David — Convite de casamento</title>');
    expect(html).toContain('content="Uma carta foi escrita para você. Toque para abrir."');
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

  it('a imagem da prévia declara 1200 × 630 px (RF-10.2)', () => {
    expect(html).toContain('og:image:width" content="1200"');
    expect(html).toContain('og:image:height" content="630"');
  });

  it('liga o favicon de 32 px e o ícone de tela inicial do iPhone (RF-10.3, CT-10.2)', () => {
    expect(html).toContain(
      `rel="icon" type="image/png" sizes="32x32" href="${config.publicacao.icone32}"`,
    );
    expect(html).toContain(`rel="apple-touch-icon" href="${config.publicacao.iconeApple}"`);
  });

  it('escapa o "&" e as aspas nos atributos, sem quebrar o HTML', () => {
    const perigoso = gerarMetadados(
      { ...content, previa: { titulo: 'A "B" & <C>', descricao: 'x' } },
      config,
    );

    expect(perigoso).toContain('content="A &quot;B&quot; &amp; &lt;C&gt;"');
    expect(perigoso).toContain('<title>A "B" &amp; &lt;C&gt;</title>');
  });
});

describe('index.html (SPEC-10, RF-10.4)', () => {
  it('tem o marcador dos metadados e não repete título, descrição nem og:* à mão', () => {
    expect(index.split(MARCADOR_DOS_METADADOS)).toHaveLength(2);
    expect(index).not.toMatch(/<title>/);
    expect(index).not.toMatch(/property="og:/);
  });

  it('mantém o convite fora dos buscadores: noindex e nofollow', () => {
    expect(index).toMatch(/<meta name="robots" content="noindex, nofollow"/);
  });

  it('o robots.txt proíbe tudo (convite com endereço e nomes de família)', () => {
    const robots = readFileSync(
      join(import.meta.dirname, '..', '..', 'public', 'robots.txt'),
      'utf8',
    );

    expect(robots).toMatch(/User-agent: \*/);
    expect(robots).toMatch(/Disallow: \/\s*$/m);
  });

  it('a cor do tema é o azul serenidade da paleta', () => {
    expect(index).toContain('<meta name="theme-color" content="#91A8D0" />');
  });
});
