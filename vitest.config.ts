import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          // Testes de unidade: domínio, aplicação, adaptadores e scripts. Sem DOM.
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
          },
        },
        {
          // Testes de integração: camadas conectadas, com DOM simulado.
          extends: true,
          test: {
            name: 'integration',
            environment: 'happy-dom',
            include: ['tests/integration/**/*.test.ts'],
          },
        },
        {
          // Testes de arquitetura: regras de dependência entre camadas.
          extends: true,
          test: {
            name: 'architecture',
            environment: 'node',
            include: ['tests/architecture/**/*.test.ts'],
            testTimeout: 60_000,
          },
        },
      ],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts', 'scripts/**/*.ts'],
        exclude: [
          'src/main.ts',
          'src/**/*.test.ts',
          'scripts/**/*.test.ts',
          'scripts/verificar.ts',
        ],
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: 'coverage',
        thresholds: {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
          'src/domain/**': { statements: 95, branches: 90, functions: 95, lines: 95 },
          'src/application/**': { statements: 95, branches: 90, functions: 95, lines: 95 },
        },
      },
    },
  }),
);
