import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { EstadoConvite } from '@/application/estado-convite';
import type { Capacidades } from '@/application/ports/capacidades';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { type Aleatorio, sortearEntre } from '@/domain/vida/sorteio';

import type { ElementoDeVida } from './elemento-de-vida';
import type { TickerDaVida } from './medidor-de-quadros';
import { criarOndulacao, type Ondulacao } from './ondulacao/ondulacao';
import { criarRelogioDaVida } from './relogio-da-vida';

export interface DependenciasDoCasal {
  readonly raiz: HTMLElement;
  readonly config: ConfigConvite;
  readonly estado: EstadoConvite;
  readonly eventos: BarramentoEventos<EventosConvite>;
  readonly capacidades: Pick<Capacidades, 'suportaWebGL'>;
  readonly ticker: TickerDaVida;
  readonly aleatorio?: Aleatorio;
}

/**
 * O casal sentado ganha vida (SPEC-22): respira (`scaleY` em `.casal__respiro`), um halo quente respira atrás dele
 * (`.casal__brilho`) e, com WebGL no nível completo, o vento move o cabelo dela e a barra do vestido em rajadas (o
 * motor de ondulação da água, com elipses em vez de faixa). Começa `config.convite.casalEm` segundos depois de
 * `carta:abrindo`, quando o casal surge, ou na hora com Pular. Sem vento, a respiração e o brilho seguem.
 */
export function criarCasal(dependencias: DependenciasDoCasal): ElementoDeVida {
  const {
    raiz,
    config,
    estado,
    eventos,
    capacidades,
    ticker,
    aleatorio = Math.random,
  } = dependencias;
  const { casal: parametros, completo } = config.vida;
  const { curvas } = config;
  const relogio = criarRelogioDaVida();
  const pararDeOuvir: (() => void)[] = [];

  let comecou = false;
  let parado = false;
  let pausada = false;
  let leve = false;
  let ondulacao: Ondulacao | undefined;
  let imagemDoCasal: HTMLImageElement | undefined;
  /** Tempo do vento, em segundos: só anda enquanto ele desenha. */
  let tempo = 0;
  let inicioDaRajada = 0;
  let duracaoDaRajada = 0;

  function aoQuadro(_tempoDoTicker: number, intervaloEmMs: number): void {
    tempo += intervaloEmMs / 1000;
    if (tempo - inicioDaRajada >= duracaoDaRajada) {
      // A cada ciclo, uma rajada nova, mais longa ou mais curta: o vento nunca repete o mesmo compasso.
      inicioDaRajada = tempo;
      duracaoDaRajada = sortearEntre(parametros.vento.rajada, aleatorio);
    }
    // A força sobe e desce uma vez por rajada, do calmo ao vento inteiro.
    const [calmo, inteiro] = parametros.vento.forca;
    const onda = 0.5 + 0.5 * Math.sin((2 * Math.PI * (tempo - inicioDaRajada)) / duracaoDaRajada);
    ondulacao?.desenhar({ tempo, brilho: 0, forca: calmo + (inteiro - calmo) * onda });
  }

  function pararVento(): void {
    ticker.remove(aoQuadro);
    imagemDoCasal?.removeEventListener('load', iniciarVento);
    ondulacao?.destruir();
    ondulacao = undefined;
  }

  function iniciarVento(): void {
    if (parado || leve || ondulacao || !capacidades.suportaWebGL()) return;
    const respiro = raiz.querySelector<HTMLElement>('.casal__respiro');
    const imagem = respiro?.querySelector('img');
    if (!respiro || !imagem) return;
    if (imagem.naturalWidth === 0) {
      // A imagem do casal ainda não carregou: o vento espera o \`load\` (RF-22.2).
      imagemDoCasal = imagem;
      imagem.addEventListener('load', iniciarVento, { once: true });
      return;
    }
    const criada = criarOndulacao({
      conteiner: respiro,
      imagem,
      ajuste: 'contain',
      regioes: parametros.vento.regioes,
      onda: parametros.vento.onda,
      resolucao: completo.resolucaoDoVento,
      // O contexto se perdeu: o vento para e o canvas sai; a respiração e o brilho seguem (RF-19.7).
      aoPerderOContexto: pararVento,
    });
    if (!criada) return;
    ondulacao = criada;
    // O canvas só transpõe a região do vento e é transparente no resto: aparece já, sem salto.
    criada.canvas.style.opacity = '1';
    duracaoDaRajada = sortearEntre(parametros.vento.rajada, aleatorio);
    if (!pausada) ticker.add(aoQuadro);
  }

  function comecar(): void {
    if (comecou || parado) return;
    comecou = true;
    const brilho = raiz.querySelector<HTMLElement>('.casal__brilho');
    const respiro = raiz.querySelector<HTMLElement>('.casal__respiro');
    const { respiracao, brilho: halo } = parametros;
    if (brilho) {
      // O halo acende com o casal e depois respira entre o mínimo e o máximo.
      relogio.iniciar(
        gsap.fromTo(
          brilho,
          { opacity: 0 },
          { opacity: halo.minimo, duration: config.convite.casalAparece, ease: curvas.senoSaida },
        ),
      );
      relogio.iniciar(
        gsap.fromTo(
          brilho,
          { opacity: halo.minimo },
          {
            opacity: halo.maximo,
            duration: halo.periodo / 2,
            repeat: -1,
            yoyo: true,
            ease: curvas.suave,
          },
        ),
        config.convite.casalAparece,
      );
    }
    if (respiro) {
      relogio.iniciar(
        gsap.fromTo(
          respiro,
          { scaleY: 1 },
          {
            scaleY: respiracao.escala,
            duration: respiracao.periodo / 2,
            repeat: -1,
            yoyo: true,
            ease: curvas.suave,
          },
        ),
      );
    }
    iniciarVento();
  }

  return {
    iniciar(nivel) {
      leve = nivel === 'leve';
      // Com a carta já aberta (Pular, ou a vida retomada depois de uma pausa), o casal já está na tela.
      if (estado.fase === 'convite' || estado.fase === 'informacoes') {
        comecar();
        return;
      }
      pararDeOuvir.push(
        eventos.on('carta:abrindo', () => {
          relogio.depois(config.convite.casalEm, comecar);
        }),
        eventos.on('convite:pulado', comecar),
      );
    },

    // O casal sem vento: a respiração e o brilho ficam (SPEC-18, "Níveis").
    aoMudarNivel(nivel) {
      if (nivel !== 'leve') return;
      leve = true;
      pararVento();
    },

    pausar() {
      pausada = true;
      ticker.remove(aoQuadro);
      relogio.pausar();
    },

    retomar() {
      pausada = false;
      relogio.retomar();
      if (ondulacao) ticker.add(aoQuadro);
    },

    parar() {
      parado = true;
      for (const parar of pararDeOuvir.splice(0)) parar();
      relogio.parar();
      pararVento();
      // O casal volta a ficar parado e sem halo, como a pintura.
      const partes = raiz.querySelectorAll('.casal__brilho, .casal__respiro');
      gsap.set(partes, { clearProps: 'opacity,transform' });
    },
  };
}
