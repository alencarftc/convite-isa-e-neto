/**
 * Copia os WOFF2 (subconjunto latino, que cobre o português) dos pacotes @fontsource para
 * `public/fonts/`, com nomes estáveis, para o convite servi-los do próprio site (CA-01.3.2).
 * Rodar de novo só se mudar a versão dos pacotes: `pnpm fontes`.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FONTES = [
  {
    pacote: 'great-vibes',
    arquivo: 'great-vibes-latin-400-normal.woff2',
    destino: 'great-vibes-400.woff2',
  },
  {
    pacote: 'cormorant-garamond',
    arquivo: 'cormorant-garamond-latin-400-normal.woff2',
    destino: 'cormorant-garamond-400.woff2',
  },
  {
    pacote: 'cormorant-garamond',
    arquivo: 'cormorant-garamond-latin-600-normal.woff2',
    destino: 'cormorant-garamond-600.woff2',
  },
  {
    pacote: 'cormorant-garamond',
    arquivo: 'cormorant-garamond-latin-400-italic.woff2',
    destino: 'cormorant-garamond-400-italico.woff2',
  },
] as const;

const LICENCAS = [
  { pacote: 'great-vibes', destino: 'LICENCA-great-vibes.txt' },
  { pacote: 'cormorant-garamond', destino: 'LICENCA-cormorant-garamond.txt' },
] as const;

const destinoBase = join(import.meta.dirname, '..', 'public', 'fonts');
mkdirSync(destinoBase, { recursive: true });

function origem(pacote: string, ...caminho: string[]): string {
  return join(import.meta.dirname, '..', 'node_modules', '@fontsource', pacote, ...caminho);
}

for (const { pacote, arquivo, destino } of FONTES) {
  const para = join(destinoBase, destino);
  mkdirSync(dirname(para), { recursive: true });
  copyFileSync(origem(pacote, 'files', arquivo), para);
  console.log(`fonte ${destino}`);
}
for (const { pacote, destino } of LICENCAS) {
  copyFileSync(origem(pacote, 'LICENSE'), join(destinoBase, destino));
  console.log(`licença ${destino}`);
}
