/**
 * Regras de arquitetura (clean architecture em monolito).
 * Explicação e diagrama: docs/arquitetura.md. Gate: `npm run arch` e `npm run test:arch`.
 *
 * domain          -> (nada)
 * application     -> domain
 * config          -> domain
 * infrastructure  -> application, domain          (+ pacotes npm: gsap, howler)
 * presentation    -> application, domain          (+ pacotes npm: gsap)
 * main.ts         -> tudo                          (raiz de composição)
 *
 * Os padrões usam `(^|/)` para valerem também nos fixtures de tests/architecture.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'sem-ciclos',
      severity: 'error',
      comment: 'Dependências circulares escondem acoplamento e quebram a leitura por camada.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'dominio-e-puro',
      severity: 'error',
      comment:
        'O domínio só importa o próprio domínio: sem DOM, GSAP, Howler, Node ou outras camadas.',
      from: { path: '(^|/)src/domain/', pathNot: '\\.test\\.ts$' },
      to: { pathNot: '(^|/)src/domain/' },
    },
    {
      name: 'aplicacao-so-depende-do-dominio',
      severity: 'error',
      comment:
        'Casos de uso e portas dependem só do domínio; adaptadores concretos entram por injeção.',
      from: { path: '(^|/)src/application/', pathNot: '\\.test\\.ts$' },
      to: { pathNot: '(^|/)src/(domain|application)/' },
    },
    {
      name: 'teste-de-unidade-fica-na-sua-camada',
      severity: 'error',
      comment:
        'Testes de domínio e aplicação usam só a própria camada (e o vitest); cruzar camadas é teste de integração e mora em tests/integration.',
      from: { path: '(^|/)src/(domain|application)/.*\\.test\\.ts$' },
      to: { path: '(^|/)src/(infrastructure|presentation|config)/' },
    },
    {
      name: 'config-so-depende-do-dominio',
      severity: 'error',
      comment: 'config e content são dados tipados pelo domínio; não importam comportamento.',
      from: { path: '(^|/)src/config/' },
      to: { pathNot: '(^|/)src/(domain|config)/' },
    },
    {
      name: 'infraestrutura-nao-conhece-apresentacao',
      severity: 'error',
      comment: 'Adaptadores implementam portas; não conhecem cenas nem componentes.',
      from: { path: '(^|/)src/infrastructure/' },
      to: { path: '(^|/)src/presentation/' },
    },
    {
      name: 'apresentacao-nao-conhece-infraestrutura',
      severity: 'error',
      comment:
        'Cenas recebem as portas pelo contexto (ctx); quem instancia adaptadores é o main.ts.',
      from: { path: '(^|/)src/presentation/' },
      to: { path: '(^|/)src/infrastructure/' },
    },
    {
      name: 'camadas-nao-importam-a-raiz-de-composicao',
      severity: 'error',
      comment: 'O main.ts conhece todas as camadas; nenhuma camada conhece o main.ts.',
      from: { path: '(^|/)src/(domain|application|infrastructure|presentation|config)/' },
      to: { path: '(^|/)src/main\\.ts$' },
    },
    {
      name: 'producao-nao-importa-testes',
      severity: 'error',
      comment: 'Código de produção não depende de arquivos de teste nem de fixtures.',
      from: { path: '(^|/)src/', pathNot: '\\.test\\.ts$' },
      to: {
        path: ['\\.test\\.ts$', '(^|/)tests/'],
        pathNot: '(^|/)tests/architecture/fixtures/',
      },
    },
    {
      name: 'src-nao-importa-scripts',
      severity: 'error',
      comment: 'Scripts de verificação leem o src, nunca o contrário.',
      from: { path: '(^|/)src/' },
      to: { path: '(^|/)scripts/' },
    },
    {
      name: 'producao-sem-dependencia-de-desenvolvimento',
      severity: 'error',
      comment: 'O bundle só pode usar pacotes de "dependencies".',
      from: { path: '(^|/)src/', pathNot: '\\.test\\.ts$' },
      to: { dependencyTypes: ['npm-dev'] },
    },
    {
      name: 'sem-dependencia-nao-declarada',
      severity: 'error',
      comment: 'Todo pacote importado precisa estar no package.json.',
      from: {},
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] },
    },
    {
      name: 'sem-importacao-irresolvivel',
      severity: 'error',
      comment: 'Importação que não resolve vira erro em tempo de build.',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'sem-modulos-core-depreciados',
      severity: 'warn',
      comment: 'Evite módulos do Node marcados como depreciados.',
      from: {},
      to: { dependencyTypes: ['deprecated'] },
    },
    {
      name: 'sem-orfaos',
      severity: 'warn',
      comment: 'Módulo que ninguém importa é código morto ou falta de ligação.',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)src/main\\.ts$',
          '\\.d\\.ts$',
          '\\.test\\.ts$',
          '(^|/)scripts/verificar\\.ts$',
          '(^|/)tests/',
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
