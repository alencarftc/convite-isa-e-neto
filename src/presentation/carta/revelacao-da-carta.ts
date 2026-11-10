import gsap from 'gsap';

export interface OpcoesDaRevelacao {
  /** Os blocos da carta, na ordem em que aparecem (todos já no DOM, invisíveis, ocupando o seu lugar). */
  readonly blocos: readonly HTMLElement[];
  readonly janela: Window;
  /** Segundos entre o começo da aparição de um bloco e a do próximo: o mesmo para todos os blocos. */
  readonly intervalo: number;
  /** Faz o bloco aparecer, com animação. */
  readonly aparecer: (bloco: HTMLElement) => void;
  /** Deixa o bloco visível sem animação: o convidado já rolou além dele. */
  readonly mostrar: (bloco: HTMLElement) => void;
  /** Parte da altura da tela, na base, que um bloco precisa respeitar para aparecer (0 a 1). */
  readonly folgaDaDobra: number;
  /** A carta parou porque o próximo bloco está abaixo da dobra e só aparece depois da rolagem. */
  readonly aoEsperarRolagem: () => void;
}

export interface Revelacao {
  /** Interrompe a revelação: nenhum bloco que faltava aparece depois disto. */
  parar(): void;
}

/**
 * A carta se lê com calma (ADR-0012): os blocos aparecem um de cada vez, na ordem, sempre no mesmo intervalo,
 * seja o bloco um ornamento ou um parágrafo (ADR-0034). A revelação não corre à frente de quem lê:
 *
 * - um bloco abaixo da dobra (`folgaDaDobra`) espera o convidado rolar até ele, e a carta avisa
 *   (`aoEsperarRolagem`) para a tela pedir a rolagem;
 * - um bloco que o convidado já deixou para cima da tela aparece de uma vez, sem esperar nem animar.
 *
 * Começa quando a carta termina de se desdobrar. Nada aqui é acelerado por toque: só o convidado
 * rolando faz a leitura andar.
 */
export function revelarEmSequencia(opcoes: OpcoesDaRevelacao): Revelacao {
  const { blocos, janela, intervalo, aparecer, mostrar, folgaDaDobra, aoEsperarRolagem } = opcoes;
  const encerrar = new AbortController();
  let espera: gsap.core.Tween | undefined;

  const parado = () => encerrar.signal.aborted;
  const caixa = (bloco: HTMLElement) => bloco.getBoundingClientRect();
  const abaixoDaDobra = (bloco: HTMLElement) =>
    caixa(bloco).top > janela.innerHeight * (1 - folgaDaDobra);
  const acimaDaTela = (bloco: HTMLElement) => caixa(bloco).bottom < 0;

  /** Espera a condição ficar verdadeira, conferindo a cada rolagem ou mudança de tamanho da janela. */
  function esperarAte(condicao: () => boolean): Promise<void> {
    return new Promise<void>((resolver) => {
      const soltar = () => {
        janela.removeEventListener('scroll', verificar);
        janela.removeEventListener('resize', verificar);
        encerrar.signal.removeEventListener('abort', soltar);
      };
      function verificar() {
        if (!condicao()) return;
        soltar();
        resolver();
      }
      janela.addEventListener('scroll', verificar, { passive: true });
      janela.addEventListener('resize', verificar);
      encerrar.signal.addEventListener('abort', soltar);
      verificar();
    });
  }

  function esperarSegundos(segundos: number): Promise<void> {
    return new Promise<void>((resolver) => {
      espera = gsap.delayedCall(segundos, resolver);
    });
  }

  async function percorrer(): Promise<void> {
    for (const bloco of blocos) {
      if (parado()) return;
      if (abaixoDaDobra(bloco)) {
        aoEsperarRolagem();
        await esperarAte(() => !abaixoDaDobra(bloco));
        if (parado()) return;
      }
      if (acimaDaTela(bloco)) {
        mostrar(bloco);
        continue;
      }
      aparecer(bloco);
      await esperarSegundos(intervalo);
    }
  }

  void percorrer();

  return {
    parar() {
      encerrar.abort();
      espera?.kill(); // a espera que ficou pendente nunca resolve: o laço para onde está
    },
  };
}
