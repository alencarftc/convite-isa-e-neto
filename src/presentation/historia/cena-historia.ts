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
  readonly dica: HTMLElement;
  readonly avancar: HTMLButtonElement;
}

/**
 * História em balões (SPEC-05): cinco balões saem do baú, um a cada `duracoes.balao`, cada um com
 * foto e frase; a luz caminha ao pôr do sol na mesma linha do tempo (`tlHistoria`), então acelera
 * junto quando o convidado toca. Um toque triplica a velocidade até o próximo balão, sem pular
 * frases. A região `aria-live` anuncia cada frase uma vez (RF-05.8).
 */
export function criarCenaHistoria(dependencias: DependenciasDaHistoria): Cena {
  const { raiz, conteudo, config, estado, eventos } = dependencias;
  const { duracoes, curvas, historia: parametros } = config;
  const total = duracoes.balao * conteudo.baloes.length;

  let partes: Partes | undefined;
  let linhaDoTempo: gsap.core.Timeline | undefined;
  let acompanharAceleracao: (() => void) | undefined;
  let ouvintes: AbortController | undefined;

  function montar(): Partes {
    if (partes) return partes;
    const secao = criar('section', 'historia');
    secao.setAttribute('aria-label', conteudo.rotulos.historia);
    secao.hidden = true;

    const baloes = conteudo.baloes.map((balao, indice) => {
      const variacao = VARIACOES[indice % VARIACOES.length] ?? 'a';
      const elemento = criar('div', `balao balao--${variacao}`);
      const nuvem = document.createElement('img');
      nuvem.className = 'balao__nuvem';
      adiarImagem(nuvem, urlDaImagem(config.imagens[CHAVES_DE_NUVEM[variacao]], 'vertical'));
      nuvem.alt = '';
      nuvem.draggable = false;
      const frase = criar('p', 'balao__frase');
      frase.textContent = balao.frase;
      elemento.append(nuvem);
      const foto = criarFotoEmCirculo(balao, { classe: 'balao__foto', adiada: true });
      if (foto) elemento.append(foto);
      elemento.append(frase);
      gsap.set(elemento, { opacity: 0, xPercent: -50, yPercent: -50 });
      gsap.set(frase, { opacity: 0 });
      return elemento;
    });

    const regiao = criar('p', 'visualmente-oculto');
    regiao.setAttribute('aria-live', 'polite');
    const dica = criar('p', 'historia__dica');
    dica.textContent = conteudo.dicas.avancar;
    gsap.set(dica, { opacity: 0 });
    const avancar = document.createElement('button');
    avancar.type = 'button';
    avancar.className = 'historia__avancar';
    avancar.setAttribute('aria-label', conteudo.rotulos.avancarHistoria);
    avancar.hidden = true;

    secao.append(...baloes, regiao, dica, avancar);
    raiz.append(secao);
    partes = { secao, baloes, regiao, dica, avancar };
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
    const frase = balao.querySelector('.balao__frase');
    const posicoes = () =>
      posicoesDoBalao({
        alturaDaTela: window.innerHeight,
        alturaDoBalao: balao.offsetHeight,
        fracaoDaSaida: parametros.alturaDaSaida,
        fracaoDaLeitura: parametros.subidaDaLeitura,
        margem: parametros.margemSuperior,
      });
    const desvio = parametros.desvios[indice % parametros.desvios.length] ?? 0;
    const linha = gsap.timeline();
    linha
      .fromTo(
        balao,
        {
          scale: parametros.escalaInicial,
          opacity: 0,
          rotation: -3,
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
      .to(
        frase,
        { opacity: 1, duration: parametros.fraseAparece, ease: curvas.leve },
        parametros.fraseEm,
      )
      // Leitura: sobe mais um pouco balançando, e a frase acompanha, parada em relação ao balão.
      .to(
        balao,
        { y: () => posicoes().leitura, duration: parametros.leitura, ease: curvas.suave },
        parametros.leituraEm,
      )
      .to(
        balao,
        { rotation: 3, duration: parametros.leitura, ease: curvas.suave },
        parametros.leituraEm,
      )
      .to(
        balao,
        { y: () => posicoes().fora, duration: parametros.subidaFinal, ease: curvas.entradaLeve },
        parametros.subidaFinalEm,
      );
    return linha;
  }

  /** Um toque triplica a velocidade até o próximo rótulo e depois volta a 1× (nenhuma frase é pulada). */
  function acelerar(linha: gsap.core.Timeline): void {
    // `nextLabel` devolve vazio depois do último rótulo: o alvo é o fim da história.
    const proximo = linha.nextLabel();
    const tempoAlvo = proximo === '' ? total : (linha.labels[proximo] ?? total);
    linha.timeScale(parametros.aceleracao);
    acompanharAceleracao?.();
    const voltar = () => {
      if (linha.time() < tempoAlvo && !linha.paused()) return;
      linha.timeScale(1);
      gsap.ticker.remove(voltar);
      acompanharAceleracao = undefined;
    };
    gsap.ticker.add(voltar);
    acompanharAceleracao = () => {
      gsap.ticker.remove(voltar);
    };
  }

  function luzDoPorDoSol(): HTMLElement[] {
    return gsap.utils.toArray<HTMLElement>('.camada--ceu-sol, .camada--luz', raiz);
  }

  function parar(): void {
    linhaDoTempo?.kill();
    acompanharAceleracao?.();
    acompanharAceleracao = undefined;
    ouvintes?.abort();
  }

  return {
    init() {
      montar();
    },

    run() {
      const { secao, baloes, regiao, dica, avancar } = montar();
      // Nuvens e fotos só são pedidas agora: a fila secundária já as deixou no cache (SPEC-02, RF-02.7).
      carregarImagensTardias(secao);
      return new Promise<void>((resolver) => {
        secao.hidden = false;
        avancar.hidden = false;
        // Durante a história o foco fica no botão de avançar (SPEC-09, RF-09.6).
        avancar.focus({ preventScroll: true });
        const historia = gsap.timeline({
          onComplete: () => {
            // Acabou a história: o botão de avançar (que cobre a tela) não pode ficar no Tab nem
            // capturar toques durante o envelope e a carta (SPEC-05, SPEC-09).
            avancar.hidden = true;
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
        // tlLuz dentro da mesma linha do tempo: acelera junto com a história (SPEC-03, RF-03.5).
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

        // A dica só aparece na primeira vez que a história toca neste aparelho (RF-05.7).
        if (!estado.visitado) {
          historia
            .to(
              dica,
              { opacity: 1, duration: parametros.fraseAparece, ease: curvas.leve },
              parametros.dica.aparece,
            )
            .to(
              dica,
              { opacity: 0, duration: parametros.fraseAparece, ease: curvas.leve },
              parametros.dica.some,
            );
        }

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

        ouvintes = new AbortController();
        avancar.addEventListener(
          'click',
          () => {
            acelerar(historia);
          },
          { signal: ouvintes.signal },
        );
      });
    },

    skip() {
      const { secao, avancar } = montar();
      parar();
      avancar.hidden = true;
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
