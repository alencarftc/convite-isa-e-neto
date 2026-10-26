import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Plugin } from 'vite';
import { describe, expect, it } from 'vitest';

import { config } from '../../src/config/config';
import { content } from '../../src/config/content';
import { gerarMetadados, MARCADOR_DOS_METADADOS, pluginMetadados } from './metadados';
import { MARCADOR_DO_NOSCRIPT, pluginNoscript } from './noscript';
import { MARCADOR_DO_HEAD_DO_PLANO_B, MARCADOR_DO_TEXTO_DO_PLANO_B, pluginPlanoB } from './plano-b';

const index = readFileSync(join(import.meta.dirname, '..', '..', 'index.html'), 'utf8');

/** O `transformIndexHtml` do plugin, como o Vite o chama. */
function transformar(plugin: Plugin, html: string): string {
  const gancho = plugin.transformIndexHtml;
  if (typeof gancho !== 'object' || !('handler' in gancho)) {
    throw new Error('plugin sem transformIndexHtml.handler');
  }
  return (gancho.handler as (html: string) => string)(html);
}

describe('plugins do index.html', () => {
  it('trocam todos os marcadores do index.html de verdade: nenhum chega ao navegador', () => {
    let html = index;
    html = transformar(pluginMetadados(content, config), html);
    html = transformar(pluginPlanoB(content, config), html);
    html = transformar(pluginNoscript(content, config), html);

    for (const marcador of [
      MARCADOR_DOS_METADADOS,
      MARCADOR_DO_HEAD_DO_PLANO_B,
      MARCADOR_DO_TEXTO_DO_PLANO_B,
      MARCADOR_DO_NOSCRIPT,
    ]) {
      expect(html, marcador).not.toContain(marcador);
    }
    expect(html).toContain(`<title>${content.previa.titulo.replaceAll('&', '&amp;')}</title>`);
    expect(html).toContain('<noscript>');
    expect(html).toContain('class="sem-js plano-b-texto"');
  });

  it('o script do plano B vem antes do pacote, e o <head> mantém o charset primeiro', () => {
    const html = transformar(pluginPlanoB(content, config), index);

    expect(html.indexOf('<meta charset')).toBeLessThan(html.indexOf('<script>'));
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('<script type="module"'));
  });

  it('um "$&" ou "$\'" no conteúdo não é lido como padrão de substituição (texto vai literal)', () => {
    const traiçoeiro = {
      ...content,
      previa: { titulo: 'Preço $& tudo', descricao: "Veja $' e $` e $$ aqui" },
    };
    const html = transformar(pluginMetadados(traiçoeiro, config), index);

    expect(html).toContain('<title>Preço $&amp; tudo</title>');
    expect(html).toContain("Veja $' e $` e $$ aqui");
    expect(html).toBe(
      index.replace(MARCADOR_DOS_METADADOS, () => gerarMetadados(traiçoeiro, config)),
    );
  });

  it('o mesmo vale para o texto simples do <noscript> e do plano B', () => {
    const traiçoeiro = {
      ...content,
      carta: { ...content.carta, convite: "Convite de $& e $' com $$" },
    };

    const noscript = transformar(pluginNoscript(traiçoeiro, config), index);
    const planoB = transformar(pluginPlanoB(traiçoeiro, config), index);

    expect(noscript).toContain("Convite de $&amp; e $' com $$".replace('&amp;', '&amp;'));
    expect(planoB).toContain("Convite de $&amp; e $' com $$");
  });
});
