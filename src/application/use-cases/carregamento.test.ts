import { describe, expect, it, vi } from 'vitest';

import type { ConfigConvite } from '@/domain/config/config-convite';
import { CHAVES_CRITICAS } from '@/domain/imagens/catalogo-de-imagens';

import type { CarregadorDeImagens, PrioridadeDeImagem } from '../ports/carregador-de-imagens';
import type { Temporizador } from '../ports/temporizador';
import { criarCarregamento } from './carregamento';

const config = {
  duracoes: { limiteCritico: 8, limiteSeguranca: 20, novaTentativaDeImagem: 1 },
  imagens: {
    ceu: { vertical: 'ceu-v', horizontal: 'ceu-h' },
    lago: { vertical: 'lago-v', horizontal: 'lago-h' },
    arvores: { vertical: 'arvores-v', horizontal: 'arvores-h' },
    primeiroPlano: { vertical: 'frente-v', horizontal: 'frente-h' },
    bauFechado: 'bau-fechado',
    chave: 'chave',
    bauAberto: 'bau-aberto',
    petalaA: 'petala-a',
    petalaB: 'petala-b',
    petalaC: 'petala-c',
    cursorChave: 'cursor-chave',
    ceuPorDoSol: { vertical: 'sol-v', horizontal: 'sol-h' },
  },
} as unknown as Pick<ConfigConvite, 'duracoes' | 'imagens'>;

/** Imagens falsas: cada download fica pendente até o teste liberar; `falhasPorUrl` diz quantas vezes cada um falha. */
function cenario(opcoes: { falhasPorUrl?: Record<string, number> } = {}) {
  const pendentes: { url: string; prioridade: PrioridadeDeImagem; liberar: () => void }[] = [];
  const chamadas: string[] = [];
  const falhasRestantes = new Map(Object.entries(opcoes.falhasPorUrl ?? {}));
  const imagens: CarregadorDeImagens = {
    baixar(url, prioridade) {
      chamadas.push(url);
      return new Promise((resolve) => {
        pendentes.push({
          url,
          prioridade,
          liberar: () => {
            const restantes = falhasRestantes.get(url) ?? 0;
            if (restantes > 0) {
              falhasRestantes.set(url, restantes - 1);
              resolve(false);
            } else {
              resolve(true);
            }
          },
        });
      });
    },
  };

  const esperas: { segundos: number; passar: () => void }[] = [];
  const temporizador: Temporizador = {
    esperar: (segundos) => new Promise((resolve) => esperas.push({ segundos, passar: resolve })),
  };

  /** Libera os downloads em rodadas: cada falha gera uma nova tentativa depois da espera de 1 s. */
  async function liberarTodos(): Promise<void> {
    for (let rodada = 0; rodada < 6; rodada += 1) {
      for (const pendente of pendentes.splice(0)) pendente.liberar();
      await Promise.resolve();
      await Promise.resolve();
      for (const espera of esperas.filter((e) => e.segundos === 1)) espera.passar();
      await Promise.resolve();
    }
  }

  function passarEspera(segundos: number): void {
    for (const espera of esperas.filter((e) => e.segundos === segundos)) espera.passar();
  }

  return {
    carregamento: criarCarregamento({ imagens, temporizador, config }),
    pendentes,
    chamadas,
    liberarTodos,
    passarEspera,
  };
}

