import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import type { EstadoConvite } from '@/application/estado-convite';
import type { Carregamento } from '@/application/use-cases/carregamento';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import type { EscolhaDeEntrada, EventosConvite } from '@/domain/eventos/eventos-convite';

export interface DependenciasDaEntrada {
  readonly raiz: HTMLElement;
  readonly conteudo: ConteudoConvite;
  readonly config: ConfigConvite;
  readonly estado: EstadoConvite;
  readonly eventos: BarramentoEventos<EventosConvite>;
  readonly carregamento: Carregamento;
}

function obter(secao: HTMLElement, seletor: string): HTMLElement {
  const elemento = secao.querySelector<HTMLElement>(seletor);
  if (!elemento) throw new Error(`index.html sem "${seletor}" na entrada (SPEC-02, RF-02.1)`);
  return elemento;
}

function obterBotao(secao: HTMLElement, seletor: string): HTMLButtonElement {
  const botao = secao.querySelector<HTMLButtonElement>(seletor);
  if (!botao) throw new Error(`index.html sem "${seletor}" na entrada (SPEC-02, RF-02.1)`);
  return botao;
}

/**
 * Cena de entrada (SPEC-02): névoa em repouso e nomes desde o primeiro quadro, "Toque para entrar"
 * quando as imagens críticas chegam (ou em `limiteCritico`), e a espera pelo bosque depois do toque.
 *
 * O HTML inicial já traz a seção `.entrada`; a cena a adota, reescreve os rótulos a partir de
 * `content` e a anima. A névoa continua no DOM depois do toque: quem a dissolve é o bosque (SPEC-03).
 * Se o bosque não ficar pronto, `run()` rejeita e o orquestrador entra no modo de segurança.
 */
