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

// O convite promete Safari e iOS 15.1 e Chrome 90 (browserslist, SPEC-15). O build converte a sintaxe,
// mas não inclui APIs novas: elas simplesmente não existem nesses aparelhos e quebram a execução.
const MENSAGEM_DO_PISO =
  'API mais nova que o piso do convite (Safari/iOS 15.1, Chrome 90): use a alternativa clássica.';
const APIS_ALEM_DO_PISO = [
  { object: 'Object', property: 'hasOwn' },
  { object: 'crypto', property: 'randomUUID' },
  ...['at', 'findLast', 'findLastIndex', 'toSorted', 'toReversed', 'toSpliced'].map((property) => ({
    property,
  })),
].map((regra) => ({ ...regra, message: MENSAGEM_DO_PISO }));
const GLOBAIS_ALEM_DO_PISO = [{ name: 'structuredClone', message: MENSAGEM_DO_PISO }];

const PROPRIEDADES_DO_DOMINIO = [
  { object: 'Date', property: 'now', message: 'Receba o instante por parâmetro (porta Relogio).' },
  { object: 'Math', property: 'random', message: 'O domínio é determinístico.' },
];
const PROPRIEDADES_DA_APLICACAO = [
  { object: 'Date', property: 'now', message: 'Use a porta Relogio.' },
  { object: 'Math', property: 'random', message: 'Injete a aleatoriedade por uma porta.' },
];

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
      'no-restricted-properties': ['error', ...PROPRIEDADES_DO_DOMINIO],
    },
  },

  {
    name: 'aplicacao-sem-navegador',
    files: ['src/application/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...GLOBAIS_DO_NAVEGADOR],
      'no-restricted-properties': ['error', ...PROPRIEDADES_DA_APLICACAO],
    },
  },

  // O piso do navegador vale para o código que vai para o aparelho, não para os testes (que rodam
  // no Node). Cada bloco repete as regras da sua camada, porque uma regra substitui a anterior.
  {
    name: 'piso-do-dominio',
    files: ['src/domain/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...GLOBAIS_DO_NAVEGADOR,
        ...TEMPORIZADORES,
        ...GLOBAIS_ALEM_DO_PISO,
      ],
      'no-restricted-properties': ['error', ...PROPRIEDADES_DO_DOMINIO, ...APIS_ALEM_DO_PISO],
    },
  },
  {
    name: 'piso-da-aplicacao',
    files: ['src/application/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-globals': ['error', ...GLOBAIS_DO_NAVEGADOR, ...GLOBAIS_ALEM_DO_PISO],
      'no-restricted-properties': ['error', ...PROPRIEDADES_DA_APLICACAO, ...APIS_ALEM_DO_PISO],
    },
  },
  {
    name: 'piso-do-navegador',
    files: [
      'src/presentation/**/*.ts',
      'src/infrastructure/**/*.ts',
      'src/config/**/*.ts',
      'src/main.ts',
    ],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-globals': ['error', ...GLOBAIS_ALEM_DO_PISO],
      'no-restricted-properties': ['error', ...APIS_ALEM_DO_PISO],
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
