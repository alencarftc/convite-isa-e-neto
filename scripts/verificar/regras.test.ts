import { describe, expect, it } from 'vitest';

import { config } from '../../src/config/config';
import { content } from '../../src/config/content';
import { URL_BASE_DO_GOOGLE_AGENDA } from '../../src/domain/agenda/evento-de-agenda';
import {
  encontrarTextoPendente,
  encontrarUrlsExternas,
  validarArquivos,
  validarArteDefinitiva,
  validarConsistenciaDeDatas,
  validarDatas,
  validarLinks,
  validarPublicacao,
  verificarTudo,
} from './regras';

describe('encontrarTextoPendente', () => {
  it('aponta o caminho de cada texto entre colchetes', () => {
    const problemas = encontrarTextoPendente({
      mensagem: { versoLouvor: '[verso do louvor]', assinatura: 'Com carinho' },
      baloes: [{ alt: '[descrever a foto 1]' }, { alt: 'Casal na praia' }],
    });

    expect(problemas.map((p) => p.mensagem)).toEqual([
      'content.mensagem.versoLouvor: "[verso do louvor]"',
      'content.baloes[0].alt: "[descrever a foto 1]"',
    ]);
  });

  it('verso vazio é uma escolha, não uma pendência (SPEC-14, RF-14.5)', () => {
    expect(encontrarTextoPendente({ mensagem: { versoLouvor: '' } })).toEqual([]);
  });

  it('ignora números, booleanos e nulos', () => {
    expect(encontrarTextoPendente({ a: 1, b: true, c: null })).toEqual([]);
  });
});

describe('validarDatas', () => {
  it('aceita as datas reais da configuração', () => {
    expect(validarDatas(config)).toEqual([]);
  });

  it('rejeita data sem fuso de Brasília', () => {
    const problemas = validarDatas({ ...config, casamento: '2027-01-22T17:00:00' });
    expect(problemas).toHaveLength(1);
    expect(problemas[0]?.mensagem).toContain('config.casamento');
  });

  it('rejeita data inexistente', () => {
    expect(validarDatas({ ...config, prazoConfirmacao: '2026-13-45T10:00:00-03:00' })).toHaveLength(
      1,
    );
  });

  it('exige o prazo antes do casamento', () => {
    const problemas = validarDatas({ ...config, prazoConfirmacao: config.casamento });
    expect(problemas[0]?.mensagem).toContain('anterior');
  });
});

describe('validarLinks', () => {
  it('aceita links https', () => {
    expect(validarLinks(config)).toEqual([]);
  });

  it('rejeita link sem https', () => {
    const problemas = validarLinks({
      ...config,
      links: { ...config.links, formulario: 'http://forms.gle/x' },
    });
    expect(problemas).toHaveLength(1);
    expect(problemas[0]?.mensagem).toContain('config.links.formulario');
  });
});

describe('validarPublicacao', () => {
  it('o endereço atual é completo, com https:// e barra no fim', () => {
    expect(validarPublicacao(config)).toEqual([]);
  });

  it.each([
    'alencarftc.github.io/convite/',
    'http://x.example/',
    'https://x.example',
    '[URL publicada]',
  ])('acusa o endereço "%s"', (url) => {
    const problemas = validarPublicacao({ ...config, publicacao: { ...config.publicacao, url } });

    expect(problemas).toHaveLength(1);
    expect(problemas[0]?.regra).toBe('publicacao');
  });
});

