import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { EstadoConvite } from '@/application/estado-convite';
import type { Capacidades } from '@/application/ports/capacidades';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { cartaCobreALargura, fracaoVisivelDaCena } from '@/domain/vida/cobertura';
import { escolherNivel } from '@/domain/vida/nivel';

import { montarBotaoMovimento } from './botao-movimento';
import type { ElementoDeVida } from './elemento-de-vida';
import { medirQuadros, type TickerDaVida } from './medidor-de-quadros';

export interface DependenciasDaCenaViva {
  readonly raiz: HTMLElement;
  readonly config: ConfigConvite;
  readonly dicas: ConteudoConvite['dicas'];
  readonly estado: EstadoConvite;
  readonly eventos: BarramentoEventos<EventosConvite>;
  readonly capacidades: Pick<Capacidades, 'aparelhoModesto'>;
  /** Os movimentos de ambiente, na ordem em que começam (água, folhas, pássaros, esquilo, casal). */
  readonly elementos: readonly ElementoDeVida[];
  /** O `gsap.ticker`; os testes passam um falso, que anda quando eles mandam. */
  readonly ticker: TickerDaVida;
  /** Registra o aviso de um elemento que falhou; a vida é enfeite e nunca leva ao modo de segurança. */
  readonly avisar: (erro: unknown) => void;
}

export interface CenaViva {
  /** Para tudo, tira do DOM o que a vida criou e solta os ouvintes. */
  destruir(): void;
}

/** A parte do conteúdo cujo topo diz quanto da cena ainda aparece: a carta, opaca, rolando por cima dela. */
const SELETOR_DA_CARTA = '.conteudo .carta';
const SELETOR_DOS_ESPACOS = '.vida';

/**
 * Cena viva (épico 13, SPEC-18): pequenos movimentos de ambiente sobre as camadas pintadas. Não é uma etapa
 * do orquestrador: ouve o barramento, como o áudio, e por isso não mexe nos tempos da abertura nem no
 * contrato das cenas. A vida começa em `bosque:pronto` (ou em `convite:pulado`), no nível que o aparelho
 * aguenta (`completo` ou `leve`, só descendo), pausa quando a carta cobre a cena ou o convidado pede, e para
 * de vez no modo de segurança. Um elemento que falha é parado e esquecido: é enfeite.
 */
