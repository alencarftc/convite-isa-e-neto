import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Monta no DOM o corpo do `index.html` de verdade (primeiro quadro: névoa, nomes e botões da
 * entrada), sem os scripts. Assim os testes usam a mesma marcação que o convidado recebe.
 */
export function montarIndexHtml(): void {
  // O `<link rel="stylesheet">` do head (ADR-0037) faria o happy-dom tentar baixar o CSS e registrar um erro; o corpo basta.
  const html = readFileSync(
    join(import.meta.dirname, '..', '..', '..', 'index.html'),
    'utf8',
  ).replace(/<link[^>]*rel="stylesheet"[^>]*>/g, '');
  const documento = new DOMParser().parseFromString(html, 'text/html');
  for (const script of documento.querySelectorAll('script')) script.remove();
  document.body.innerHTML = documento.body.innerHTML;
  document.body.setAttribute('data-fase', documento.body.getAttribute('data-fase') ?? 'carregando');
}

/** Texto do `index.html` de um seletor, para comparar com `content.ts`. */
export function textoDoIndexHtml(seletor: string): string {
  montarIndexHtml();
  return document.querySelector(seletor)?.textContent.trim() ?? '';
}