describe('encontrarUrlsExternas', () => {
  const permitidos = ['http://www.w3.org/2000/svg', 'https://forms.gle/abc'];

  it('aceita só os endereços previstos', () => {
    const arquivos = [
      {
        caminho: 'a.ts',
        texto: "const ns = 'http://www.w3.org/2000/svg'; const f = 'https://forms.gle/abc';",
      },
    ];

    expect(encontrarUrlsExternas(arquivos, permitidos)).toEqual([]);
  });

  it('acusa fonte, script ou análise de terceiros, com o arquivo e o endereço', () => {
    const arquivos = [
      {
        caminho: 'index.html',
        texto: '<link href="https://fonts.googleapis.com/css2?family=X" rel="stylesheet">',
      },
      {
        caminho: 'src/a.ts',
        texto: "import('https://cdn.example/lib.js'); fetch(`https://analytics.example/x`)",
      },
    ];

    const problemas = encontrarUrlsExternas(arquivos, permitidos);

    expect(problemas.map((p) => p.mensagem)).toEqual([
      'index.html: endereço externo não previsto: "https://fonts.googleapis.com/css2?family=X"',
      'src/a.ts: endereço externo não previsto: "https://cdn.example/lib.js"',
      'src/a.ts: endereço externo não previsto: "https://analytics.example/x"',
    ]);
    expect(problemas.every((p) => p.regra === 'servico-externo')).toBe(true);
  });

  it('o código do site hoje só fala com o formulário, o mapa, o próprio endereço e o namespace do SVG', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const raiz = join(import.meta.dirname, '..', '..');
    const arquivos = [
      'index.html',
      ...readdirSync(join(raiz, 'src'), { recursive: true, encoding: 'utf8' })
        .map((c) => `src/${c.replaceAll('\\', '/')}`)
        .filter((c) => /\.(ts|css)$/.test(c) && !c.endsWith('.test.ts')),
    ].map((caminho) => ({ caminho, texto: readFileSync(join(raiz, caminho), 'utf8') }));

    const problemas = encontrarUrlsExternas(arquivos, [
      'http://www.w3.org/2000/svg',
      config.links.formulario,
      config.links.mapa,
      config.publicacao.url,
      URL_BASE_DO_GOOGLE_AGENDA,
    ]);

    expect(problemas).toEqual([]);
  });
});

describe('validarConsistenciaDeDatas', () => {
  it('os textos atuais batem com as datas de config', () => {
    expect(validarConsistenciaDeDatas(config, content)).toEqual([]);
  });

  it('com data inválida em config, não quebra: quem acusa é a regra de datas', () => {
    expect(validarConsistenciaDeDatas({ ...config, casamento: 'ontem' }, content)).toEqual([]);
  });

  it('acusa um prazo escrito diferente em "confirme até" e no aviso de encerramento', () => {
    const problemas = validarConsistenciaDeDatas(config, {
      ...content,
      botoes: {
        ...content.botoes,
        prazo: 'Confirme até 15 de dezembro de 2026.',
        encerrado: 'As confirmações foram encerradas.',
      },
    });

    expect(problemas.map((p) => p.mensagem)).toEqual([
      expect.stringContaining('content.botoes.prazo'),
      expect.stringContaining('content.botoes.encerrado'),
    ]);
    expect(problemas.every((p) => p.regra === 'datas-nos-textos')).toBe(true);
  });

  it('acusa a data da carta que não é a do casamento (dia da semana, dia, mês, ano e hora)', () => {
    const problemas = validarConsistenciaDeDatas(config, {
      ...content,
      carta: { ...content.carta, data: 'SÁBADO · 22 DE JANEIRO DE 2027 · 17H' },
    });

    expect(problemas).toHaveLength(1);
    expect(problemas[0]?.mensagem).toContain('SEXTA-FEIRA · 22 DE JANEIRO DE 2027 · 17H');
  });

  it('acusa o aviso "É hoje" que cita outro horário', () => {
    const problemas = validarConsistenciaDeDatas(config, {
      ...content,
      contagem: { ...content.contagem, noDia: 'É hoje! Nos vemos às 16h.' },
    });

    expect(problemas.map((p) => p.mensagem)).toEqual([expect.stringContaining('"17h"')]);
  });

  it('acompanha a config: mudando o casamento de data, os textos antigos deixam de bater', () => {
    const problemas = validarConsistenciaDeDatas(
      { ...config, casamento: '2027-02-05T17:00:00-03:00' },
      content,
    );

    expect(problemas.map((p) => p.mensagem).join(' ')).toContain(
      'SEXTA-FEIRA · 5 DE FEVEREIRO DE 2027',
    );
  });
});

describe('validarArteDefinitiva', () => {
  it('acusa cada imagem que ainda aponta para a arte provisória', () => {
    const problemas = validarArteDefinitiva(config, content);

    expect(problemas.length).toBeGreaterThan(0);
    expect(problemas.every((p) => p.regra === 'arte-provisoria')).toBe(true);
    expect(problemas.map((p) => p.mensagem)).toContainEqual(
      expect.stringContaining('config.imagens.bauFechado'),
    );
  });

  it('acusa também as fotos dos balões que apontam para a arte provisória', () => {
    const problemas = validarArteDefinitiva(config, content);

    expect(problemas.map((p) => p.mensagem)).toContainEqual(
      expect.stringContaining('content.baloes[0].foto'),
    );
  });

  it('não acusa nada quando a arte é a definitiva', () => {
    const definitiva = {
      ...config,
      imagens: Object.fromEntries(
        Object.keys(config.imagens).map((chave) => [chave, `assets/scene/${chave}.webp`]),
      ),
    } as unknown as typeof config;

    const semFotosProvisorias = {
      baloes: content.baloes.map((balao) => ({ ...balao, foto: 'photos/foto.jpg' })),
    };

    expect(validarArteDefinitiva(definitiva, semFotosProvisorias)).toEqual([]);
  });
});

