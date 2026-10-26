import { describe, expect, it } from 'vitest';

import { config } from '../../src/config/config';
import { content } from '../../src/config/content';
import { urlsDaImagem } from '../../src/domain/imagens/catalogo-de-imagens';
import {
  encontrarArquivosCitados,
  LIMITE_DA_EXPERIENCIA,
  LIMITE_DE_FOTO,
  LIMITE_DO_CRITICO,
  validarArquivosCitados,
  validarPeso,
} from './orcamento';

const KB = 1024;
const AUDIOS = ['audio/ambiente.mp3', 'audio/musica-2.mp3'];

/** Tamanho falso: tudo pequeno, a não ser o que o teste pedir. */
function tamanhos(especiais: Record<string, number> = {}, padrao = 10 * KB) {
  return (caminho: string) => especiais[caminho] ?? padrao;
}

describe('validarPeso (SPEC-12, "Orçamento de peso")', () => {
  it('com tudo leve, passa', () => {
    expect(validarPeso(config, content, AUDIOS, ['fonts/a.woff2'], tamanhos())).toEqual([]);
  });

  it('arquivo que não existe não tem peso (quem acusa é arquivo-ausente)', () => {
    expect(validarPeso(config, content, AUDIOS, [], () => undefined)).toEqual([]);
  });

  it('acusa a imagem acima do limite dela, com o arquivo e os dois tamanhos', () => {
    const [ceu] = urlsDaImagem(config.imagens.ceu);

    const problemas = validarPeso(config, content, [], [], tamanhos({ [ceu ?? '']: 301 * KB }));

    expect(problemas.map((p) => p.mensagem)).toEqual([
      `config.imagens.ceu: "public/${ceu}" tem 301.0 KB e o limite é 300.0 KB`,
    ]);
    expect(problemas[0]?.regra).toBe('peso');
  });

  it('cada imagem tem o limite da tabela: o selo passa de 40 KB, o céu ainda cabe em 300 KB', () => {
    const selo = config.imagens.selo as string;
    const ceu = urlsDaImagem(config.imagens.ceu)[0] ?? '';

    expect(validarPeso(config, content, [], [], tamanhos({ [selo]: 41 * KB }))).toHaveLength(1);
    expect(validarPeso(config, content, [], [], tamanhos({ [ceu]: 300 * KB }))).toHaveLength(0);
  });

  it('as fotos dos balões ficam em até 120 KB cada (RNF-05.3)', () => {
    const foto = content.baloes[2]?.foto ?? '';

    const problemas = validarPeso(
      config,
      content,
      [],
      [],
      tamanhos({ [foto]: LIMITE_DE_FOTO + 1 }),
    );

    expect(problemas.map((p) => p.mensagem)).toEqual([
      expect.stringContaining('content.baloes[2].foto'),
    ]);
  });

  it('a imagem da prévia fica em até 300 KB (RF-10.2)', () => {
    const problemas = validarPeso(
      config,
      content,
      [],
      [],
      tamanhos({ [config.publicacao.imagemDaPrevia]: 301 * KB }),
    );

    expect(problemas.map((p) => p.mensagem)).toEqual([
      expect.stringContaining('config.publicacao.imagemDaPrevia'),
    ]);
  });

  it('as fontes ficam em até 50 KB cada', () => {
    const problemas = validarPeso(
      config,
      content,
      [],
      ['fonts/grande.woff2'],
      tamanhos({ 'fonts/grande.woff2': 51 * KB }),
    );

    expect(problemas.map((p) => p.mensagem)).toEqual([
      expect.stringContaining('fonts/grande.woff2'),
    ]);
  });

  it('cada áudio tem o seu limite: a música 2, de 3 MB, e o ambiente, de 400 KB (SPEC-08)', () => {
    const problemas = validarPeso(
      config,
      content,
      AUDIOS,
      [],
      tamanhos({ 'audio/ambiente.mp3': 401 * KB, 'audio/musica-2.mp3': 3 * 1024 * KB + 1 }),
    );

    expect(problemas).toHaveLength(2);
  });

  it('o carregamento crítico (seis imagens e as duas fontes da entrada) passa de 1,45 MB: acusa', () => {
    const cada = Math.ceil(LIMITE_DO_CRITICO / 6) + KB;
    const criticas = ['ceu', 'lago', 'arvores', 'primeiroPlano', 'bauFechado', 'chave'] as const;
    const especiais: Record<string, number> = {};
    for (const chave of criticas) {
      for (const url of urlsDaImagem(config.imagens[chave])) especiais[url] = cada;
    }

    const problemas = validarPeso(config, content, [], [], tamanhos(especiais, 0));

    expect(problemas.map((p) => p.mensagem).join(' ')).toContain('carregamento crítico');
  });

  it('a experiência inteira passa de 8 MB: acusa', () => {
    const problemas = validarPeso(config, content, AUDIOS, [], () => LIMITE_DA_EXPERIENCIA / 3);

    expect(problemas.map((p) => p.mensagem).join(' ')).toContain('a experiência inteira');
  });
});

describe('arquivos citados em CSS e HTML (SPEC-12, "Assets ausentes")', () => {
  const arquivos = [
    {
      caminho: 'src/styles/fontes.css',
      texto: "src: url('/fonts/a.woff2') format('woff2'); background: url(/img/b.png);",
    },
    {
      caminho: 'index.html',
      texto:
        '<link rel="preload" href="/fonts/c.woff2" as="font"><script src="/src/main.ts"></script>',
    },
    { caminho: 'src/a.ts', texto: "const x = url('/ignorado.png')" },
  ];

  it('acha as referências absolutas em CSS e HTML, e ignora o script do módulo e o TypeScript', () => {
    expect(encontrarArquivosCitados(arquivos).map((c) => c.caminho)).toEqual([
      'fonts/a.woff2',
      'img/b.png',
      'fonts/c.woff2',
    ]);
  });

  it('acusa o que não existe em public/', () => {
    const problemas = validarArquivosCitados(arquivos, (caminho) => caminho === 'fonts/a.woff2');

    expect(problemas.map((p) => p.mensagem)).toEqual([
      'src/styles/fontes.css: cita "/img/b.png", que não existe em public/',
      'index.html: cita "/fonts/c.woff2", que não existe em public/',
    ]);
    expect(problemas.every((p) => p.regra === 'arquivo-ausente')).toBe(true);
  });

  it('os CSS e o index.html do projeto só citam arquivos que existem', async () => {
    const { existsSync, readdirSync, readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const raiz = join(import.meta.dirname, '..', '..');
    const reais = [
      'index.html',
      ...readdirSync(join(raiz, 'src', 'styles')).map((arquivo) => `src/styles/${arquivo}`),
    ].map((caminho) => ({ caminho, texto: readFileSync(join(raiz, caminho), 'utf8') }));

    expect(validarArquivosCitados(reais, (c) => existsSync(join(raiz, 'public', c)))).toEqual([]);
  });
});
