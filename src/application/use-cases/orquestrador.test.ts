import { describe, expect, it, vi } from 'vitest';

import type { EscolhaDeEntrada, EventosConvite } from '@/domain/eventos/eventos-convite';

import { criarBarramento } from '../barramento-eventos';
import type { Cena } from '../cena';
import { criarEstado, type EstadoConvite } from '../estado-convite';
import type { Ambiente } from '../ports/ambiente';
import {
  criarOrquestrador,
  type EtapaDoConvite,
  type Orquestrador,
  type PlanoDoConvite,
} from './orquestrador';

interface CenaFalsa<R = void> extends Cena<R> {
  readonly chamadas: string[];
}

/** Cena que registra o que o orquestrador pede, na ordem global do `registro`. */
function cenaFalsa<R = void>(
  nome: string,
  registro: string[],
  run: () => Promise<R> = () => Promise.resolve(undefined as R),
): CenaFalsa<R> {
  const chamadas: string[] = [];
  const anotar = (acao: string) => {
    chamadas.push(acao);
    registro.push(`${nome}.${acao}`);
  };
  return {
    chamadas,
    init: () => {
      anotar('init');
    },
    run: () => {
      anotar('run');
      return run();
    },
    skip: () => {
      anotar('skip');
    },
    destroy: () => {
      anotar('destroy');
    },
  };
}

const ambiente = (reduzido = false): Ambiente => ({
  animacaoReduzida: () => reduzido,
  porToque: () => false,
  algumToque: () => false,
  orientacao: () => 'vertical',
  aoMudarOrientacao: () => () => undefined,
});

function montar(
  opcoes: {
    escolha?: EscolhaDeEntrada;
    reduzido?: boolean;
    semEntrada?: boolean;
    falhaEm?: string;
    aoRodar?: Partial<Record<string, (orquestrador: Orquestrador) => Promise<void>>>;
  } = {},
) {
  const registro: string[] = [];
  const estado = criarEstado({
    preferencias: { ler: (_chave, padrao) => padrao, gravar: () => undefined },
    ambiente: ambiente(opcoes.reduzido),
  });
  const eventos = criarBarramento<EventosConvite>();
  const registrarErro = vi.fn<(erro: unknown) => void>();

  const rodar = (nome: string): (() => Promise<void>) => {
    return () => {
      if (opcoes.falhaEm === nome) return Promise.reject(new Error(`falha em ${nome}`));
      return opcoes.aoRodar?.[nome]?.(orquestrador) ?? Promise.resolve();
    };
  };
  const entrada = cenaFalsa<EscolhaDeEntrada>('entrada', registro, () => {
    estado.definirFase('aguardando-entrada');
    return Promise.resolve(opcoes.escolha ?? 'entrar');
  });
  const etapas = (
    [
      ['bosque', 'bosque'],
      ['bau', 'aguardando-bau'],
      ['historia', 'historia'],
      ['carta', 'carta'],
      ['convite', 'convite'],
    ] as const
  ).map(([nome, fase]) => ({ nome, fase, cena: cenaFalsa(nome, registro, rodar(nome)) }));
  const final = cenaFalsa('informacoes', registro, rodar('informacoes'));

  const plano: PlanoDoConvite = {
    ...(opcoes.semEntrada ? {} : { entrada }),
    etapas: etapas.map<EtapaDoConvite>(({ nome, fase, cena }) => ({ nome, fase, cena })),
    final,
  };
  const orquestrador = criarOrquestrador({ plano, estado, eventos, registrarErro });

  const fases: string[] = [];
  estado.aoMudar((e) => fases.push(e.fase));

  return { orquestrador, estado, eventos, registrarErro, registro, fases, entrada, etapas, final };
}

const aoFinal = (estado: EstadoConvite) => estado.fase === 'informacoes';

