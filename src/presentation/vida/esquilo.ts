import gsap from 'gsap';

import type { EstadoConvite } from '@/application/estado-convite';
import type { ConfigConvite } from '@/domain/config/config-convite';
import { urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';
import { type ParadaDoEsquilo, planejarVisita, type PuloDoEsquilo } from '@/domain/vida/esquilo';
import { type Aleatorio, sortearEntre } from '@/domain/vida/sorteio';

import { estaPronta } from '../petalas/petalas';
import type { ElementoDeVida } from './elemento-de-vida';
import { criarRelogioDaVida } from './relogio-da-vida';

export interface DependenciasDoEsquilo {
  readonly raiz: HTMLElement;
  readonly config: ConfigConvite;
  readonly estado: EstadoConvite;
  readonly aleatorio?: Aleatorio;
}

type Pose = 'encolhido' | 'esticado';

/**
 * Esquilo que, de tempos em tempos, entra por um lado da tela, pula até o centro, para, olha em volta e sai, sempre de um
 * jeito diferente (SPEC-21): o número de paradas, onde elas ficam, se vai aos pulinhos ou aos disparos, o que faz em cada
 * parada e por onde sai são sorteados a cada visita, e às vezes só espia da borda. São duas imagens (encolhido e
 * esticado no pulo) empilhadas e trocadas por `opacity`, sem piscar, e sai e entra de trás dos arbustos das laterais. Ele aparece em toda a experiência, também com o
 * convite aberto (01/11/2026); só para no modo de segurança. Na vertical vive no espaço de trás do baú, que o esconde
 * (e ao casal) quando ele passa por trás deles; na horizontal, no espaço do chão, à frente do primeiro plano.
 */
export function criarEsquilo(dependencias: DependenciasDoEsquilo): ElementoDeVida {
  const { raiz, config, estado, aleatorio = Math.random } = dependencias;
  const { esquilo: parametros } = config.vida;
  const { curvas } = config;
  const relogio = criarRelogioDaVida();
  const modelos = new Map<Pose, HTMLImageElement>();
  let emVisita = false;
  let parado = false;

  function criarPose(pose: Pose): HTMLImageElement | undefined {
    const modelo = modelos.get(pose);
    if (!modelo || !estaPronta(modelo)) return undefined;
    const imagem = modelo.cloneNode() as HTMLImageElement;
    imagem.className = `esquilo__pose esquilo__pose--${pose}`;
    imagem.alt = '';
    return imagem;
  }

  /** Monta a visita na linha do tempo; devolve `false` se não deu (sem imagens ou sem espaço para ele). */
  function visitar(): boolean {
    // Na vertical e no computador a cena é a pintura mestre: o esquilo vive no espaço de trás do baú, que o esconde (e ao
    // casal) quando ele passa por trás, e os arbustos de primeiro plano o tapam nas pontas.
    const conteiner = raiz.querySelector(
      estado.orientacao === 'vertical' || !estado.toque ? '.vida--fundo' : '.vida--chao',
    );
    const encolhido = criarPose('encolhido');
    const esticado = criarPose('esticado');
    if (!conteiner || !encolhido || !esticado) return false;
    // Sem `undefined` no tipo: o pulo e a parada, declarados abaixo como funções, não herdam o estreitamento da guarda.
    const poses = { encolhido, esticado };

    const { innerWidth: largura, innerHeight: altura } = window;
    // No computador o esquilo tem o tamanho da pintura, que cobre a janela (a largura dela, ou a altura vezes 16/9, o que
    // for maior): numa janela estreita ele não vira um ponto, e os pulos acompanham.
    const larguraDaCena = estado.computador ? Math.max(largura, (altura * 16) / 9) : largura;
    const larguraDoEsquilo =
      parametros.largura[estado.computador ? 'computador' : estado.orientacao] * larguraDaCena;
    const plano = planejarVisita(aleatorio, parametros, {
      larguraDaTela: largura,
      larguraDaCena,
      larguraDoEsquilo,
      computador: estado.computador,
    });

    // A passagem cobre a faixa do chão e esmaece as laterais, onde ficam os arbustos da pintura: o esquilo surge de trás
    // deles, em vez de passar por cima (a pintura é uma imagem só e não dá para escondê-lo atrás de verdade).
    const passagem = document.createElement('div');
    passagem.className = 'esquilo__passagem';
    passagem.setAttribute('aria-hidden', 'true');
    const esquilo = document.createElement('span');
    esquilo.className = 'esquilo';
    esquilo.setAttribute('aria-hidden', 'true');
    esquilo.style.width = `${String(larguraDoEsquilo)}px`;
    // No computador as patas ficam a uma fração da altura da pintura (e não da janela), contada da borda de baixo dela:
    // numa janela larga e baixa o gramado é uma faixa mais fina da janela, e o esquilo segue nele (09/11/2026).
    esquilo.style.bottom = estado.computador
      ? `calc(var(--altura-da-cena) * ${String(parametros.chao.computador)} - var(--sobra-da-cena))`
      : `${String(parametros.chao[estado.orientacao] * altura)}px`;
    esquilo.append(encolhido, esticado);
    passagem.append(esquilo);
    conteiner.append(passagem);

    // As duas imagens olham para a direita no arquivo: `scaleX: -1` vira o esquilo (RF-21.4).
    let x = plano.lado === 'esquerda' ? -larguraDoEsquilo : largura;
    /** Para onde o esquilo olha ao montar a linha do tempo: 1, para a direita da tela; -1, para a esquerda. */
    let virado: 1 | -1 = plano.lado === 'esquerda' ? 1 : -1;
    gsap.set(esquilo, { x, scaleX: virado });
    gsap.set(esticado, { opacity: 0 });
    const linha = gsap.timeline({
      onComplete: () => {
        passagem.remove();
        emVisita = false;
        relogio.depois(sortearEntre(parametros.intervalo, aleatorio), tentar);
      },
    });
    const { pouso, achatamento } = parametros.pulo;

    /** Um pulo: impulso (imagem esticada), voo em arco, pouso achatando (imagem encolhida) e respiro. */
    function pular(passo: PuloDoEsquilo): void {
      const t = linha.duration();
      const alvo = x + passo.sentido * passo.distancia;
      virado = passo.sentido;
      linha
        .set(esquilo, { scaleX: passo.sentido }, t)
        .set(poses.esticado, { opacity: 1 }, t)
        .set(poses.encolhido, { opacity: 0 }, t)
        .to(esquilo, { x: alvo, duration: passo.voo, ease: curvas.linear }, t)
        .to(esquilo, { y: -passo.altura, duration: passo.voo / 2, ease: curvas.senoSaida }, t)
        .to(esquilo, { y: 0, duration: passo.voo / 2, ease: curvas.senoEntrada }, t + passo.voo / 2)
        .set(poses.esticado, { opacity: 0 }, t + passo.voo)
        .set(poses.encolhido, { opacity: 1 }, t + passo.voo)
        .fromTo(
          esquilo,
          { scaleY: achatamento },
          { scaleY: 1, duration: pouso, ease: curvas.saida },
          t + passo.voo,
        )
        .set({}, {}, t + passo.voo + pouso + passo.respiro);
      x = alvo;
    }

    /** Uma parada: o rabo sacode e, às vezes, ele se vira para olhar o outro lado e volta a se virar. */
    function parar(passo: ParadaDoEsquilo): void {
      const inicio = linha.duration();
      const sacudidas = Math.max(1, passo.sacudidas);
      const sacudida = (passo.duracao * 0.3) / (sacudidas * 2);
      for (let i = 0; i < passo.sacudidas; i += 1) {
        linha.to(
          esquilo,
          {
            rotation: parametros.inclinacaoDaSacudida,
            duration: sacudida,
            repeat: 1,
            yoyo: true,
            ease: curvas.suave,
          },
          inicio + i * sacudida * 2,
        );
      }
      for (let i = 0; i < passo.olhadas; i += 1) {
        const comeco = inicio + passo.duracao * (0.35 + (0.5 * i) / passo.olhadas);
        linha
          .set(esquilo, { scaleX: -virado }, comeco)
          .set(esquilo, { scaleX: virado }, comeco + passo.duracao * 0.12);
      }
      linha.set({}, {}, inicio + passo.duracao);
    }

    for (const passo of plano.passos) {
      if (passo.tipo === 'pulo') pular(passo);
      else parar(passo);
    }

    relogio.iniciar(linha);
    return true;
  }

  /** Começa uma visita; se não deu, tenta de novo no próximo intervalo. Só o `parar` (modo de segurança) a encerra. */
  function tentar(): void {
    if (parado) return;
    if (!emVisita && visitar()) {
      emVisita = true;
      return;
    }
    relogio.depois(sortearEntre(parametros.intervalo, aleatorio), tentar);
  }

  return {
    iniciar() {
      for (const [pose, chave] of [
        ['encolhido', 'esquiloEncolhido'],
        ['esticado', 'esquiloEsticado'],
      ] as const) {
        const modelo = new Image();
        modelo.src = urlDaImagem(config.imagens[chave], 'vertical');
        modelos.set(pose, modelo);
      }
      relogio.depois(parametros.primeiroEm, tentar);
    },
    // O esquilo é o mesmo nos dois níveis (SPEC-18, "Níveis").
    aoMudarNivel() {
      /* nada muda */
    },
    pausar: relogio.pausar,
    retomar: relogio.retomar,
    parar() {
      parado = true;
      relogio.parar();
      for (const passagem of raiz.querySelectorAll('.esquilo__passagem')) passagem.remove();
      modelos.clear();
    },
  };
}
