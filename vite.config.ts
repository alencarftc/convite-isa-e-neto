import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

import { alvosDoBuild } from './scripts/vite/alvo';
import { pluginMetadados } from './scripts/vite/metadados';
import { pluginNoscript } from './scripts/vite/noscript';
import { pluginPlanoB } from './scripts/vite/plano-b';
import { config } from './src/config/config';
import { content } from './src/config/content';

const { browserslist } = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { browserslist: string[] };

export default defineConfig({
  plugins: [
    pluginMetadados(content, config),
    pluginPlanoB(content, config),
    pluginNoscript(content, config),
  ],
  // Caminhos relativos: o build funciona em qualquer subpasta do GitHub Pages (RF-01.2).
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // A 5173 é fixa e o dev server fica sempre ligado nela: se a porta estiver ocupada,
    // falha em vez de subir em outra (que quebraria links, testes no celular e o preview).
    port: 5173,
    strictPort: true,
    // Saídas de testes e de build não podem recarregar a página (o relatório de cobertura traz .html).
    watch: { ignored: ['**/coverage/**', '**/dist/**', '**/reports/**', '**/docs/**'] },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    // Os aparelhos que o convite promete atender (package.json, SPEC-15), não "o que o Vite acha novo".
    target: alvosDoBuild(browserslist),
    sourcemap: false,
  },
});
