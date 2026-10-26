import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import type { EstadoConvite } from '@/application/estado-convite';
import type { Carregamento } from '@/application/use-cases/carregamento';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import type { EscolhaDeEntrada, EventosConvite } from '@/domain/eventos/eventos-convite';
import { urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';

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

  /** Selo I&D acima dos nomes, o mesmo do envelope (SPEC-16): decorativo, a tela inteira continua sendo o toque. */
  function montarSelo(entrada: HTMLElement): void {
    const imagem = document.createElement('img');
    imagem.className = 'entrada__selo-imagem';
    imagem.alt = '';
    imagem.draggable = false;
    const selo = obter(entrada, '.entrada__selo');
    // A imagem do selo não é crítica (SPEC-02 tem seis): o selo aparece quando ela chega, sem
    // atrasar o "Toque para entrar" e sem mexer no lugar dos nomes, que o HTML já reservou.
    imagem.addEventListener(
      'load',
      () => {
        gsap.to(selo, { opacity: 1, duration: duracoes.entradaChamada, ease: curvas.saida });
      },
      { once: true },
    );
    imagem.src = urlDaImagem(config.imagens.selo, estado.orientacao);
    const iniciais = document.createElement('span');
    iniciais.className = 'entrada__iniciais';
    iniciais.textContent = conteudo.envelope.iniciais;
    selo.replaceChildren(imagem, iniciais);
  }

  function iniciar(): HTMLElement {
    const entrada = raiz.querySelector<HTMLElement>('.entrada');
    if (!entrada) throw new Error('index.html sem a seção ".entrada" (SPEC-02, RF-02.1)');

    obter(entrada, '.entrada__nomes').textContent = conteudo.entrada.nomes;
    obter(entrada, '.entrada__chamada').textContent = conteudo.entrada.tocar;
    obter(entrada, '.entrada__volume').textContent = conteudo.entrada.volume;
    obter(entrada, '.entrada__aguarde').textContent = conteudo.entrada.aguarde;
    montarSelo(entrada);
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
      gsap.to('.entrada__selo', {
        scale: config.entrada.seloEscala,
        duration: config.entrada.seloPeriodo / 2,
        ease: curvas.suave,
        repeat: -1,
        yoyo: true,
      });
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

  /**
   * Mostra "Toque para entrar" e espera o toque. "Pular para o convite" não é daqui: é um botão fixo
   * que vale em toda a abertura, a partir da segunda visita (SPEC-14).
   */
  function esperarToque(entrada: HTMLElement): Promise<EscolhaDeEntrada> {
    const tocar = obterBotao(entrada, '.entrada__tocar');
    const selo = obter(entrada, '.entrada__selo');

    tocar.hidden = false;
    gsap.fromTo(
      tocar,
      { opacity: 0 },
      { opacity: 1, duration: duracoes.entradaChamada, ease: curvas.saida },
    );
    estado.definirFase('aguardando-entrada');

    ouvintes = new AbortController();
    const { signal } = ouvintes;
    return new Promise((resolver) => {
      // Um toque só conta uma vez; o gesto libera o áudio dentro do próprio evento (RF-02.6).
      tocar.addEventListener(
        'click',
        () => {
          if (tocar.disabled) return;
          tocar.disabled = true;
          eventos.emit('entrada:tocou', { escolha: 'entrar' });
          gsap.to([obter(entrada, '.entrada__nomes'), tocar, selo], {
            opacity: 0,
            duration: duracoes.entradaSaida,
            ease: curvas.saida,
          });
          resolver('entrar');
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
      // Animação reduzida vai direto ao final: o bosque nem chega a ser mostrado.
      if (estado.reduzido) return escolha;
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
