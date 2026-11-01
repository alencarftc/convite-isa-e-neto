import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import type { EstadoConvite } from '@/application/estado-convite';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { posicoesDoBalao } from '@/domain/historia/posicoes';
import { urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';

import { criar } from '../dom';
import { adiarImagem, carregarImagensTardias } from '../imagens/imagens-tardias';
import { criarFotoEmCirculo } from './foto-em-circulo';

export interface DependenciasDaHistoria {
  readonly raiz: HTMLElement;
  readonly conteudo: ConteudoConvite;
  readonly config: ConfigConvite;
  readonly estado: EstadoConvite;
  readonly eventos: BarramentoEventos<EventosConvite>;
}

/** As nuvens se alternam a, b, c, a, b (SPEC-05, RF-05.2): nunca a mesma em seguida. */
const VARIACOES = ['a', 'b', 'c'] as const;
const CHAVES_DE_NUVEM = { a: 'balaoA', b: 'balaoB', c: 'balaoC' } as const;

interface Partes {
  readonly secao: HTMLElement;
  readonly baloes: readonly HTMLElement[];
  readonly regiao: HTMLElement;
}

/**
 * História em balões (SPEC-05): cinco balões saem do baú em cascata, um a cada `duracoes.balao`, e se
 * ajeitam num cacho, cada um com a sua frase (dentro da nuvem; com foto, num cartão embaixo); a luz caminha ao pôr do sol na mesma linha do tempo (`tlHistoria`). Nada na tela
 * acelera nem pula a história: quem não quer vê-la inteira usa "Pular para o convite" (ADR-0012). A
 * região `aria-live` anuncia cada frase uma vez (RF-05.8).
 */
export function criarCenaHistoria(dependencias: DependenciasDaHistoria): Cena {
  const { raiz, conteudo, config, eventos } = dependencias;
  const { duracoes, curvas, historia: parametros } = config;
  /** O ciclo de um balão, da saída da boca do baú até sair pelo alto. */
  const ciclo = parametros.subidaFinalEm + parametros.subidaFinal;
  const total = duracoes.balao * (conteudo.baloes.length - 1) + ciclo;

  let partes: Partes | undefined;
  let linhaDoTempo: gsap.core.Timeline | undefined;

  function montar(): Partes {
    if (partes) return partes;
    const secao = criar('section', 'historia');
    secao.setAttribute('aria-label', conteudo.rotulos.historia);
    secao.hidden = true;

    const baloes = conteudo.baloes.map((balao, indice) => {
      const variacao = VARIACOES[indice % VARIACOES.length] ?? 'a';
      // Sem foto (as do casal ainda não chegaram), a frase fica dentro da nuvem, que é o balão.
      const semFoto = balao.foto === '';
      const elemento = criar('div', `balao balao--${variacao}${semFoto ? ' balao--sem-foto' : ''}`);
      // O corpo (nuvem e foto) balança; a frase fica de fora, parada e na horizontal.
      const corpo = criar('div', 'balao__corpo');
      const nuvem = document.createElement('img');
      nuvem.className = 'balao__nuvem';
      adiarImagem(nuvem, urlDaImagem(config.imagens[CHAVES_DE_NUVEM[variacao]], 'vertical'));
      nuvem.alt = '';
      nuvem.draggable = false;
      corpo.append(nuvem);
      const foto = criarFotoEmCirculo(balao, { classe: 'balao__foto', adiada: true });
      if (foto) corpo.append(foto);
      const frase = criar('p', 'balao__frase');
      frase.textContent = balao.frase;
      if (semFoto) {
        corpo.append(frase);
        elemento.append(corpo);
      } else {
        elemento.append(corpo, frase);
      }
      gsap.set(elemento, { opacity: 0, xPercent: -50, yPercent: -50 });
      gsap.set(frase, { opacity: 0 });
      return elemento;
    });

    const regiao = criar('p', 'visualmente-oculto');
    regiao.setAttribute('aria-live', 'polite');

    secao.append(...baloes, regiao);
    raiz.append(secao);
    partes = { secao, baloes, regiao };
    return partes;
  }

  /** Boca do baú na tela, de onde os balões saem; sem baú, um ponto baixo e central. */
  function boca(): { x: number; y: number } {
    const corpo = raiz.querySelector('.bau__corpo');
    if (!corpo) return { x: window.innerWidth / 2, y: window.innerHeight * 0.75 };
    const caixa = corpo.getBoundingClientRect();
    return { x: caixa.left + caixa.width / 2, y: caixa.top + caixa.height * 0.3 };
  }

  /** Um balão de 3 s: sai da boca do baú, é lido e sobe pelo alto (tabela "Linha do tempo"). */
  function linhaDoBalao(balao: HTMLElement, indice: number): gsap.core.Timeline {
    const corpo = balao.querySelector('.balao__corpo');
    const frase = balao.querySelector('.balao__frase');
    const posicoes = () =>
      posicoesDoBalao({
        alturaDaTela: window.innerHeight,
        alturaDoBalao: balao.offsetHeight,
        fracaoDaSaida:
          (window.innerWidth > window.innerHeight
            ? parametros.alturasNaHorizontal
            : parametros.alturas)[indice % parametros.alturas.length] ?? 0.6,
        fracaoDaLeitura: parametros.subidaDaLeitura,
        margem: parametros.margemSuperior,
      });
    const desvio = parametros.desvios[indice % parametros.desvios.length] ?? 0;
    // Com o cartão de frase embaixo (balão com foto), ele fica no centro da tela mesmo que o balão se desvie
    // para um lado: a CSS lê este recuo.
    balao.style.setProperty('--desvio-x', `${String(-desvio * window.innerWidth)}px`);
    const linha = gsap.timeline();
    linha
      .fromTo(
        balao,
        {
          scale: parametros.escalaInicial,
          opacity: 0,
          x: () => boca().x,
          y: () => boca().y,
        },
        {
          scale: 1,
          opacity: 1,
          x: () => window.innerWidth * (0.5 + desvio),
          y: () => posicoes().saida,
          duration: parametros.saida,
          ease: curvas.saida,
        },
        0,
      )
      .fromTo(
        corpo,
        { rotation: -parametros.balanco },
        {
          rotation: parametros.balanco,
          duration: parametros.saida + parametros.leitura,
          ease: curvas.suave,
        },
        0,
      )
      .to(
        frase,
        { opacity: 1, duration: parametros.fraseAparece, ease: curvas.leve },
        parametros.fraseEm,
      )
      // Leitura: sobe mais um pouco, e a frase acompanha, parada em relação ao balão.
      .to(
        balao,
        { y: () => posicoes().leitura, duration: parametros.leitura, ease: curvas.suave },
        parametros.leituraEm,
      )
      .to(
        frase,
        { opacity: 0, duration: parametros.fraseSome, ease: curvas.leve },
        parametros.subidaFinalEm - parametros.fraseSome,
      )
      .to(
        balao,
        { y: () => posicoes().fora, duration: parametros.subidaFinal, ease: curvas.entradaLeve },
        parametros.subidaFinalEm,
      );
    return linha;
  }

  function luzDoPorDoSol(): HTMLElement[] {
    return gsap.utils.toArray<HTMLElement>('.camada--ceu-sol, .camada--luz', raiz);
  }

  function parar(): void {
    linhaDoTempo?.kill();
  }

  return {
    init() {
      montar();
    },

    run() {
      const { secao, baloes, regiao } = montar();
      // Nuvens e fotos só são pedidas agora: a fila secundária já as deixou no cache (SPEC-02, RF-02.7).
      carregarImagensTardias(secao);
      return new Promise<void>((resolver) => {
        secao.hidden = false;
        const historia = gsap.timeline({
          onComplete: () => {
            secao.hidden = true;
            resolver();
          },
        });
        linhaDoTempo = historia;

        historia.call(
          () => {
            eventos.emit('historia:inicio', { duracao: total });
          },
          [],
          0,
        );
        // tlLuz dentro da mesma linha do tempo: a luz caminha com os balões (SPEC-03, RF-03.5).
        const luz = luzDoPorDoSol();
        if (luz.length > 0)
          historia.to(luz, { opacity: 1, duration: total, ease: curvas.suave }, 0);

        baloes.forEach((balao, indice) => {
          const rotulo = `b${String(indice)}`;
          const frase = conteudo.baloes[indice]?.frase ?? '';
          historia
            .addLabel(rotulo, indice * duracoes.balao)
            .call(
              () => {
                regiao.textContent = frase;
                eventos.emit('historia:balao', { indice, frase });
              },
              [],
              rotulo,
            )
            .add(linhaDoBalao(balao, indice), rotulo);
        });

        historia
          .addLabel('fim', total)
          .call(
            () => {
              eventos.emit('historia:fim');
            },
            [],
            'fim',
          )
          .set({}, {}, total);
      });
    },

    skip() {
      const { secao } = montar();
      parar();
      secao.hidden = true;
      // A luz termina no pôr do sol (RF-05.10).
      gsap.set(luzDoPorDoSol(), { opacity: 1 });
    },

    destroy() {
      parar();
      partes?.secao.remove();
      partes = undefined;
    },
  };
}
