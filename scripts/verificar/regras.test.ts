import { describe, expect, it } from 'vitest';

import { config } from '../../src/config/config';
import { content } from '../../src/config/content';
import { encontrarTextoPendente, validarDatas, validarLinks, verificarTudo } from './regras';

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

describe('verificarTudo', () => {
  it('o conteúdo e a configuração atuais passam no gate', () => {
    expect(verificarTudo(config, content)).toEqual([]);
  });

  it('junta os problemas de todas as regras', () => {
    const problemas = verificarTudo({ ...config, casamento: 'ontem' }, { mensagem: '[pendente]' });
    expect(problemas.map((p) => p.regra).sort()).toEqual(['datas', 'texto-pendente']);
  });
});
