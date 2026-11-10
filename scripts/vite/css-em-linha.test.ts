import { describe, expect, it } from 'vitest';

import { embutirCssNoHtml } from './css-em-linha';

const HTML = `<head>
<script type="module" crossorigin src="./assets/index-ABC.js"></script>
<link rel="stylesheet" crossorigin href="./assets/index-XYZ.css">
</head>`;

describe('embutirCssNoHtml (FOUC, 09/11/2026)', () => {
  it('troca a ligação do CSS pelo <style> com o conteúdo, e deixa o script como estava', () => {
    const { html, embutido } = embutirCssNoHtml(HTML, 'assets/index-XYZ.css', 'body{margin:0}');

    expect(embutido).toBe(true);
    expect(html).toContain('<style>body{margin:0}</style>');
    expect(html).not.toContain('rel="stylesheet"');
    expect(html).toContain(
      '<script type="module" crossorigin src="./assets/index-ABC.js"></script>',
    );
  });

  it('as fontes citadas como ../fonts/ passam a ./fonts/, porque o HTML está na raiz e não em assets/', () => {
    const css = '@font-face{src:url(../fonts/a.woff2)}.x{background:url(../fonts/b.woff2)}';

    const { html } = embutirCssNoHtml(HTML, 'assets/index-XYZ.css', css);

    expect(html).toContain('url(./fonts/a.woff2)');
    expect(html).toContain('url(./fonts/b.woff2)');
    expect(html).not.toContain('../fonts/');
  });

  it('um </style> dentro do CSS não fecha o bloco antes da hora', () => {
    const { html } = embutirCssNoHtml(HTML, 'assets/index-XYZ.css', 'a::after{content:"</style>"}');

    expect(html.match(/<\/style>/g)).toHaveLength(1);
  });

  it('sem a ligação desse arquivo no HTML, nada muda e o arquivo continua sendo emitido', () => {
    const { html, embutido } = embutirCssNoHtml(HTML, 'assets/outro.css', 'a{}');

    expect(embutido).toBe(false);
    expect(html).toBe(HTML);
  });

  it("o conteúdo com $& ou $' não é lido como padrão de substituição", () => {
    const { html } = embutirCssNoHtml(HTML, 'assets/index-XYZ.css', "a::after{content:'$&$\\''}");

    expect(html).toContain("content:'$&$\\''");
  });
});
