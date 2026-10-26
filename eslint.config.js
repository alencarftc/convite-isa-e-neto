import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Domínio e aplicação não conhecem o navegador: tudo que toca DOM, armazenamento
// ou tempo passa por uma porta (src/application/ports) implementada na infraestrutura.
const GLOBAIS_DO_NAVEGADOR = [
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'matchMedia',
  'fetch',
  'Audio',
  'Image',
  'HTMLElement',
  'requestAnimationFrame',
  'cancelAnimationFrame',
].map((name) => ({
  name,
  message: 'Use uma porta (src/application/ports); só a infraestrutura toca o navegador.',
}));

const TEMPORIZADORES = ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'].map(
  (name) => ({
    name,
    message: 'O domínio é puro: agendamento fica fora dele.',
  }),
);

export default defineConfig(
  globalIgnores(['dist/', 'coverage/', 'reports/', 'node_modules/', 'docs/', '.changeset/']),

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'Use união de literais; enums não são apagáveis.',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    name: 'dominio-puro',
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...GLOBAIS_DO_NAVEGADOR, ...TEMPORIZADORES],
      'no-restricted-properties': [
        'error',
        {
          object: 'Date',
          property: 'now',
          message: 'Receba o instante por parâmetro (porta Relogio).',
        },
        { object: 'Math', property: 'random', message: 'O domínio é determinístico.' },
      ],
    },
  },

  {
    name: 'aplicacao-sem-navegador',
    files: ['src/application/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...GLOBAIS_DO_NAVEGADOR],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Use a porta Relogio.' },
        { object: 'Math', property: 'random', message: 'Injete a aleatoriedade por uma porta.' },
      ],
    },
  },

  {
    name: 'testes',
    files: ['**/*.test.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },

  {
    name: 'scripts-de-linha-de-comando',
    files: ['scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },

  {
    name: 'arquivos-js-de-configuracao',
    files: ['**/*.{js,cjs,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },

  prettier,
);