describe('criarOrquestrador', () => {
  it('percorre entrada, bosque, baú, história, carta, convite e informações (CA-01.4.1, CT-01.6)', async () => {
    const { orquestrador, registro, fases, estado } = montar();

    await orquestrador.iniciar();

    expect(registro.filter((linha) => linha.endsWith('.run'))).toEqual([
      'entrada.run',
      'bosque.run',
      'bau.run',
      'historia.run',
      'carta.run',
      'convite.run',
      'informacoes.run',
    ]);
    expect(fases).toEqual([
      'aguardando-entrada',
      'bosque',
      'aguardando-bau',
      'historia',
      'carta',
      'convite',
      'informacoes',
    ]);
    expect(aoFinal(estado)).toBe(true);
  });

  it('antes do estado final, tira a entrada de cima (a névoa não cobre as informações)', async () => {
    const { orquestrador, entrada, final, registro } = montar();

    await orquestrador.iniciar();

    expect(entrada.chamadas).toEqual(['init', 'run', 'skip']);
    expect(registro.indexOf('entrada.skip')).toBeLessThan(registro.indexOf('informacoes.run'));
    expect(final.chamadas).toEqual(['init', 'run']);
  });

  it('inicia todas as cenas antes de tocar a primeira', async () => {
    const { orquestrador, registro } = montar();

    await orquestrador.iniciar();

    const primeiraRodada = registro.indexOf('entrada.run');
    const inits = registro.filter((linha) => linha.endsWith('.init'));
    expect(inits).toHaveLength(7);
    expect(inits.every((linha) => registro.indexOf(linha) < primeiraRodada)).toBe(true);
  });

  it('sem entrada, começa direto na primeira etapa', async () => {
    const { orquestrador, registro } = montar({ semEntrada: true });

    await orquestrador.iniciar();

    expect(registro).not.toContain('entrada.run');
    expect(registro).toContain('bosque.run');
    expect(registro).toContain('informacoes.run');
  });

  it('com "pular" na entrada, vai ao final sem tocar as etapas (CA-01.4.2)', async () => {
    const { orquestrador, registro, estado, etapas, final } = montar({ escolha: 'pular' });

    await orquestrador.iniciar();

    expect(aoFinal(estado)).toBe(true);
    for (const { cena } of etapas) expect(cena.chamadas).toEqual(['init', 'skip']);
    expect(final.chamadas).toEqual(['init', 'skip']);
    expect(registro.filter((linha) => linha.endsWith('.run'))).toEqual(['entrada.run']);
  });

  it('com animação reduzida, vai ao final mesmo escolhendo entrar (SPEC-09)', async () => {
    const { orquestrador, estado, etapas } = montar({ reduzido: true });

    await orquestrador.iniciar();

    expect(aoFinal(estado)).toBe(true);
    expect(etapas.every(({ cena }) => !cena.chamadas.includes('run'))).toBe(true);
  });

  it('pular() no meio do caminho interrompe as etapas seguintes', async () => {
    const montado = montar({
      aoRodar: {
        bau: (orquestrador) => {
          orquestrador.pular();
          return Promise.resolve();
        },
      },
    });

    await montado.orquestrador.iniciar();

    expect(aoFinal(montado.estado)).toBe(true);
    const historia = montado.etapas.find(({ nome }) => nome === 'historia');
    expect(historia?.cena.chamadas).toEqual(['init', 'skip']);
    expect(montado.final.chamadas).toEqual(['init', 'skip']);
  });

  describe('modo de segurança (CA-01.4.3, CT-01.7)', () => {
    it('um erro numa etapa registra, emite "seguranca" e leva as cenas ao estado final', async () => {
      const { orquestrador, estado, eventos, registrarErro, etapas, final } = montar({
        falhaEm: 'historia',
      });
      const aoFalhar = vi.fn();
      eventos.on('seguranca', aoFalhar);

      await orquestrador.iniciar();

      expect(estado.fase).toBe('seguranca');
      expect(registrarErro).toHaveBeenCalledWith(new Error('falha em historia'));
      expect(aoFalhar).toHaveBeenCalledWith({ erro: new Error('falha em historia') });
      expect(etapas.map(({ cena }) => cena.chamadas)).toEqual([
        ['init', 'run', 'skip'], // bosque
        ['init', 'run', 'skip'], // baú
        ['init', 'run', 'skip'], // história: falhou
        ['init', 'skip'], // carta: nunca tocou
        ['init', 'skip'], // convite
      ]);
      expect(final.chamadas).toEqual(['init', 'skip']);
    });

    it('um erro ao iniciar uma cena também vira modo de segurança', async () => {
      const montado = montar();
      vi.spyOn(montado.etapas[0]!.cena, 'init').mockImplementation(() => {
        throw new Error('init quebrou');
      });

      await montado.orquestrador.iniciar();

      expect(montado.estado.fase).toBe('seguranca');
      expect(montado.final.chamadas).toContain('skip');
    });

    it('falhar() de fora (window.onerror) interrompe o que estava em andamento', async () => {
      let liberar: (() => void) | undefined;
      const montado = montar({
        aoRodar: { historia: () => new Promise<void>((resolve) => (liberar = resolve)) },
      });
      const andamento = montado.orquestrador.iniciar();
      await vi.waitFor(() => {
        expect(montado.estado.fase).toBe('historia');
      });

      montado.orquestrador.falhar(new Error('de fora'));
      liberar?.();
      await andamento;

      expect(montado.estado.fase).toBe('seguranca');
      const carta = montado.etapas.find(({ nome }) => nome === 'carta');
      expect(carta?.cena.chamadas).not.toContain('run');
    });

    it('o erro de uma cena não impede as demais de irem ao final', () => {
      const montado = montar();
      vi.spyOn(montado.etapas[1]!.cena, 'skip').mockImplementation(() => {
        throw new Error('skip quebrou');
      });

      montado.orquestrador.falhar(new Error('origem'));

      expect(montado.registrarErro).toHaveBeenCalledTimes(2);
      expect(montado.final.chamadas).toEqual(['skip']);
    });

    it('um escuta de "seguranca" que quebra não impede o resto', () => {
      const montado = montar();
      montado.eventos.on('seguranca', () => {
        throw new Error('áudio quebrou');
      });

      montado.orquestrador.falhar(new Error('origem'));

      expect(montado.estado.fase).toBe('seguranca');
      expect(montado.final.chamadas).toEqual(['skip']);
    });

    it('erro depois de chegar ao final só registra: o convidado já vê tudo (SPEC-09)', async () => {
      const montado = montar();
      await montado.orquestrador.iniciar();
      const chamadasAntes = montado.final.chamadas.length;

      montado.orquestrador.falhar(new Error('tardio'));

      expect(montado.estado.fase).toBe('informacoes');
      expect(montado.registrarErro).toHaveBeenCalledWith(new Error('tardio'));
      expect(montado.final.chamadas).toHaveLength(chamadasAntes);
    });

    it('se o próprio final falha ao aparecer, tenta mostrá-lo de novo sem animação', async () => {
      const montado = montar({ falhaEm: 'informacoes' });

      await montado.orquestrador.iniciar();

      expect(montado.estado.fase).toBe('informacoes');
      expect(montado.final.chamadas).toEqual(['init', 'run', 'skip']);
      expect(montado.registrarErro).toHaveBeenCalledOnce();
    });

    it('erros em cascata não repetem o modo de segurança', () => {
      const montado = montar();

      montado.orquestrador.falhar(new Error('um'));
      montado.orquestrador.falhar(new Error('dois'));

      expect(montado.registrarErro).toHaveBeenCalledTimes(2);
      expect(montado.final.chamadas).toEqual(['skip']);
    });
  });

  it('iniciar duas vezes toca o convite uma vez só', async () => {
    const { orquestrador, registro } = montar();

    await Promise.all([orquestrador.iniciar(), orquestrador.iniciar()]);

    expect(registro.filter((linha) => linha === 'bosque.run')).toHaveLength(1);
  });

  it('destruir desfaz todas as cenas, mesmo que uma falhe', () => {
    const montado = montar();
    vi.spyOn(montado.entrada, 'destroy').mockImplementation(() => {
      throw new Error('destroy quebrou');
    });

    montado.orquestrador.destruir();

    expect(montado.final.chamadas).toEqual(['destroy']);
    expect(montado.etapas.every(({ cena }) => cena.chamadas.includes('destroy'))).toBe(true);
    expect(montado.registrarErro).toHaveBeenCalledOnce();
  });
});
