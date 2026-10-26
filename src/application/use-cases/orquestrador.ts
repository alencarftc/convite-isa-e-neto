import type { EscolhaDeEntrada, EventosConvite } from '@/domain/eventos/eventos-convite';
import { ehFaseFinal, type Fase } from '@/domain/fase/fase';

import type { BarramentoEventos } from '../barramento-eventos';
import type { Cena } from '../cena';
import type { EstadoConvite } from '../estado-convite';

/** Uma etapa do caminho completo: a fase em que ela começa e a cena que a toca. */
export interface EtapaDoConvite {
  /** Identifica a etapa nas mensagens e em `?erro=` (`bosque`, `bau`, `historia`, `carta`, `convite`). */
  readonly nome: string;
  /** Fase em que o convite entra ao começar a etapa; a cena pode avançar para as seguintes. */
  readonly fase: Fase;
  readonly cena: Cena;
}

/**
 * O caminho do convite, na ordem. A raiz de composição monta o plano com as cenas que já
 * existem; cada spec de cena acrescenta a sua (SPEC-02 a SPEC-06).
 */
export interface PlanoDoConvite {
  /** Entrada e carregamento (SPEC-02). Sem ela o convite começa direto na primeira etapa. */
  readonly entrada?: Cena<EscolhaDeEntrada>;
  /** Bosque, baú, história, carta e convite, nessa ordem. */
  readonly etapas: readonly EtapaDoConvite[];
  /** Estado final: carta aberta e informações (SPEC-07). */
  readonly final: Cena;
}

export interface DependenciasDoOrquestrador {
  readonly plano: PlanoDoConvite;
  readonly estado: EstadoConvite;
  readonly eventos: BarramentoEventos<EventosConvite>;
  /** Registra o erro no console (CA-01.4.3); injetado para a camada não conhecer o `console`. */
  readonly registrarErro: (erro: unknown) => void;
}

export interface Orquestrador {
  /** Percorre o plano até o estado final. Nunca rejeita: qualquer erro vira modo de segurança. */
  iniciar(): Promise<void>;
  /** Leva direto ao estado final, sem tocar as etapas que faltam (CA-01.4.2). */
  pular(): void;
  /** Entra no modo de segurança (RF-01.9); chamada também por `error` e `unhandledrejection`. */
  falhar(erro: unknown): void;
  /** Destrói todas as cenas (recarga a quente do Vite). */
  destruir(): void;
}

/**
 * Orquestrador (SPEC-01, US-01.4): encadeia as cenas pelo contrato `Cena`, mantém a fase do
 * `estado` e concentra pular e falhar num só lugar. Não conhece DOM, GSAP nem áudio.
 */
export function criarOrquestrador(dependencias: DependenciasDoOrquestrador): Orquestrador {
  const { plano, estado, eventos, registrarErro } = dependencias;

  const intermediarias = plano.etapas.map((etapa) => etapa.cena);
  const todas: readonly Cena<unknown>[] = [
    ...(plano.entrada ? [plano.entrada] : []),
    ...intermediarias,
    plano.final,
  ];
  let iniciado = false;
  let finalMostrado = false;

  /** Executa sem deixar um erro de uma cena impedir as demais de serem tratadas. */
  function tentar(acao: () => void): void {
    try {
      acao();
    } catch (erro) {
      registrarErro(erro);
    }
  }

  function terminou(): boolean {
    return ehFaseFinal(estado.fase);
  }

  function mostrarFinalSemAnimacao(): void {
    tentar(() => {
      plano.final.skip();
      finalMostrado = true;
    });
  }

  function irParaOFinal(): void {
    if (!estado.definirFase('informacoes')) return;
    if (plano.entrada) tentar(() => plano.entrada?.skip());
    for (const cena of intermediarias) tentar(() => cena.skip());
    mostrarFinalSemAnimacao();
  }

  function falhar(erro: unknown): void {
    registrarErro(erro);
    if (!estado.definirFase('seguranca')) {
      // Erro depois de o convite já estar no final não muda o que o convidado vê (SPEC-09); se o
      // próprio final é que falhou ao aparecer, tenta de novo, sem animação.
      if (estado.fase === 'informacoes' && !finalMostrado) mostrarFinalSemAnimacao();
      return;
    }
    tentar(() => {
      eventos.emit('seguranca', { erro });
    });
    for (const cena of todas) tentar(() => cena.skip());
  }

  async function percorrer(): Promise<void> {
    for (const cena of todas) cena.init();

    const escolha = plano.entrada ? await plano.entrada.run() : 'entrar';
    if (terminou()) return;
    if (escolha === 'pular' || estado.reduzido) {
      irParaOFinal();
      return;
    }

    for (const etapa of plano.etapas) {
      estado.definirFase(etapa.fase);
      await etapa.cena.run();
      if (terminou()) return;
    }

    estado.definirFase('informacoes');
    // A entrada (névoa) nunca pode ficar por cima do estado final, mesmo que nenhuma etapa a tenha limpado.
    if (plano.entrada) tentar(() => plano.entrada?.skip());
    await plano.final.run();
    finalMostrado = true;
  }

  return {
    async iniciar() {
      if (iniciado) return;
      iniciado = true;
      try {
        await percorrer();
      } catch (erro) {
        falhar(erro);
      }
    },
    pular: irParaOFinal,
    falhar,
    destruir() {
      for (const cena of todas) tentar(() => cena.destroy());
    },
  };
}
