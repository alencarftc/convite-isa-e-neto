import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
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
    target: 'es2022',
    sourcemap: false,
  },
});
