import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import type { EstadoConvite } from '@/application/estado-convite';
import type { Carregamento } from '@/application/use-cases/carregamento';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { type ChaveDeImagem, urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';

import { animarNoNavegador } from '../animacao/animar-no-navegador';
import { curvaCss } from '../animacao/curva-css';
import { concluirLuzDoPorDoSol } from './luz-do-por-do-sol';
import { iniciarProfundidade, type ProfundidadeEmAndamento } from './profundidade';

export interface DependenciasDoBosque {
  readonly raiz: HTMLElement;
  readonly config: ConfigConvite;
  readonly estado: EstadoConvite;
  readonly eventos: BarramentoEventos<EventosConvite>;
  readonly carregamento: Carregamento;
}

type PrioridadeDaCamada = 'high' | 'low';

function criarCamada(
  config: ConfigConvite,
  nome: string,
  chave: ChaveDeImagem,
  profundidade: number,
  prioridade: PrioridadeDaCamada,
  computador: boolean,
): HTMLElement {
  const arte = config.imagens[chave];
  const quadro = document.createElement('picture');
  quadro.className = `camada camada--${nome}`;
  quadro.setAttribute('aria-hidden', 'true');
  quadro.setAttribute('data-prof', String(profundidade));

  const imagem = document.createElement('img');
  imagem.alt = '';
  // No computador a horizontal é a pintura mestre 16:9 (a variante `computador`); no celular deitado e no tablet, as camadas.
  imagem.src = urlDaImagem(arte, 'horizontal', computador);
  imagem.setAttribute('fetchpriority', prioridade);
  imagem.draggable = false;
  // O navegador troca a arte sozinho ao girar o aparelho (SPEC-03, RF-03.1); arte única não precisa de troca. No
  // computador não há troca: a pintura 16:9 cobre a janela em qualquer formato, e a janela estreita não vira celular.
  if (typeof arte !== 'string' && !computador) {
    const vertical = document.createElement('source');
    vertical.media = '(orientation: portrait)';
    vertical.srcset = urlDaImagem(arte, 'vertical');
    quadro.append(vertical);
  }
  quadro.append(imagem);
  return quadro;
}

function criarEspaco(classe: string, profundidade?: number, decorativo = true): HTMLElement {
  const espaco = document.createElement('div');
  espaco.className = classe;
  if (decorativo) espaco.setAttribute('aria-hidden', 'true');
  if (profundidade !== undefined) espaco.setAttribute('data-prof', String(profundidade));
  return espaco;
}

/**
 * Cena do bosque (SPEC-03): camadas de imagem da mais distante à mais próxima, a névoa da entrada
 * se dissipando em `duracoes.nevoa`, a aproximação de 1,06 para 1 e a profundidade (mouse no
 * computador, deriva no celular). Os espaços `.bau` e `.casal` são das SPEC-04 e SPEC-06; a luz do
 * pôr do sol (`.camada--ceu-sol` e `.camada--luz`) é animada pela história (SPEC-05, RF-03.5). Os três
 * espaços `.vida` (céu, fundo e chão) ficam vazios: a cena viva (SPEC-18) põe neles os pássaros, as folhas
 * e o esquilo, e a profundidade os move junto com a camada ao lado.
 */
export function criarCenaBosque(dependencias: DependenciasDoBosque): Cena {
  const { raiz, config, estado, eventos, carregamento } = dependencias;
  const { duracoes, curvas, movimento } = config;
  const camadas = movimento.profundidadeDasCamadas;
  /**
   * O ponteiro é o mouse (09/11/2026): a cena é a pintura mestre, de pé (9:16) ou deitada (16:9), uma peça só, como a do
   * celular. Só o celular deitado e o tablet seguem nas camadas separadas.
   */
  const computador = !estado.toque;
  /** O baú e o casal acompanham o chão em que pisam (01/11/2026: antes flutuavam com o mouse). */
  const solo = camadas.solo[computador ? 'vertical' : estado.orientacao];

  let cena: HTMLElement | undefined;
  let linhaDoTempo: gsap.core.Timeline | undefined;
  let profundidade: ProfundidadeEmAndamento | undefined;
  let aproximacao: Animation | undefined;
  /** A névoa da entrada se abrindo (fica no fim até a entrada sair de cena). */
  let animacoesDaNevoa: Animation[] = [];
  let pararDeOuvirMovimento: (() => void) | undefined;

  function montar(): HTMLElement {
    if (cena) return cena;
    const nova = document.createElement('div');
    nova.className = estado.toque ? 'cena' : 'cena cena--computador';
    // Sem `aria-hidden` aqui: o botão do baú vive dentro de `.bau` e precisa ser alcançado pelo leitor de
    // tela (SPEC-09, RF-09.6). Cada camada decorativa se esconde sozinha (SPEC-03, RNF-03.3).
    nova.append(
      criarCamada(config, 'ceu', 'ceu', camadas.ceu, 'high', computador),
      criarCamada(config, 'ceu-sol', 'ceuPorDoSol', camadas.ceu, 'low', computador),
      criarEspaco('vida vida--ceu', camadas.ceu),
      criarCamada(config, 'lago', 'lago', camadas.lago, 'high', computador),
      criarCamada(config, 'arvores', 'arvores', camadas.arvores, 'high', computador),
      criarEspaco('vida vida--fundo', camadas.arvores),
      criarEspaco('bau', solo, false),
      // Na vertical e no computador os arbustos são cópia da pintura (a camada do lago) e andam com ela, ou apareceriam em dobro.
      criarCamada(
        config,
        'frente',
        'primeiroPlano',
        computador || estado.orientacao === 'vertical' ? camadas.lago : camadas.frente,
        'high',
        computador,
      ),
      criarEspaco('vida vida--chao', camadas.frente),
      criarEspaco('camada camada--luz'),
      criarEspaco('casal', solo),
    );
    // Invisível até as imagens críticas estarem prontas (a CSS também parte de opacidade 0).
    gsap.set(nova, { opacity: 0 });
    // Primeiro filho: a névoa da entrada e as informações ficam por cima (camadas de z-index).
    raiz.prepend(nova);
    cena = nova;
    return nova;
  }

  function esconderEntrada(): void {
    raiz.querySelector('.entrada')?.setAttribute('hidden', '');
  }

  function camadasComProfundidade(): HTMLElement[] {
    return [...(cena?.querySelectorAll<HTMLElement>('[data-prof]') ?? [])];
  }

  /** Congela uma camada onde a animação dela estava: o estado vai para o estilo e a animação é cancelada. */
  function congelar(camada: HTMLElement): void {
    for (const animacao of camada.getAnimations()) {
      try {
        animacao.commitStyles();
      } catch {
        // Camada que não está sendo desenhada: não há estado a guardar, e cancelar basta.
      }
      animacao.cancel();
    }
  }

  const podeAnimar = (elemento: HTMLElement) =>
    typeof elemento.animate === 'function' && typeof elemento.getAnimations === 'function';

  function parar(): void {
    linhaDoTempo?.kill();
    aproximacao?.cancel();
    aproximacao = undefined;
    for (const animacao of animacoesDaNevoa) animacao.cancel();
    animacoesDaNevoa = [];
    pararDeOuvirMovimento?.();
    pararDeOuvirMovimento = undefined;
    profundidade?.parar();
    profundidade = undefined;
  }

  return {
    init() {
      montar();
    },

    async run() {
      const bosque = montar();
      // A revelação só começa com as imagens críticas prontas (RF-03.2).
      await carregamento.criticoPronto(estado.orientacao);
      gsap.set(bosque, { opacity: 1 });

      const nevoa = gsap.utils.toArray<HTMLElement>('.nevoa > span', raiz);
      // A névoa e a aproximação da cena são animações do navegador, não do GSAP: a escala e o deslocamento de camadas de tela cheia,
      // calculados pelo JavaScript a cada quadro, faziam a tela piscar no Motorola Edge 70 Fusion+ (10/11/2026) e pesavam na
      // abertura (11/11/2026, ADR-0044). Sem `animate` (navegador antigo), o GSAP faz o mesmo.
      const noNavegador = typeof bosque.animate === 'function' && nevoa.every(podeAnimar);
      await new Promise<void>((resolver) => {
        const linha = gsap.timeline({ onComplete: resolver });
        linhaDoTempo = linha;
        if (noNavegador) {
          // A névoa se abre: cada camada cresce, se afasta do centro para um lado e some, a partir de onde a respiração da entrada
          // estava (o estado dela vai para o estilo e ela se cancela).
          nevoa.forEach((camada, indice) => {
            congelar(camada);
            const sentido = indice % 2 === 0 ? 1 : -1;
            animacoesDaNevoa.push(
              animarNoNavegador(
                camada,
                [
                  {
                    opacity: 0,
                    transform: `translateX(${String(sentido * movimento.deslocamentoDaNevoa)}%) scale(${String(movimento.escalaFinalDaNevoa)})`,
                  },
                ],
                {
                  duration: duracoes.nevoa * movimento.fracaoDaNevoa * 1000,
                  easing: curvaCss(curvas.suave),
                  fill: 'forwards',
                },
              ),
            );
          });
          // A cena inteira se aproxima devagar, terminando com o baú em destaque.
          aproximacao = animarNoNavegador(
            bosque,
            [
              { transform: `scale(${String(movimento.escalaInicialDoBosque)})` },
              { transform: 'scale(1)' },
            ],
            { duration: duracoes.nevoa * 1000, easing: curvaCss(curvas.saida), fill: 'both' },
          );
          // A revelação dura `duracoes.nevoa`, como quando tudo era do GSAP.
          linha.set({}, {}, duracoes.nevoa);
        } else {
          linha
            // A névoa se abre; `overwrite` desliga a respiração da entrada.
            .to(
              nevoa,
              {
                opacity: 0,
                scale: movimento.escalaFinalDaNevoa,
                xPercent: (indice: number) =>
                  (indice % 2 === 0 ? 1 : -1) * movimento.deslocamentoDaNevoa,
                duration: duracoes.nevoa * movimento.fracaoDaNevoa,
                ease: curvas.suave,
                overwrite: 'auto',
              },
              0,
            )
            .fromTo(
              bosque,
              { scale: movimento.escalaInicialDoBosque },
              { scale: 1, duration: duracoes.nevoa, ease: curvas.saida },
              0,
            );
        }
      });
      // A aproximação terminou em escala 1, igual ao que o GSAP deixa: sai o efeito do navegador e fica a escala 1 no estilo.
      aproximacao?.cancel();
      aproximacao = undefined;
      gsap.set(bosque, { scale: 1 });

      esconderEntrada();
      const derivando = iniciarProfundidade({
        camadas: camadasComProfundidade(),
        toque: estado.toque,
        parametros: movimento.profundidade,
        curva: curvas.suave,
        janela: window,
      });
      profundidade = derivando;
      // "Pausar animação" (SPEC-18, RF-18.9) congela a deriva junto com a cena viva; vale desde o começo. A deriva também
      // para quando o convite abre (10/11/2026): a carta cobre a cena, o estado final dela não tem profundidade (RF-03.6) e um
      // tween infinito movendo camadas enormes por trás da carta, a 60 quadros por segundo, esquentava o aparelho e fazia a
      // tela piscar depois de um tempo parada.
      const seguirMovimento = () => {
        const convitePronto = ['aguardando-selo', 'convite', 'informacoes'].includes(estado.fase);
        if (estado.movimentoLigado && !convitePronto) derivando.retomar();
        else derivando.pausar();
      };
      seguirMovimento();
      pararDeOuvirMovimento = estado.aoMudar(seguirMovimento);
      eventos.emit('bosque:pronto');
    },

    skip() {
      parar();
      esconderEntrada();
      const bosque = montar();
      // Estado final: já no pôr do sol, sem aproximação nem profundidade (RF-03.6). Só aparece se as
      // imagens críticas existirem; do contrário o convite fica no fundo marfim.
      gsap.set(bosque, { scale: 1 });
      concluirLuzDoPorDoSol(bosque);
      void carregamento.criticoPronto(estado.orientacao).then(({ ausentes }) => {
        if (ausentes.length > 0) return;
        gsap.to(bosque, {
          opacity: 1,
          duration: duracoes.esmaecimentoReduzido,
          ease: curvas.saida,
        });
      });
    },

    destroy() {
      parar();
      cena?.remove();
      cena = undefined;
    },
  };
}