export function criarCenaEntrada(dependencias: DependenciasDaEntrada): Cena<EscolhaDeEntrada> {
  const { raiz, conteudo, config, estado, eventos, carregamento } = dependencias;
  const { duracoes, curvas } = config;

  let secao: HTMLElement | undefined;
  let animacoes: gsap.Context | undefined;
  let pararDeOuvirGiro: (() => void) | undefined;
  let ouvintes: AbortController | undefined;

  function iniciar(): HTMLElement {
    const entrada = raiz.querySelector<HTMLElement>('.entrada');
    if (!entrada) throw new Error('index.html sem a seção ".entrada" (SPEC-02, RF-02.1)');

    obter(entrada, '.entrada__nomes').textContent = conteudo.entrada.nomes;
    obter(entrada, '.entrada__chamada').textContent = conteudo.entrada.tocar;
    obter(entrada, '.entrada__volume').textContent = conteudo.entrada.volume;
    obter(entrada, '.entrada__aguarde').textContent = conteudo.entrada.aguarde;
    obter(entrada, '.entrada__pular').textContent = conteudo.dicas.pular;
    return entrada;
  }

  function animarRepouso(entrada: HTMLElement): gsap.Context {
    return gsap.context(() => {
      // Nomes: surgem 0,2 s depois do primeiro quadro; com animação reduzida, só esmaecem.
      gsap.fromTo(
        '.entrada__nomes',
        { opacity: 0, y: estado.reduzido ? 0 : 12 },
        {
          opacity: 1,
          y: 0,
          duration: duracoes.entradaNomes,
          delay: duracoes.entradaNomesAtraso,
          ease: curvas.saida,
        },
      );
      // Névoa: duas camadas em sentidos opostos, a opacidade respirando entre 0,85 e 1. Com
      // animação reduzida ela fica parada.
      if (estado.reduzido) return;
      const camadas = gsap.utils.toArray<HTMLElement>('.nevoa > span');
      camadas.forEach((camada, indice) => {
        const sentido = indice % 2 === 0 ? 1 : -1;
        gsap.fromTo(
          camada,
          { xPercent: -4 * sentido },
          {
            xPercent: 4 * sentido,
            duration: duracoes.nevoaEmRepouso,
            ease: curvas.suave,
            repeat: -1,
            yoyo: true,
          },
        );
        gsap.fromTo(
          camada,
          { opacity: 0.85 },
          {
            opacity: 1,
            duration: duracoes.nevoaEmRepouso / 2,
            ease: curvas.suave,
            repeat: -1,
            yoyo: true,
          },
        );
      });
    }, entrada);
  }

  /** Mostra "Toque para entrar" (e "Pular", a partir da segunda visita) e espera o toque. */
  function esperarToque(entrada: HTMLElement): Promise<EscolhaDeEntrada> {
    const tocar = obterBotao(entrada, '.entrada__tocar');
    const pular = obterBotao(entrada, '.entrada__pular');

    tocar.hidden = false;
    pular.hidden = !estado.visitado;
    gsap.fromTo(
      [tocar, pular],
      { opacity: 0 },
      { opacity: 1, duration: duracoes.entradaChamada, ease: curvas.saida },
    );
    estado.definirFase('aguardando-entrada');

    ouvintes = new AbortController();
    const { signal } = ouvintes;
    return new Promise((resolver) => {
      // Um toque só conta uma vez; o gesto libera o áudio dentro do próprio evento (RF-02.6).
      const escolher = (escolha: EscolhaDeEntrada) => {
        if (tocar.disabled) return;
        tocar.disabled = true;
        pular.disabled = true;
        eventos.emit('entrada:tocou', { escolha });
        gsap.to([obter(entrada, '.entrada__nomes'), tocar, pular], {
          opacity: 0,
          duration: duracoes.entradaSaida,
          ease: curvas.saida,
        });
        resolver(escolha);
      };
      tocar.addEventListener(
        'click',
        () => {
          escolher('entrar');
        },
        { signal },
      );
      pular.addEventListener(
        'click',
        () => {
          escolher('pular');
        },
        { signal },
      );
    });
  }

  /** Depois do toque, espera o bosque; sem ele em `limiteSeguranca`, ou com arte ausente, falha. */
  async function esperarBosque(entrada: HTMLElement): Promise<void> {
    const aguarde = obter(entrada, '.entrada__aguarde');
    const aviso = gsap.delayedCall(duracoes.avisoDeEspera, () => {
      aguarde.hidden = false;
      gsap.fromTo(aguarde, { opacity: 0 }, { opacity: 1, duration: duracoes.entradaChamada });
    });
    carregamento.secundario(estado.orientacao);

    const situacao = await carregamento.aguardarBosque(estado.orientacao);
    aviso.kill();
    aguarde.hidden = true;

    if (situacao === 'ausente') {
      throw new Error('Imagem crítica ausente depois da nova tentativa (SPEC-02, RF-02.3)');
    }
    if (situacao === 'demorou') {
      throw new Error(
        `O bosque não ficou pronto em ${String(duracoes.limiteSeguranca)} s (RF-02.8)`,
      );
    }
  }

  return {
    init() {
      secao = iniciar();
      animacoes = animarRepouso(secao);
      // Girou antes do toque: baixa também as imagens da nova orientação (RF-02.9).
      pararDeOuvirGiro = estado.aoMudar(() => {
        if (estado.fase === 'carregando' || estado.fase === 'aguardando-entrada') {
          void carregamento.criticoPronto(estado.orientacao);
        }
      });
    },

    async run() {
      const entrada = secao ?? iniciar();
      await carregamento.critico(estado.orientacao);
      const escolha = await esperarToque(entrada);
      // Pular e animação reduzida vão direto ao final: o bosque nem chega a ser mostrado.
      if (escolha === 'pular' || estado.reduzido) return escolha;
      await esperarBosque(entrada);
      return escolha;
    },

    skip() {
      (secao ?? raiz.querySelector<HTMLElement>('.entrada'))?.setAttribute('hidden', '');
    },

    destroy() {
      pararDeOuvirGiro?.();
      animacoes?.revert();
      ouvintes?.abort();
      secao?.removeAttribute('hidden');
    },
  };
}