export function criarCenaViva(dependencias: DependenciasDaCenaViva): CenaViva {
  const { raiz, config, dicas, estado, eventos, capacidades, elementos, ticker, avisar } =
    dependencias;
  const { vida } = config;

  // Animação reduzida: nunca começa, nem botão (SPEC-18, "Quando a vida existe").
  if (estado.reduzido) {
    return {
      destruir() {
        /* nada foi criado */
      },
    };
  }

  /** Elementos que ainda estão vivos: quem falha sai daqui. */
  const ativos = new Set<ElementoDeVida>();
  let liberada = false;
  let iniciada = false;
  let rebaixada = false;
  let pausada = false;
  let cobertaPelaCarta = false;
  let pararMedicao: (() => void) | undefined;
  let removerBotao: (() => void) | undefined;
  let pararDeOuvirRolagem: (() => void) | undefined;
  let pararDeOuvirEstado: (() => void) | undefined;
  const pararDeOuvirEventos: (() => void)[] = [];

  /** Chama o elemento sem deixar um erro dele derrubar os outros (CT-18.9). */
  function protegido(elemento: ElementoDeVida, acao: () => void): void {
    try {
      acao();
    } catch (erro) {
      ativos.delete(elemento);
      try {
        elemento.parar();
      } catch {
        // Já falhou: só falta esquecê-lo.
      }
      avisar(erro);
    }
  }

  function paraTodos(acao: (elemento: ElementoDeVida) => void): void {
    for (const elemento of [...ativos]) protegido(elemento, () => acao(elemento));
  }

  function nivelEscolhido() {
    return escolherNivel({
      reduzido: estado.reduzido,
      pausadoPeloConvidado: !estado.movimentoLigado,
      aparelhoModesto: rebaixada || capacidades.aparelhoModesto(),
    });
  }

  function sincronizarPausa(): void {
    const deveParar = !estado.movimentoLigado || cobertaPelaCarta;
    if (!iniciada || deveParar === pausada) return;
    pausada = deveParar;
    paraTodos((elemento) => {
      if (deveParar) elemento.pausar();
      else elemento.retomar();
    });
  }

  function comecar(): void {
    if (iniciada) return;
    const escolhido = nivelEscolhido();
    if (escolhido === 'desligado') return;
    iniciada = true;
    for (const elemento of elementos) {
      ativos.add(elemento);
      protegido(elemento, () => {
        elemento.iniciar(escolhido);
      });
    }
    // Uma medida só, e só se ainda há para onde descer.
    if (escolhido === 'completo') {
      pararMedicao = medirQuadros({
        ticker,
        janela: vida.desempenho.janelaDeMedicao,
        limites: vida.desempenho,
        aoTerminar(veredito) {
          pararMedicao = undefined;
          if (veredito !== 'rebaixar') return;
          rebaixada = true;
          paraTodos((elemento) => {
            elemento.aoMudarNivel('leve');
          });
        },
      });
    }
    sincronizarPausa();
  }

  /** Quanto da cena aparece acima da carta decide a pausa; em telas largas o lago aparece dos lados e a vida segue. */
  function medirCobertura(): void {
    const carta = raiz.querySelector(SELETOR_DA_CARTA);
    if (!carta) return;
    const caixa = carta.getBoundingClientRect();
    const cobre = cartaCobreALargura(caixa.width, window.innerWidth, vida.larguraParaCobrir);
    const visivel = cobre ? fracaoVisivelDaCena(caixa.top, window.innerHeight) : 1;
    cobertaPelaCarta = visivel < vida.pausaAbaixoDe;
    sincronizarPausa();
  }

  /**
   * Na carta aberta, a rolagem pode cobrir a cena. O ouvinte é passivo e só marca que a rolagem mexeu; a
   * leitura do layout acontece no quadro seguinte do ticker, uma por quadro (RF-18.4).
   */
  function ouvirRolagem(): void {
    if (pararDeOuvirRolagem) return;
    let mexeu = true; // uma medida logo ao entrar: a carta pode já estar rolada
    const aoRolar = () => {
      mexeu = true;
    };
    const aoQuadro = () => {
      if (!mexeu) return;
      mexeu = false;
      medirCobertura();
    };
    window.addEventListener('scroll', aoRolar, { passive: true });
    ticker.add(aoQuadro);
    pararDeOuvirRolagem = () => {
      window.removeEventListener('scroll', aoRolar);
      ticker.remove(aoQuadro);
    };
  }

  function liberar(): void {
    if (liberada) return;
    liberada = true;
    // O botão de pausa existe desde que a cena aparece, mesmo que a vida esteja desligada por uma pausa
    // anterior: é por ele que o convidado a religa.
    removerBotao = montarBotaoMovimento({ corpo: document.body, dicas, estado });
    comecar();
  }

  function aoMudarEstado(): void {
    if (estado.fase === 'seguranca') {
      destruir();
      return;
    }
    if (estado.fase === 'convite' || estado.fase === 'informacoes') ouvirRolagem();
    if (estado.movimentoLigado && liberada) comecar();
    sincronizarPausa();
  }

  function destruir(): void {
    pararMedicao?.();
    pararMedicao = undefined;
    pararDeOuvirRolagem?.();
    pararDeOuvirRolagem = undefined;
    pararDeOuvirEstado?.();
    pararDeOuvirEstado = undefined;
    for (const parar of pararDeOuvirEventos.splice(0)) parar();
    removerBotao?.();
    removerBotao = undefined;
    for (const elemento of [...ativos]) {
      try {
        elemento.parar();
      } catch (erro) {
        avisar(erro);
      }
    }
    ativos.clear();
    // Rede de segurança: nada fica congelado na tela (RF-18.5; as pétalas, ADR-0010).
    for (const espaco of raiz.querySelectorAll(SELETOR_DOS_ESPACOS)) espaco.replaceChildren();
    iniciada = false;
    liberada = false;
  }

  pararDeOuvirEventos.push(
    eventos.on('bosque:pronto', liberar),
    // Pular: a vida começa já no estado final, como se o bosque tivesse ficado pronto (RF-18.1).
    eventos.on('convite:pulado', liberar),
  );
  pararDeOuvirEstado = estado.aoMudar(aoMudarEstado);

  return { destruir };
}