describe('criarCarregamento', () => {
  describe('crítico', () => {
    it('baixa as seis críticas da orientação, com prioridade alta (RF-02.3, RNF-02.3)', async () => {
      const { carregamento, pendentes } = cenario();

      void carregamento.criticoPronto('vertical');
      await Promise.resolve();

      expect(pendentes.map((p) => p.url).sort()).toEqual(
        ['ceu-v', 'lago-v', 'arvores-v', 'frente-v', 'bau-fechado', 'chave'].sort(),
      );
      expect(pendentes.every((p) => p.prioridade === 'alta')).toBe(true);
      expect(pendentes).toHaveLength(CHAVES_CRITICAS.length);
    });

    it('criticoPronto só resolve quando todas terminam, sem ausentes se tudo deu certo', async () => {
      const { carregamento, liberarTodos } = cenario();
      const resultado = carregamento.criticoPronto('vertical');
      let resolvido = false;
      void resultado.then(() => (resolvido = true));
      await Promise.resolve();
      expect(resolvido).toBe(false);

      await liberarTodos();

      await expect(resultado).resolves.toEqual({ completo: true, ausentes: [] });
    });

    it('critico resolve junto com o crítico quando ele termina antes do limite', async () => {
      const { carregamento, liberarTodos } = cenario();
      const resultado = carregamento.critico('vertical');

      await liberarTodos();

      await expect(resultado).resolves.toEqual({ completo: true, ausentes: [] });
    });

    it('critico resolve incompleto depois de limiteCritico, mesmo com download pendente (CA-02.4.1)', async () => {
      const { carregamento, passarEspera } = cenario();
      const resultado = carregamento.critico('vertical');

      passarEspera(8);

      await expect(resultado).resolves.toEqual({ completo: false, ausentes: [] });
    });

    it('depois do limite, criticoPronto ainda espera o fim de verdade (RF-03.2)', async () => {
      const { carregamento, passarEspera, liberarTodos } = cenario();
      const limitado = carregamento.critico('vertical');
      const pronto = carregamento.criticoPronto('vertical');
      let prontoResolvido = false;
      void pronto.then(() => (prontoResolvido = true));

      passarEspera(8);
      await limitado;
      expect(prontoResolvido).toBe(false);

      await liberarTodos();
      await expect(pronto).resolves.toEqual({ completo: true, ausentes: [] });
    });

    it('cada arquivo é baixado uma vez, mesmo com vários pedidos', async () => {
      const { carregamento, chamadas, liberarTodos } = cenario();

      const a = carregamento.criticoPronto('vertical');
      const b = carregamento.criticoPronto('vertical');
      void carregamento.critico('vertical');
      await liberarTodos();
      await Promise.all([a, b]);

      expect(chamadas).toHaveLength(6);
    });
  });

  describe('falhas', () => {
    it('uma imagem que falha é tentada de novo depois de 1 s e, se der certo, não é ausente', async () => {
      const { carregamento, liberarTodos, chamadas } = cenario({ falhasPorUrl: { 'lago-v': 1 } });
      const resultado = carregamento.criticoPronto('vertical');

      await liberarTodos();

      await expect(resultado).resolves.toEqual({ completo: true, ausentes: [] });
      expect(chamadas.filter((url) => url === 'lago-v')).toHaveLength(2);
    });

    it('falhando de novo, a imagem fica ausente (RF-02.3, CT-02.5)', async () => {
      const { carregamento, liberarTodos } = cenario({ falhasPorUrl: { 'bau-fechado': 2 } });
      const resultado = carregamento.criticoPronto('vertical');

      await liberarTodos();

      await expect(resultado).resolves.toEqual({ completo: true, ausentes: ['bauFechado'] });
    });
  });

  describe('aguardarBosque (depois do toque)', () => {
    it('pronto quando as críticas chegam', async () => {
      const { carregamento, liberarTodos } = cenario();
      const situacao = carregamento.aguardarBosque('vertical');

      await liberarTodos();

      await expect(situacao).resolves.toBe('pronto');
    });

    it('ausente se uma crítica não existe: segue direto ao modo de segurança', async () => {
      const { carregamento, liberarTodos } = cenario({ falhasPorUrl: { chave: 2 } });
      const situacao = carregamento.aguardarBosque('vertical');

      await liberarTodos();

      await expect(situacao).resolves.toBe('ausente');
    });

    it('demorou se passam 20 s sem o bosque (CA-02.4.2)', async () => {
      const { carregamento, passarEspera } = cenario();
      const situacao = carregamento.aguardarBosque('vertical');

      passarEspera(20);

      await expect(situacao).resolves.toBe('demorou');
    });
  });

  describe('carregamento secundário', () => {
    it('baixa em grupos, na ordem de uso, com prioridade baixa (RF-02.7)', async () => {
      const { carregamento, pendentes, chamadas } = cenario();

      carregamento.secundario('horizontal');
      await Promise.resolve();
      // Primeiro grupo: baú aberto, as três pétalas e o cursor da chave; o céu do pôr do sol espera.
      expect(chamadas).toEqual(['bau-aberto', 'petala-a', 'petala-b', 'petala-c', 'cursor-chave']);
      expect(pendentes[0]?.prioridade).toBe('baixa');

      for (const pendente of pendentes.splice(0)) pendente.liberar();
      await vi.waitFor(() => {
        expect(chamadas.at(-1)).toBe('sol-h');
      });
    });

    it('não repete o que o crítico já baixou', async () => {
      const { carregamento, liberarTodos, chamadas } = cenario();
      void carregamento.criticoPronto('vertical');
      await liberarTodos();

      carregamento.secundario('vertical');
      await liberarTodos();

      expect(chamadas.filter((url) => url === 'ceu-v')).toHaveLength(1);
    });
  });
});
