import { describe, expect, it } from 'vitest';

import { criarCapacidadesDoNavegador, type JanelaComNavegador } from './capacidades-do-navegador';

const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

function janela(
  userAgent: string,
  opcoes: { platform?: string; toques?: number; ancora?: object } = {},
): JanelaComNavegador {
  return {
    navigator: {
      userAgent,
      platform: opcoes.platform ?? 'Linux armv81',
      maxTouchPoints: opcoes.toques ?? 0,
    },
    document: { createElement: () => opcoes.ancora ?? { download: '' } },
  };
}

describe('criarCapacidadesDoNavegador (SPEC-17, RF-17.3)', () => {
  it('computador e Android baixam arquivos', () => {
    expect(
      criarCapacidadesDoNavegador(janela(WINDOWS, { platform: 'Win32' })).baixaArquivos(),
    ).toBe(true);
    expect(criarCapacidadesDoNavegador(janela(ANDROID)).baixaArquivos()).toBe(true);
  });

  it('iPhone, inclusive no navegador interno do WhatsApp, não: vale o link do Google Agenda (CT-17.2)', () => {
    expect(
      criarCapacidadesDoNavegador(janela(IPHONE, { platform: 'iPhone' })).baixaArquivos(),
    ).toBe(false);
  });

  it('iPad novo, que se apresenta como Mac com tela de toque, também não', () => {
    const ipad = janela(
      WINDOWS.replace('Windows NT 10.0; Win64; x64', 'Macintosh; Intel Mac OS X 10_15_7'),
      {
        platform: 'MacIntel',
        toques: 5,
      },
    );

    expect(criarCapacidadesDoNavegador(ipad).baixaArquivos()).toBe(false);
  });

  it('Mac de verdade (sem toque) baixa', () => {
    const mac = janela(
      WINDOWS.replace('Windows NT 10.0; Win64; x64', 'Macintosh; Intel Mac OS X 10_15_7'),
      {
        platform: 'MacIntel',
        toques: 0,
      },
    );

    expect(criarCapacidadesDoNavegador(mac).baixaArquivos()).toBe(true);
  });

  it('navegador sem o atributo download não baixa', () => {
    expect(criarCapacidadesDoNavegador(janela(ANDROID, { ancora: {} })).baixaArquivos()).toBe(
      false,
    );
  });

  it('na dúvida (o navegador lança ao responder), não baixa', () => {
    const quebrada: JanelaComNavegador = {
      navigator: {
        get userAgent(): string {
          throw new Error('indisponível');
        },
        platform: '',
        maxTouchPoints: 0,
      },
      document: { createElement: () => ({}) },
    };

    expect(criarCapacidadesDoNavegador(quebrada).baixaArquivos()).toBe(false);
  });
});
