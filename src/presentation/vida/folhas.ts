import gsap from 'gsap';

import type { EstadoConvite } from '@/application/estado-convite';
import type { ConfigConvite } from '@/domain/config/config-convite';
import { urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';
import { planejarFolha, type VariacaoDeFolha } from '@/domain/vida/folhas';
import type { NivelAtivo } from '@/domain/vida/nivel';
import { type Aleatorio, sortearEntre } from '@/domain/vida/sorteio';

import { estaPronta } from '../petalas/petalas';
import type { ElementoDeVida } from './elemento-de-vida';
import { criarRelogioDaVida } from './relogio-da-vida';

export interface DependenciasDasFolhas {
  readonly raiz: HTMLElement;
  readonly config: ConfigConvite;
  readonly estado: EstadoConvite;
  /** Os planejadores sorteiam com isto; os testes passam uma sequência fixa. */
  readonly aleatorio?: Aleatorio;
}

const CHAVES_DAS_IMAGENS = { a: 'folhaA', b: 'folhaB', c: 'folhaC' } as const;
const SELETOR_DA_FOLHA = '.folha';

/**
 * Folhas que se soltam da copa da árvore da direita e caem balançando e girando até perto do chão (SPEC-20).
 * A maioria passa atrás do baú; algumas, maiores e mais rápidas, na frente. Cada folha é um clone de uma das
 * três imagens já carregadas (a que não está pronta é pulada, sem erro) e some do DOM no fim da queda.
 */
export function criarFolhas(dependencias: DependenciasDasFolhas): ElementoDeVida {
  const { raiz, config, estado, aleatorio = Math.random } = dependencias;
  const { folhas: parametros, completo, leve } = config.vida;
  const { curvas } = config;
  const relogio = criarRelogioDaVida();
  const modelos = new Map<VariacaoDeFolha, HTMLImageElement>();
  let maximo = completo.maximoDeFolhas;
  let noAr = 0;
  let parado = false;

  function lancar(): void {
    const plano = planejarFolha(aleatorio, parametros, estado.orientacao);
    const modelo = modelos.get(plano.variacao);
    const conteiner = raiz.querySelector(plano.frente ? '.vida--chao' : '.vida--fundo');
    if (!modelo || !estaPronta(modelo) || !conteiner) return;

    const { innerWidth: largura, innerHeight: altura } = window;
    const folha = modelo.cloneNode() as HTMLImageElement;
    folha.className = 'folha';
    folha.alt = '';
    folha.setAttribute('aria-hidden', 'true');
    folha.style.width = `${String(Math.max(parametros.larguraMinima, plano.largura * largura))}px`;
    conteiner.append(folha);
    noAr += 1;

    const x = plano.origem.x * largura;
    const y = plano.origem.y * altura;
    const { duracao, balanco, trocasDeLado } = plano;
    gsap.set(folha, { x, y, opacity: 0, scaleX: plano.espelhada ? -1 : 1 });
    const queda = gsap.timeline({
      onComplete: () => {
        folha.remove();
        noAr -= 1;
      },
    });
    queda
      .to(
        folha,
        { y: plano.chao * altura, rotation: plano.giro, duration: duracao, ease: curvas.suave },
        0,
      )
      // Vai e vem lateral: `trocasDeLado` trocas na queda, e a folha "vira" a cada uma.
      .fromTo(
        folha,
        { x: x - balanco, skewX: -parametros.inclinacao },
        {
          x: x + balanco,
          skewX: parametros.inclinacao,
          duration: duracao / trocasDeLado,
          repeat: trocasDeLado - 1,
          yoyo: true,
          ease: curvas.suave,
        },
        0,
      )
      .to(folha, { opacity: 1, duration: parametros.aparece, ease: curvas.suave }, 0)
      .to(
        folha,
        { opacity: 0, duration: duracao * parametros.esmaecerNoFim, ease: curvas.entradaLeve },
        duracao * (1 - parametros.esmaecerNoFim),
      );
    relogio.iniciar(queda);
  }

  /** Uma folha a cada intervalo sorteado, enquanto houver menos no ar que o limite do nível. */
  function nascer(): void {
    if (parado) return;
    if (noAr < maximo) lancar();
    relogio.depois(sortearEntre(parametros.intervalo, aleatorio), nascer);
  }

  const limiteDo = (nivel: NivelAtivo) =>
    nivel === 'leve' ? leve.maximoDeFolhas : completo.maximoDeFolhas;

  return {
    iniciar(nivel) {
      maximo = limiteDo(nivel);
      // As imagens estão na fila secundária; baixadas aqui, vêm do cache (SPEC-18, RF-18.7).
      for (const [variacao, chave] of Object.entries(CHAVES_DAS_IMAGENS) as [
        VariacaoDeFolha,
        (typeof CHAVES_DAS_IMAGENS)[VariacaoDeFolha],
      ][]) {
        const modelo = new Image();
        modelo.src = urlDaImagem(config.imagens[chave], 'vertical');
        modelos.set(variacao, modelo);
      }
      relogio.depois(parametros.primeiroEm, nascer);
    },

    // As que já estão no ar terminam a queda; só as novas respeitam o novo limite (RF-20.2).
    aoMudarNivel(nivel) {
      maximo = limiteDo(nivel);
    },

    pausar: relogio.pausar,
    retomar: relogio.retomar,

    parar() {
      parado = true;
      relogio.parar();
      for (const folha of raiz.querySelectorAll(SELETOR_DA_FOLHA)) folha.remove();
      modelos.clear();
      noAr = 0;
    },
  };
}
