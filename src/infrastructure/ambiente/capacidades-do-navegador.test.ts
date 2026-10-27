import { describe, expect, it, vi } from 'vitest';

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

/** Janela com um canvas falso: `getContext` devolve o que o teste mandar e registra o pedido. */
function janelaComCanvas(contexto: object | null, aoPedir = (): void => undefined) {
  const pedidos: { tipo: string; opcoes: unknown }[] = [];
  const janela: JanelaComNavegador = {
    navigator: { userAgent: WINDOWS, platform: 'Win32', maxTouchPoints: 0 },
    document: {
      createElement: () => ({
        getContext: (tipo: string, opcoes: unknown) => {
          pedidos.push({ tipo, opcoes });
          aoPedir();
          return contexto;
        },
      }),
    },
  };
  return { janela, pedidos };
}

describe('criarCapacidadesDoNavegador: WebGL (SPEC-18, RF-18.x)', () => {
  it('pede WebGL 1 recusando o desenho por software e descarta o contexto da sonda', () => {
    const perder = vi.fn();
    const { janela: j, pedidos } = janelaComCanvas({
      getExtension: (nome: string) =>
        nome === 'WEBGL_lose_context' ? { loseContext: perder } : null,
    });

    expect(criarCapacidadesDoNavegador(j).suportaWebGL()).toBe(true);
    expect(pedidos).toEqual([{ tipo: 'webgl', opcoes: { failIfMajorPerformanceCaveat: true } }]);
    expect(perder).toHaveBeenCalledOnce();
  });

  it('sem contexto (navegador sem WebGL ou só por software), não suporta', () => {
    expect(criarCapacidadesDoNavegador(janelaComCanvas(null).janela).suportaWebGL()).toBe(false);
  });

  it('um contexto sem a extensão de descarte ainda conta como WebGL', () => {
    const { janela: j } = janelaComCanvas({ getExtension: () => null });

    expect(criarCapacidadesDoNavegador(j).suportaWebGL()).toBe(true);
  });

  it('se o navegador lança ao criar o canvas ou o contexto, não suporta', () => {
    const { janela: j } = janelaComCanvas({}, () => {
      throw new Error('bloqueado');
    });

    expect(criarCapacidadesDoNavegador(j).suportaWebGL()).toBe(false);
  });

  it('um canvas sem getContext (ambiente de teste) não suporta', () => {
    const j: JanelaComNavegador = {
      navigator: { userAgent: WINDOWS, platform: 'Win32', maxTouchPoints: 0 },
      document: { createElement: () => ({}) },
    };

    expect(criarCapacidadesDoNavegador(j).suportaWebGL()).toBe(false);
  });

  it('sonda uma vez só: as perguntas seguintes reaproveitam a resposta', () => {
    const { janela: j, pedidos } = janelaComCanvas({ getExtension: () => null });
    const capacidades = criarCapacidadesDoNavegador(j);

    capacidades.suportaWebGL();
    capacidades.suportaWebGL();

    expect(pedidos).toHaveLength(1);
  });
});

describe('criarCapacidadesDoNavegador: aparelho modesto (SPEC-18, "Níveis")', () => {
  function com(navegador: Partial<JanelaComNavegador['navigator']>): JanelaComNavegador {
    return {
      navigator: { userAgent: ANDROID, platform: 'Linux armv81', maxTouchPoints: 5, ...navegador },
      document: { createElement: () => ({}) },
    };
  }

  it('até 2 GB de memória é modesto', () => {
    expect(criarCapacidadesDoNavegador(com({ deviceMemory: 2 })).aparelhoModesto()).toBe(true);
    expect(criarCapacidadesDoNavegador(com({ deviceMemory: 4 })).aparelhoModesto()).toBe(false);
  });

  it('até 4 núcleos é modesto', () => {
    expect(criarCapacidadesDoNavegador(com({ hardwareConcurrency: 4 })).aparelhoModesto()).toBe(
      true,
    );
    expect(criarCapacidadesDoNavegador(com({ hardwareConcurrency: 8 })).aparelhoModesto()).toBe(
      false,
    );
  });

  it('o navegador que não informa nada não é tido como modesto', () => {
    expect(criarCapacidadesDoNavegador(com({})).aparelhoModesto()).toBe(false);
  });

  it('um navegador que lança ao responder também não', () => {
    const quebrada: JanelaComNavegador = {
      navigator: {
        get deviceMemory(): number {
          throw new Error('indisponível');
        },
        userAgent: ANDROID,
        platform: '',
        maxTouchPoints: 0,
      },
      document: { createElement: () => ({}) },
    };

    expect(criarCapacidadesDoNavegador(quebrada).aparelhoModesto()).toBe(false);
  });
});
