import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import type { EstadoConvite } from '@/application/estado-convite';
import type { Carregamento } from '@/application/use-cases/carregamento';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { type ChaveDeImagem, urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';

import { iniciarProfundidade } from './profundidade';

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
): HTMLElement {
  const arte = config.imagens[chave];
  const quadro = document.createElement('picture');
  quadro.className = `camada camada--${nome}`;
  quadro.setAttribute('aria-hidden', 'true');
  quadro.setAttribute('data-prof', String(profundidade));

  // O navegador troca a arte sozinho ao girar o aparelho (SPEC-03, RF-03.1).
  const vertical = document.createElement('source');
  vertical.media = '(orientation: portrait)';
  vertical.srcset = urlDaImagem(arte, 'vertical');
  const imagem = document.createElement('img');
  imagem.alt = '';
  imagem.src = urlDaImagem(arte, 'horizontal');
  imagem.setAttribute('fetchpriority', prioridade);
  imagem.draggable = false;
  quadro.append(vertical, imagem);
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
 * pôr do sol (`.camada--ceu-sol` e `.camada--luz`) é animada pela história (SPEC-05, RF-03.5).
 */
export function criarCenaBosque(dependencias: DependenciasDoBosque): Cena {
  const { raiz, config, estado, eventos, carregamento } = dependencias;
  const { duracoes, curvas, movimento } = config;
  const camadas = movimento.profundidadeDasCamadas;

  let cena: HTMLElement | undefined;
  let linhaDoTempo: gsap.core.Timeline | undefined;
  let pararProfundidade: (() => void) | undefined;

  function montar(): HTMLElement {
    if (cena) return cena;
    const nova = document.createElement('div');
    nova.className = 'cena';
    // Sem `aria-hidden` aqui: o botão do baú vive dentro de `.bau` e precisa ser alcançado pelo leitor de
    // tela (SPEC-09, RF-09.6). Cada camada decorativa se esconde sozinha (SPEC-03, RNF-03.3).
    nova.append(
      criarCamada(config, 'ceu', 'ceu', camadas.ceu, 'high'),
      criarCamada(config, 'ceu-sol', 'ceuPorDoSol', camadas.ceu, 'low'),
      criarCamada(config, 'lago', 'lago', camadas.lago, 'high'),
      criarCamada(config, 'arvores', 'arvores', camadas.arvores, 'high'),
      criarEspaco('bau', camadas.bau, false),
      criarCamada(config, 'frente', 'primeiroPlano', camadas.frente, 'high'),
      criarEspaco('camada camada--luz'),
      criarEspaco('casal'),
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

  function parar(): void {
    linhaDoTempo?.kill();
    pararProfundidade?.();
    pararProfundidade = undefined;
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
      await new Promise<void>((resolver) => {
        linhaDoTempo = gsap
          .timeline({ onComplete: resolver })
          // A névoa se dissipa e cresce; `overwrite` desliga a respiração da entrada.
          .to(
            nevoa,
            {
              opacity: 0,
              scale: movimento.escalaFinalDaNevoa,
              duration: duracoes.nevoa * movimento.fracaoDaNevoa,
              ease: curvas.suave,
              overwrite: 'auto',
            },
            0,
          )
          // A cena inteira se aproxima devagar, terminando com o baú em destaque.
          .fromTo(
            bosque,
            { scale: movimento.escalaInicialDoBosque },
            { scale: 1, duration: duracoes.nevoa, ease: curvas.saida },
            0,
          );
      });

      esconderEntrada();
      pararProfundidade = iniciarProfundidade({
        camadas: camadasComProfundidade(),
        toque: estado.toque,
        parametros: movimento.profundidade,
        curva: curvas.suave,
        janela: window,
      });
      eventos.emit('bosque:pronto');
    },

    skip() {
      parar();
      esconderEntrada();
      const bosque = montar();
      // Estado final: já no pôr do sol, sem aproximação nem profundidade (RF-03.6). Só aparece se as
      // imagens críticas existirem; do contrário o convite fica no fundo marfim.
      gsap.set(bosque, { scale: 1 });
      gsap.set(bosque.querySelectorAll('.camada--ceu-sol, .camada--luz'), { opacity: 1 });
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
