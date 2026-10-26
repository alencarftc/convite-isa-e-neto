import { describe, expect, it } from 'vitest';

import { config } from '../../src/config/config';
import { content } from '../../src/config/content';
import {
  encontrarTextoPendente,
  validarArquivos,
  validarArteDefinitiva,
  validarDatas,
  validarLinks,
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
