import gsap from 'gsap';

import type { EstadoConvite } from '@/application/estado-convite';
import type { ConfigConvite } from '@/domain/config/config-convite';
import { urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';
import { planejarVisita, type PuloDoEsquilo, visitaPermitida } from '@/domain/vida/esquilo';
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
 * Esquilo que, de tempos em tempos, entra por um lado da tela, avança aos pulinhos pela grama, para, olha em
 * volta e volta por onde veio (SPEC-21). Nunca passa pelo baú: o ponto de parada deixa folga antes dele. São duas
 * imagens (encolhido e esticado no pulo) empilhadas e trocadas por `opacity`, sem piscar. Depois que o envelope
 * pousa não há visita nova; a que está acontecendo termina.
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

  /** Monta a visita na linha do tempo; devolve `false` se não deu (sem imagens, sem espaço, sem baú). */
  function visitar(): boolean {
    const conteiner = raiz.querySelector('.vida--chao');
    const caixaDoBau = raiz.querySelector('.bau')?.getBoundingClientRect();
    const encolhido = criarPose('encolhido');
    const esticado = criarPose('esticado');
    if (!conteiner || !caixaDoBau || !encolhido || !esticado) return false;
    // Sem `undefined` no tipo: o pulo, declarado abaixo como função, não herda o estreitamento da guarda.
    const poses = { encolhido, esticado };

    const { innerWidth: largura, innerHeight: altura } = window;
    const larguraDoEsquilo = parametros.largura[estado.orientacao] * largura;
    const plano = planejarVisita(aleatorio, parametros, {
      larguraDaTela: largura,
      bau: { esquerda: caixaDoBau.left, direita: caixaDoBau.right },
    });
    if (!plano) return false;

    const esquilo = document.createElement('span');
    esquilo.className = 'esquilo';
    esquilo.setAttribute('aria-hidden', 'true');
    esquilo.style.width = `${String(larguraDoEsquilo)}px`;
    esquilo.style.bottom = `${String(parametros.chao[estado.orientacao] * altura)}px`;
    esquilo.append(encolhido, esticado);
    conteiner.append(esquilo);

    // As duas imagens olham para a direita no arquivo: `scaleX: -1` vira o esquilo (RF-21.4).
    const paraDentro = plano.lado === 'esquerda' ? 1 : -1;
    let x = plano.lado === 'esquerda' ? -larguraDoEsquilo : largura;
    gsap.set(esquilo, { x, scaleX: paraDentro });
    gsap.set(esticado, { opacity: 0 });
    const linha = gsap.timeline({
      onComplete: () => {
        esquilo.remove();
        emVisita = false;
        relogio.depois(sortearEntre(parametros.intervalo, aleatorio), tentar);
      },
    });
    const { voo, pouso, achatamento } = parametros.pulo;

    /** Um pulo: impulso (imagem esticada), voo em arco, pouso achatando (imagem encolhida) e respiro. */
    function pular(pulo: PuloDoEsquilo, sentido: number): void {
      const t = linha.duration();
      const alvo = x + sentido * pulo.distancia;
      linha
        .set(poses.esticado, { opacity: 1 }, t)
        .set(poses.encolhido, { opacity: 0 }, t)
        .to(esquilo, { x: alvo, duration: voo, ease: curvas.linear }, t)
        .to(esquilo, { y: -pulo.altura, duration: voo / 2, ease: curvas.senoSaida }, t)
        .to(esquilo, { y: 0, duration: voo / 2, ease: curvas.senoEntrada }, t + voo / 2)
        .set(poses.esticado, { opacity: 0 }, t + voo)
        .set(poses.encolhido, { opacity: 1 }, t + voo)
        .fromTo(
          esquilo,
          { scaleY: achatamento },
          { scaleY: 1, duration: pouso, ease: curvas.saida },
          t + voo,
        )
        .set({}, {}, t + voo + pouso + pulo.respiro);
      x = alvo;
    }

    for (const pulo of plano.pulosDeIda) pular(pulo, paraDentro);

    // Parada: o rabo sacode, ele se vira para o outro lado e volta a se virar.
    const inicioDaParada = linha.duration();
    const sacudida = (plano.parada * 0.3) / (parametros.sacudidasDoRabo * 2);
    for (let i = 0; i < parametros.sacudidasDoRabo; i += 1) {
      linha.to(
        esquilo,
        {
          rotation: parametros.inclinacaoDaSacudida,
          duration: sacudida,
          repeat: 1,
          yoyo: true,
          ease: curvas.suave,
        },
        inicioDaParada + i * sacudida * 2,
      );
    }
    linha
      .set(esquilo, { scaleX: -paraDentro }, inicioDaParada + plano.parada * 0.45)
      .set(esquilo, { scaleX: paraDentro }, inicioDaParada + plano.parada * 0.75)
      // Vira para a borda de onde veio e sai aos pulos.
      .set(esquilo, { scaleX: -paraDentro }, inicioDaParada + plano.parada)
      .set({}, {}, inicioDaParada + plano.parada);
    for (const pulo of plano.pulosDeVolta) pular(pulo, -paraDentro);

    relogio.iniciar(linha);
    return true;
  }

  /** Começa uma visita se ainda é tempo; senão, tenta de novo no próximo intervalo. Depois da carta, para de vez. */
  function tentar(): void {
    if (parado || !visitaPermitida(estado.fase)) return;
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
      for (const esquilo of raiz.querySelectorAll('.esquilo')) esquilo.remove();
      modelos.clear();
    },
  };
}
