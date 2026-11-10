import { avaliarQuadros, type LimitesDeQuadros } from '@/domain/vida/nivel';

/** O pedaço do `gsap.ticker` que importa; o ticker real serve, e os testes passam um falso. */
export interface TickerDaVida {
  /** A escuta recebe o tempo do ticker (s) e o intervalo desde o quadro anterior (ms). */
  add(escuta: (tempo: number, intervalo: number) => void): void;
  remove(escuta: (tempo: number, intervalo: number) => void): void;
}

export interface OpcoesDoMedidor {
  readonly ticker: TickerDaVida;
  /** Quanto tempo medir, em segundos de quadros contados. */
  readonly janela: number;
  readonly limites: LimitesDeQuadros;
  readonly aoTerminar: (veredito: 'manter' | 'rebaixar') => void;
}

/**
 * Mede o intervalo entre quadros logo depois que a vida começa (SPEC-18, "Medição de quadros") e entrega o
 * veredito de `avaliarQuadros` uma única vez. A aba em segundo plano interrompe a medida e ela recomeça do
 * zero ao voltar, para um quadro parado não contar como lento. Devolve a função que cancela.
 */
export function medirQuadros(opcoes: OpcoesDoMedidor): () => void {
  const { ticker, janela, limites, aoTerminar } = opcoes;
  let intervalos: number[] = [];
  let decorrido = 0;
  let terminado = false;

  function encerrar(): void {
    terminado = true;
    ticker.remove(aoQuadro);
    document.removeEventListener('visibilitychange', aoMudarVisibilidade);
  }

  function aoQuadro(_tempo: number, intervalo: number): void {
    if (terminado) return;
    const segundos = intervalo / 1000;
    intervalos.push(segundos);
    decorrido += segundos;
    if (decorrido < janela) return;
    encerrar();
    aoTerminar(avaliarQuadros(intervalos, limites));
  }

  function aoMudarVisibilidade(): void {
    if (!document.hidden) return;
    intervalos = [];
    decorrido = 0;
  }

  ticker.add(aoQuadro);
  document.addEventListener('visibilitychange', aoMudarVisibilidade);
  return () => {
    if (!terminado) encerrar();
  };
}
