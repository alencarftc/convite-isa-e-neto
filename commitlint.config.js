/**
 * Conventional Commits 1.0 em português. Guia completo: docs/qualidade.md#commits.
 *
 * @type {import('@commitlint/types').UserConfig}
 */
export default {
  extends: ['@commitlint/config-conventional'],
  helpUrl: 'docs/qualidade.md#commits',
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    'scope-case': [2, 'always', 'kebab-case'],
    'scope-enum': [
      2,
      'always',
      [
        'domain',
        'application',
        'infra',
        'presentation',
        'scenes',
        'audio',
        'content',
        'config',
        'styles',
        'assets',
        'docs',
        'deps',
        'build',
        'ci',
        'tooling',
        'tests',
        'release',
      ],
    ],

    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    // Mensagens em português: a caixa do assunto não é imposta (siglas, nomes próprios, SPEC-07).
    'subject-case': [0],

    // 72 colunas no cabeçalho: legível em `git log --oneline` e nos títulos de PR.
    'header-max-length': [2, 'always', 72],
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 100],
  },
};
