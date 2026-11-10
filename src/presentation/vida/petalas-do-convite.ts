import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { EstadoConvite } from '@/application/estado-convite';
import type { Capacidades } from '@/application/ports/capacidades';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';
import { planejarPetala } from '@/domain/vida/petalas-do-convite';
import { type Aleatorio, sortearEntre } from '@/domain/vida/sorteio';

import { estaPronta } from '../petalas/petalas';
import { criarRelogioDaVida } from './relogio-da-vida';

export interface DependenciasDasPetalasDoConvite {
  readonly corpo: HTMLElement;
  readonly config: ConfigConvite;
  readonly estado: EstadoConvite;
  readonly eventos: BarramentoEventos<EventosConvite>;
  readonly capacidades: Pick<Capacidades, 'aparelhoModesto'>;
  /** Os planejadores sorteiam com isto; os testes passam uma sequência fixa. */
  readonly aleatorio?: Aleatorio;
}

export interface PetalasDoConvite {
  /** Para de vez e tira do DOM o que as pétalas criaram. */
  destruir(): void;
}

const CHAVES_DAS_IMAGENS = ['petalaA', 'petalaB', 'petalaC'] as const;

/**
 * As pétalas azuis do convite aberto (08/11/2026): em vez de uma chuva só, que caía toda de uma vez, elas caem como as
 * folhas, devagar, para sempre e em posições variadas, uma de cada vez e com delicadeza: balançam, giram e viram de
 * lado, e as pequenas, que parecem mais longe, são mais lentas e mais fracas. Começam quando o convidado toca no selo
 * (ou pula direto ao convite) e só param no modo de segurança. Respeitam o botão "Pausar animação" e a animação
 * reduzida (nesse caso nada cai). É enfeite: fica numa camada fixa, sem toque nem foco, fora da árvore de acessibilidade.
 */
export function criarPetalasDoConvite(
  dependencias: DependenciasDasPetalasDoConvite,
): PetalasDoConvite {
  const { corpo, config, estado, eventos, capacidades, aleatorio = Math.random } = dependencias;
  const { petalasDoConvite: parametros, curvas } = config;

  // Animação reduzida: nada cai (SPEC-18, "Quando a vida existe").
  if (estado.reduzido) {
    return {
      destruir() {
        /* nada foi criado */
      },
    };
  }

  const relogio = criarRelogioDaVida();
  const modelos: HTMLImageElement[] = [];
  let camada: HTMLElement | undefined;
  let iniciada = false;
  let destruida = false;
  let noAr = 0;

  const limiteDoNivel = () =>
    capacidades.aparelhoModesto() ? parametros.maximo.leve : parametros.maximo.completo;
  /** No computador cabem mais pétalas no ar (a tela é bem maior; 09/11/2026). */
  const limite = () =>
    Math.round(limiteDoNivel() * (estado.computador ? parametros.noComputador.fatorDoMaximo : 1));
  const intervaloAteAProxima = () =>
    sortearEntre(parametros.intervalo, aleatorio) *
    (estado.computador ? parametros.noComputador.fatorDoIntervalo : 1);

  function lancar(): void {
    const plano = planejarPetala(aleatorio, parametros, modelos.length);
    const modelo = modelos[plano.variacao];
    if (!modelo || !estaPronta(modelo) || !camada) return;

    const { innerWidth: largura, innerHeight: altura } = window;
    const petala = modelo.cloneNode() as HTMLImageElement;
    petala.className = 'petala-do-convite';
    petala.alt = '';
    petala.setAttribute('aria-hidden', 'true');
    petala.draggable = false;
    petala.style.width = `${String(plano.largura)}px`;
    camada.append(petala);
    noAr += 1;

    const { duracao, balanco, trocasDeLado, giro } = plano;
    const x = plano.x * largura;
    const lado = plano.espelhada ? -1 : 1;
    const viradas = Math.max(1, Math.round(duracao / plano.periodoDoVirar));
    gsap.set(petala, { x, y: -plano.largura * 2, opacity: 0, rotation: -giro / 2, scaleX: lado });

    const queda = gsap.timeline({
      onComplete: () => {
        petala.remove();
        noAr -= 1;
      },
    });
    queda
      // Cai do alto até passar do pé da tela, num ritmo constante e calmo.
      .to(petala, { y: altura + plano.largura * 2, duration: duracao, ease: curvas.linear }, 0)
      .fromTo(
        petala,
        { rotation: -giro / 2 },
        { rotation: giro / 2, duration: duracao, ease: curvas.linear },
        0,
      )
      // Vai e vem lateral: `trocasDeLado` trocas na queda.
      .fromTo(
        petala,
        { x: x - balanco },
        {
          x: x + balanco,
          duration: duracao / trocasDeLado,
          repeat: trocasDeLado - 1,
          yoyo: true,
          ease: curvas.suave,
        },
        0,
      )
      // E vira de lado, como uma pétala de verdade ao cair.
      .fromTo(
        petala,
        { scaleX: lado },
        {
          scaleX: lado * 0.45,
          duration: duracao / (viradas * 2),
          repeat: viradas * 2 - 1,
          yoyo: true,
          ease: curvas.suave,
        },
        0,
      )
      .fromTo(
        petala,
        { opacity: 0 },
        { opacity: plano.opacidade, duration: duracao * parametros.esmaecer, ease: curvas.suave },
        0,
      )
      .to(
        petala,
        { opacity: 0, duration: duracao * parametros.esmaecer, ease: curvas.entradaLeve },
        duracao * (1 - parametros.esmaecer),
      );
    relogio.iniciar(queda);
  }

  /** Uma pétala a cada intervalo sorteado, sempre, enquanto houver menos no ar que o limite. */
  function nascer(): void {
    if (destruida) return;
    if (noAr < limite()) lancar();
    relogio.depois(intervaloAteAProxima(), nascer);
  }

  /** O botão "Pausar animação" congela as pétalas no lugar. */
  function sincronizarPausa(): void {
    if (!iniciada) return;
    if (estado.movimentoLigado) relogio.retomar();
    else relogio.pausar();
  }

  function comecar(primeiroEm: number): void {
    if (iniciada || destruida) return;
    iniciada = true;
    camada = document.createElement('div');
    camada.className = 'petalas-do-convite';
    camada.setAttribute('aria-hidden', 'true');
    corpo.append(camada);
    // As imagens já estão no cache (a fila secundária as baixa antes do envelope); aqui só se pede o clone.
    for (const chave of CHAVES_DAS_IMAGENS) {
      const modelo = new Image();
      modelo.src = urlDaImagem(config.imagens[chave], 'vertical');
      modelos.push(modelo);
    }
    relogio.depois(primeiroEm, nascer);
    sincronizarPausa();
  }

  const pararDeOuvirEventos = [
    eventos.on('carta:abrindo', () => {
      comecar(parametros.primeiroEm);
    }),
    // Pular: o convite já abre aberto, e as pétalas começam logo.
    eventos.on('convite:pulado', () => {
      comecar(parametros.primeiroEmAoPular);
    }),
  ];

  function destruir(): void {
    if (destruida) return;
    destruida = true;
    for (const parar of pararDeOuvirEventos) parar();
    pararDeOuvirEstado();
    relogio.parar();
    camada?.remove();
    camada = undefined;
    modelos.length = 0;
    noAr = 0;
  }

  const pararDeOuvirEstado = estado.aoMudar(() => {
    if (estado.fase === 'seguranca') destruir();
    else sincronizarPausa();
  });

  return { destruir };
}
