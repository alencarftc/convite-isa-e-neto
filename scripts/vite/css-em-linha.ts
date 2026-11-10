import type { Plugin } from 'vite';

/**
 * Embute o CSS do build no `index.html` (09/11/2026). O arquivo de estilos do Vite é uma folha de 25 kB (6 kB comprimida)
 * que bloqueia a renderização: o navegador só pinta depois de baixá-la, uma ida e volta à rede a mais, e o PageSpeed a
 * aponta como "recurso que bloqueia a renderização". Dentro do HTML ela chega junto com ele, e a primeira tela já sai
 * estilizada, sem FOUC. O convite tem uma tela só, então não há outra página que perderia o cache do arquivo.
 */

/** Os arquivos de fonte que o CSS cita saem como `../fonts/…` (relativos à pasta `assets/`); no HTML da raiz, `./fonts/…`. */
function ajustarCaminhos(css: string): string {
  return css.replaceAll('url(../', 'url(./');
}

function escaparParaRegex(texto: string): string {
  return texto.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Troca a ligação `<link rel="stylesheet" … href="…/arquivo.css">` pelo `<style>` com o conteúdo dele. Sem a ligação no
 * HTML, devolve o HTML como veio (e `embutido` falso).
 */
export function embutirCssNoHtml(
  html: string,
  nomeDoArquivo: string,
  css: string,
): { html: string; embutido: boolean } {
  const base = nomeDoArquivo.split('/').pop() ?? nomeDoArquivo;
  const ligacao = new RegExp(
    `<link\\b[^>]*\\brel="stylesheet"[^>]*\\bhref="[^"]*${escaparParaRegex(base)}"[^>]*>`,
  );
  if (!ligacao.test(html)) return { html, embutido: false };
  // Um `</style>` dentro do CSS fecharia o bloco antes da hora; o CSS do convite não o tem, mas custa uma linha garantir.
  const seguro = ajustarCaminhos(css).replaceAll('</style', String.raw`<\/style`);
  return { html: html.replace(ligacao, () => `<style>${seguro}</style>`), embutido: true };
}

/** Plugin do Vite, só no build: embute cada CSS emitido que o HTML liga e o tira da saída. */
export function pluginCssEmLinha(): Plugin {
  return {
    name: 'convite-css-em-linha',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, contexto) {
        const pacote = contexto.bundle;
        if (!pacote) return html;
        let resultado = html;
        for (const [nome, item] of Object.entries(pacote)) {
          if (item.type !== 'asset' || !nome.endsWith('.css')) continue;
          const css =
            typeof item.source === 'string' ? item.source : new TextDecoder().decode(item.source);
          const embutiu = embutirCssNoHtml(resultado, nome, css);
          if (!embutiu.embutido) continue;
          resultado = embutiu.html;
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- o arquivo já está dentro do HTML
          delete pacote[nome];
        }
        return resultado;
      },
    },
  };
}
