import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import type { EstadoConvite } from '@/application/estado-convite';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { type Ponto, posicoesDasEstrelas } from '@/domain/historia/estrelas';

import {
  concluirLuzDoPorDoSol,
  iniciarLuzDoPorDoSol,
  pararLuzDoPorDoSol,
} from '../bosque/luz-do-por-do-sol';
import { criar } from '../dom';
import { carregarImagensTardias } from '../imagens/imagens-tardias';
import { criarFotoEmCirculo } from './foto-em-circulo';

export interface DependenciasDaHistoria {
  readonly raiz: HTMLElement;
  readonly conteudo: ConteudoConvite;
  readonly config: ConfigConvite;
  readonly estado: EstadoConvite;
  readonly eventos: BarramentoEventos<EventosConvite>;
}

/** Tudo o que uma memória usa: a centelha que sobe do baú, o cartão em que ela se abre, a poeira e a estrela. */
interface Memoria {
  readonly centelha: HTMLElement;
  readonly cartao: HTMLElement;
  readonly frase: HTMLElement;
  readonly estrela: HTMLElement;
  readonly poeira: readonly HTMLElement[];
}

interface Partes {
  readonly secao: HTMLElement;
  readonly memorias: readonly Memoria[];
  readonly clarao: HTMLElement;
  readonly regiao: HTMLElement;
}

/** Sequência fixa de frações entre 0 e 1 (sem sorteio): a poeira cai igual em toda visita e nos testes. */
const fracao = (indice: number, semente: number) => (indice * 0.618034 + semente) % 1;

/**
 * História em memórias de luz (SPEC-05, ADR-0026): as cinco memórias saem do baú uma depois da outra, cada uma por
 * `duracoes.balao` (5 s). Uma centelha dourada sobe da boca do baú e se abre num cartão-memória com a frase (e a foto,
 * quando chegar); o cartão se desfaz em poeira dourada e deixa uma estrela no céu, sobre o baú. Com as cinco acesas,
 * as estrelas descem juntas ao ponto onde o envelope pousa, e é da luz delas que ele nasce (`cena-carta`). A luz
 * caminha ao pôr do sol na mesma linha do tempo (`tlHistoria`). Nada na tela acelera nem pula a história: quem não
 * quer vê-la inteira usa "Pular para o convite" (ADR-0012). A região `aria-live` anuncia cada frase uma vez (RF-05.8).
 */