describe('validarArquivos', () => {
  it('passa quando todos os arquivos citados existem', () => {
    expect(validarArquivos(config, content, ['audio/a.mp3'], () => true)).toEqual([]);
  });

  it('acusa imagem e áudio inexistentes, com o caminho em public/', () => {
    const problemas = validarArquivos(
      config,
      content,
      ['audio/ambiente.mp3'],
      (caminho) => caminho !== 'audio/ambiente.mp3' && caminho !== 'assets/provisorio/chave.svg',
    );

    expect(problemas.map((p) => p.mensagem)).toEqual([
      'config.imagens.chave: "public/assets/provisorio/chave.svg" não existe',
      'áudio: "public/audio/ambiente.mp3" não existe',
    ]);
    expect(problemas.every((p) => p.regra === 'arquivo-ausente')).toBe(true);
  });

  it('a arte por orientação confere os dois arquivos', () => {
    const visitados: string[] = [];

    validarArquivos(config, content, [], (caminho) => {
      visitados.push(caminho);
      return true;
    });

    expect(visitados).toContain('assets/provisorio/ceu-9x16.svg');
    expect(visitados).toContain('assets/provisorio/ceu-16x9.svg');
  });

  it('confere a imagem da prévia e os ícones da publicação (SPEC-10)', () => {
    const problemas = validarArquivos(
      config,
      content,
      [],
      (caminho) => !caminho.startsWith('favicon/') && caminho !== 'og-image.jpg',
    );

    expect(problemas.map((p) => p.mensagem)).toEqual([
      'config.publicacao.imagemDaPrevia: "public/og-image.jpg" não existe',
      'config.publicacao.icone32: "public/favicon/favicon-32.png" não existe',
      'config.publicacao.iconeApple: "public/favicon/apple-touch-icon.png" não existe',
    ]);
  });

  it('confere também os arquivos das fotos dos balões', () => {
    const problemas = validarArquivos(
      config,
      content,
      [],
      (caminho) => !caminho.includes('foto-3'),
    );

    expect(problemas.map((p) => p.mensagem)).toEqual([
      'content.baloes[2].foto: "public/assets/provisorio/foto-3.svg" não existe',
    ]);
  });
});

describe('verificarTudo', () => {
  const entradas = {
    config,
    conteudo: content,
    arquivosDeAudio: ['audio/ambiente.mp3'],
    existe: () => true,
  };

  it('o conteúdo e as datas atuais passam nas regras de texto, data e link', () => {
    const regras = new Set(verificarTudo(entradas).map((p) => p.regra));

    // Resta a arte provisória e o texto pendente (a descrição das fotos, entre colchetes).
    expect(regras).toEqual(new Set(['arte-provisoria', 'texto-pendente']));
  });

  it('o endereço do Google Agenda é permitido, e outro serviço de agenda não (SPEC-17, RF-17.3)', () => {
    const comArquivo = (texto: string) =>
      verificarTudo({
        ...entradas,
        arquivosDoCodigo: [{ caminho: 'src/x.ts', texto }],
      }).filter((p) => p.regra === 'servico-externo');

    expect(
      comArquivo("const u = 'https://calendar.google.com/calendar/render?action=TEMPLATE';"),
    ).toEqual([]);
    expect(comArquivo("const u = 'https://calendly.com/alguem';")).toHaveLength(1);
  });

  it('junta os problemas de todas as regras', () => {
    const problemas = verificarTudo({
      ...entradas,
      config: { ...config, casamento: 'ontem' },
      conteudo: { ...content, rotulos: { ...content.rotulos, informacoes: '[pendente]' } },
      existe: () => false,
    });

    expect(new Set(problemas.map((p) => p.regra))).toEqual(
      new Set(['datas', 'texto-pendente', 'arte-provisoria', 'arquivo-ausente']),
    );
  });
});