export function criarCenaHistoria(dependencias: DependenciasDaHistoria): Cena {
  const { raiz, conteudo, config, estado, eventos } = dependencias;
  const { duracoes, curvas, historia: parametros } = config;
  const quantidade = conteudo.baloes.length;
  const total = duracoes.balao * quantidade + parametros.convergencia;

  let partes: Partes | undefined;
  let linhaDoTempo: gsap.core.Timeline | undefined;

  function montar(): Partes {
    if (partes) return partes;
    const secao = criar('section', 'historia');
    // No computador os cartões de fala e o texto são maiores (09/11/2026); a CSS só vale na horizontal.
    if (!estado.toque) secao.classList.add('historia--computador');
    secao.setAttribute('aria-label', conteudo.rotulos.historia);
    secao.hidden = true;

    const clarao = criar('span', 'historia__clarao');
    const { poeira: grao, estrela: ponta } = parametros;

    const memorias: Memoria[] = conteudo.baloes.map((balao, indice) => {
      const centelha = criar('span', 'memoria__centelha');
      const cartao = criar('div', 'memoria__cartao');
      const foto = criarFotoEmCirculo(balao, { classe: 'memoria__foto', adiada: true });
      const frase = criar('p', 'memoria__frase', balao.frase);
      if (foto) cartao.append(foto);
      cartao.append(frase);

      const estrela = criar('span', 'memoria__estrela');
      estrela.style.setProperty('--indice', String(indice));
      estrela.style.width = `${String(ponta.tamanho)}px`;
      estrela.style.height = `${String(ponta.tamanho)}px`;
      estrela.append(criar('span', 'memoria__estrela-ponta'));

      const poeira = Array.from({ length: grao.quantidade }, (_, k) => {
        const po = criar('span', 'memoria__po');
        const lado = grao.tamanho[0] + (grao.tamanho[1] - grao.tamanho[0]) * fracao(k, 0.3);
        po.style.width = `${String(lado)}px`;
        po.style.height = `${String(lado)}px`;
        return po;
      });

      // Cada peça é posicionada pela animação (transform), por isso nasce centrada em si mesma e invisível.
      gsap.set([centelha, cartao, estrela, ...poeira], {
        xPercent: -50,
        yPercent: -50,
        opacity: 0,
      });
      gsap.set(cartao, {
        rotation: parametros.inclinacoes[indice % parametros.inclinacoes.length] ?? 0,
      });
      gsap.set(frase, { opacity: 0 });
      return { centelha, cartao, frase, estrela, poeira };
    });
    gsap.set(clarao, { xPercent: -50, yPercent: -50, opacity: 0 });

    const regiao = criar('p', 'visualmente-oculto');
    regiao.setAttribute('aria-live', 'polite');

    secao.append(
      clarao,
      // A poeira vem depois do cartão: ele se desfaz por cima dela, e ela tem de aparecer à frente.
      ...memorias.flatMap((m) => [m.centelha, m.cartao, ...m.poeira, m.estrela]),
      regiao,
    );
    raiz.append(secao);
    partes = { secao, memorias, clarao, regiao };
    return partes;
  }

  /** Boca do baú na tela, de onde as centelhas saem; sem baú, um ponto baixo e central. */
  function boca(): Ponto {
    const corpo = raiz.querySelector('.bau__corpo');
    if (!corpo) return { x: window.innerWidth / 2, y: window.innerHeight * 0.75 };
    const caixa = corpo.getBoundingClientRect();
    return { x: caixa.left + caixa.width / 2, y: caixa.top + caixa.height * 0.3 };
  }

  /** O ponto onde as estrelas se juntam e o envelope nasce: o mesmo em que ele pousa (`config.carta`). */
  function pouso(): Ponto {
    return { x: window.innerWidth / 2, y: window.innerHeight * config.carta.alturaDoPouso };
  }

  /** O arco de estrelas sobre o baú, uma por memória. */
  function arco(): Ponto[] {
    const { raio, maximo, achatamento, folga } = parametros.arco;
    const centro = boca();
    return posicoesDasEstrelas({
      centro: { x: centro.x, y: centro.y - folga },
      raio: Math.min(window.innerWidth * raio, maximo),
      achatamento,
      quantidade,
    });
  }

  /** Uma memória de `duracoes.balao`: a centelha sobe, vira cartão, é lida, vira poeira e deixa uma estrela. */
  function linhaDaMemoria(memoria: Memoria, indice: number): gsap.core.Timeline {
    const { centelha, cartao, frase, estrela, poeira } = memoria;
    const p = parametros;
    const lado = p.desvios[indice % p.desvios.length] ?? 0;
    const emPe = () => window.innerWidth <= window.innerHeight;
    /** Onde o cartão se abre: no centro (com o desvio próprio) e a uma altura que nunca encosta nos botões do alto. */
    const alvo = (): Ponto => ({
      x: window.innerWidth * (0.5 + lado),
      y: Math.max(
        window.innerHeight * (emPe() ? p.alturaDoCartao : p.alturaDoCartaoNaHorizontal),
        p.margemSuperior + cartao.offsetHeight / 2,
      ),
    });

    const linha = gsap.timeline();
    linha
      // A centelha sobe da boca do baú em curva: x e y andam em ritmos diferentes.
      .fromTo(
        centelha,
        { x: () => boca().x },
        { x: () => alvo().x, duration: p.centelhaSobe, ease: curvas.suave },
        0,
      )
      .fromTo(
        centelha,
        { y: () => boca().y },
        { y: () => alvo().y, duration: p.centelhaSobe, ease: curvas.saida },
        0,
      )
      .fromTo(
        centelha,
        { opacity: 0, scale: 0.3 },
        { opacity: 1, scale: 1, duration: p.centelhaSobe * 0.35, ease: curvas.leve },
        0,
      )
      // Ao chegar, ela se abre no cartão.
      .to(
        centelha,
        { opacity: 0, scale: 2.4, duration: p.cartaoAparece * 0.6, ease: curvas.leve },
        p.cartaoEm,
      )
      .set(cartao, { x: () => alvo().x, y: () => alvo().y }, p.cartaoEm)
      .fromTo(
        cartao,
        { opacity: 0, scale: 0.3 },
        { opacity: 1, scale: 1, duration: p.cartaoAparece, ease: curvas.saida },
        p.cartaoEm,
      )
      .to(frase, { opacity: 1, duration: p.fraseAparece, ease: curvas.leve }, p.fraseEm);

    // O cartão respira enquanto é lido.
    const respiroEm = p.cartaoEm + p.cartaoAparece;
    linha
      .to(
        cartao,
        { scale: p.respiro.escala, duration: p.respiro.duracao, ease: curvas.suave },
        respiroEm,
      )
      .to(
        cartao,
        { scale: 1, duration: p.respiro.duracao, ease: curvas.suave },
        respiroEm + p.respiro.duracao,
      )
      // E se desfaz: sobe um pouco e some, e a poeira dourada cai.
      .to(
        cartao,
        {
          opacity: 0,
          y: '-=22',
          scale: 1.04,
          duration: duracoes.balao - p.cartaoSomeEm,
          ease: curvas.entradaLeve,
        },
        p.cartaoSomeEm,
      );
    poeira.forEach((po, k) => {
      const u = fracao(k, 0.1);
      const v = fracao(k, 0.55);
      const queda = p.poeira.queda[0] + (p.poeira.queda[1] - p.poeira.queda[0]) * fracao(k, 0.8);
      linha
        .fromTo(
          po,
          {
            x: () => alvo().x + (u - 0.5) * cartao.offsetWidth * 0.9,
            y: () => alvo().y + (v - 0.5) * cartao.offsetHeight * 0.7,
            opacity: 0,
          },
          { opacity: 0.95, duration: p.poeira.aparece, ease: curvas.leve },
          p.cartaoSomeEm,
        )
        .to(
          po,
          {
            y: `+=${String(queda)}`,
            x: `+=${String((u - 0.5) * 2 * p.poeira.deriva)}`,
            opacity: 0,
            duration: p.poeira.duracao,
            ease: curvas.entradaLeve,
          },
          p.cartaoSomeEm + p.poeira.aparece,
        );
    });

    // A estrela da memória voa do cartão ao seu lugar no arco e fica ali, cintilando.
    linha.fromTo(
      estrela,
      { x: () => alvo().x, y: () => alvo().y, opacity: 0, scale: 0.3 },
      {
        x: () => arco()[indice]?.x ?? 0,
        y: () => arco()[indice]?.y ?? 0,
        opacity: 1,
        scale: 1,
        duration: p.estrela.sobe,
        ease: curvas.suave,
      },
      p.cartaoSomeEm + p.estrela.atraso,
    );
    return linha;
  }

  function luzDoPorDoSol(): HTMLElement[] {
    return gsap.utils.toArray<HTMLElement>('.camada--ceu-sol, .camada--luz', raiz);
  }

  function parar(): void {
    linhaDoTempo?.kill();
    pararLuzDoPorDoSol(raiz);
  }

  return {
    init() {
      montar();
    },

    run() {
      const { secao, memorias, clarao, regiao } = montar();
      // As fotos só são pedidas agora: a fila secundária já as deixou no cache (SPEC-02, RF-02.7).
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
        // tlLuz dentro da mesma linha do tempo: a luz caminha com as memórias (SPEC-03, RF-03.5).
        // O pôr do sol roda no navegador (sem JavaScript por quadro durante a história inteira); sem `Element.animate`, no GSAP.
        if (!iniciarLuzDoPorDoSol(raiz, total, curvas.suave)) {
          const luz = luzDoPorDoSol();
          if (luz.length > 0)
            historia.to(luz, { opacity: 1, duration: total, ease: curvas.suave }, 0);
        }

        memorias.forEach((memoria, indice) => {
          const rotulo = `m${String(indice)}`;
          const frase = conteudo.baloes[indice]?.frase ?? '';
          historia
            .addLabel(rotulo, indice * duracoes.balao)
            .call(
              () => {
                regiao.textContent = frase;
                eventos.emit('historia:balao', { indice, frase });
                if (indice === memorias.length - 1) eventos.emit('historia:ultimo');
              },
              [],
              rotulo,
            )
            .add(linhaDaMemoria(memoria, indice), rotulo);
        });

        // As cinco estrelas descem juntas ao ponto onde o envelope pousa; no fim, um clarão, e é dele que o envelope nasce.
        const convergencia = duracoes.balao * quantidade;
        const { convergencia: duracaoDaConvergencia } = parametros;
        historia.addLabel('convergencia', convergencia);
        for (const memoria of memorias) {
          historia
            .to(
              memoria.estrela,
              {
                x: () => pouso().x,
                y: () => pouso().y,
                scale: 0.35,
                duration: duracaoDaConvergencia,
                ease: curvas.entrada,
              },
              'convergencia',
            )
            .to(
              memoria.estrela,
              { opacity: 0, duration: duracaoDaConvergencia * 0.25, ease: curvas.leve },
              convergencia + duracaoDaConvergencia * 0.75,
            );
        }
        historia
          .set(clarao, { x: () => pouso().x, y: () => pouso().y, scale: 0.2 }, 'convergencia')
          .to(
            clarao,
            { opacity: 1, scale: 1, duration: duracaoDaConvergencia * 0.3, ease: curvas.saida },
            convergencia + duracaoDaConvergencia * 0.55,
          )
          .to(
            clarao,
            { opacity: 0, scale: 1.5, duration: duracaoDaConvergencia * 0.15, ease: curvas.leve },
            convergencia + duracaoDaConvergencia * 0.85,
          );

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
      concluirLuzDoPorDoSol(raiz);
    },

    destroy() {
      parar();
      partes?.secao.remove();
      partes = undefined;
    },
  };
}
