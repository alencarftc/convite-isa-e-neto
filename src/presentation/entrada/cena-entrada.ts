import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import type { EstadoConvite } from '@/application/estado-convite';
import type { Carregamento } from '@/application/use-cases/carregamento';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import type { EscolhaDeEntrada, EventosConvite } from '@/domain/eventos/eventos-convite';
import { urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';

import { animarNoNavegador } from '../animacao/animar-no-navegador';
import { curvaCss } from '../animacao/curva-css';
import { criar } from '../dom';
import { montarImagemDoSelo, soltarSelo } from '../selo/selo';

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
  let imagemDoSelo: HTMLImageElement | undefined;
  let linhaDaSaida: gsap.core.Timeline | undefined;
  /** A respiração da névoa, por animações do navegador (a névoa abre em `cena-bosque.ts`). */
  let animacoesDaNevoa: Animation[] = [];
  /** O clarão do selo ao se soltar, também uma animação do navegador. */
  let clarao: Animation | undefined;
  /** Resolve quando a imagem do selo chegou (ou falhou: não se espera por um selo que não vem). */
  let seloPronto: Promise<void> = Promise.resolve();
  /** Os itens da landing que estão entrando, cada um com o que fazer quando termina (ou quando o toque chega antes). */
  const entradasEmCurso = new Map<Animation, () => void>();
  /** A cena já saiu de cena (pulou ou foi desfeita): nada mais entra. */
  let encerrada = false;
  /** Resolve quando o selo estala e a névoa pode começar a abrir; sem o toque, já está resolvida. */
  let aoRomper: Promise<void> = Promise.resolve();

  /**
   * Selo I&D acima dos nomes, o mesmo do envelope (SPEC-16): decorativo, a tela inteira continua sendo o
   * toque. As siglas vêm em relevo na própria arte do selo, que fica inteiro até se soltar.
   */
  function montarSelo(entrada: HTMLElement): void {
    const selo = obter(entrada, '.entrada__selo');
    const brilho = criar('span', 'selo__brilho');
    brilho.setAttribute('aria-hidden', 'true');
    const imagem = montarImagemDoSelo(urlDaImagem(config.imagens.selo, estado.orientacao));
    // A imagem do selo não é crítica (SPEC-02 tem seis), mas a landing a espera um pouco (`entradaAguardaSelo`) para o selo, os nomes e
    // "Toque para entrar" entrarem juntos (11/11/2026): cada um aparecendo a seu tempo parecia desordenado.
    seloPronto =
      imagem.complete && imagem.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolver) => {
            const chegou = () => {
              resolver();
            };
            imagem.addEventListener('load', chegou, { once: true });
            imagem.addEventListener('error', chegou, { once: true });
          });
    selo.replaceChildren(brilho, imagem);
    gsap.set(brilho, { opacity: 0 });
    imagemDoSelo = imagem;
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
      // Os nomes, o selo e "Toque para entrar" nascem invisíveis e entram juntos (`revelarJuntos`); aqui só ficam o selo, que pulsa, e a
      // névoa.
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
      // A névoa respira por animações do navegador (11/11/2026, ADR-0044): são duas camadas de tela cheia, e animá-las por
      // JavaScript, quadro a quadro, pesava na entrada e na abertura. Sem `animate` (navegador antigo), o GSAP faz o mesmo.
      if (camadas.every((camada) => typeof camada.animate === 'function')) {
        animacoesDaNevoa = camadas.flatMap((camada, indice) => {
          const sentido = indice % 2 === 0 ? 1 : -1;
          return [
            animarNoNavegador(
              camada,
              [
                { transform: `translateX(${String(-4 * sentido)}%)` },
                { transform: `translateX(${String(4 * sentido)}%)` },
              ],
              {
                duration: duracoes.nevoaEmRepouso * 1000,
                direction: 'alternate',
                iterations: Number.POSITIVE_INFINITY,
                easing: curvaCss(curvas.suave),
                fill: 'both',
              },
            ),
            animarNoNavegador(camada, [{ opacity: 0.85 }, { opacity: 1 }], {
              duration: (duracoes.nevoaEmRepouso / 2) * 1000,
              direction: 'alternate',
              iterations: Number.POSITIVE_INFINITY,
              easing: curvaCss(curvas.suave),
              fill: 'both',
            }),
          ];
        });
        return;
      }
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

  function cancelarAnimacoesDoNavegador(): void {
    encerrada = true;
    for (const animacao of entradasEmCurso.keys()) {
      animacao.onfinish = null;
      animacao.cancel();
    }
    entradasEmCurso.clear();
    for (const animacao of animacoesDaNevoa) animacao.cancel();
    animacoesDaNevoa = [];
    clarao?.cancel();
    clarao = undefined;
  }

  /** Animação reduzida: sem selo que estala nem nomes que sobem, só o esmaecimento (SPEC-09). */
  function esmaecerTudo(entrada: HTMLElement): Promise<void> {
    gsap.to(
      [
        obter(entrada, '.entrada__nomes'),
        obterBotao(entrada, '.entrada__tocar'),
        obter(entrada, '.entrada__selo'),
      ],
      { opacity: 0, duration: duracoes.entradaSaida, ease: curvas.saida },
    );
    return Promise.resolve();
  }

  /**
   * O toque no selo (ADR-0012): ele cede sob o dedo, se solta inteiro (levanta, gira de leve e se desfaz) e
   * um clarão de luz sai de trás dele, os nomes sobem e se desfazem, e a névoa começa a abrir no instante em
   * que o selo se solta (`saida.nevoaEm`): a promessa devolvida resolve aí, e a linha continua sozinha.
   */
  function romperOSelo(entrada: HTMLElement): Promise<void> {
    const { saida } = config.entrada;
    const selo = obter(entrada, '.entrada__selo');
    const brilho = obter(entrada, '.selo__brilho');
    const nomes = obter(entrada, '.entrada__nomes');
    const tocar = obterBotao(entrada, '.entrada__tocar');
    // Só a pulsação para; o que ainda estava entrando vai ao fim.
    concluirEntrada();
    gsap.killTweensOf(selo, 'scale');
    const imagem = imagemDoSelo;
    return new Promise<void>((resolver) => {
      const linha = gsap
        .timeline()
        .to(
          selo,
          { scale: saida.aperto.escala, duration: saida.aperto.duracao, ease: curvas.saida },
          0,
        )
        .to(tocar, { opacity: 0, duration: duracoes.entradaSaida, ease: curvas.saida }, 0)
        .to(
          selo,
          { scale: config.entrada.seloEscala, duration: saida.solta.duracao, ease: curvas.saida },
          saida.aperto.duracao,
        )
        .to(
          nomes,
          {
            opacity: 0,
            scale: saida.nomes.escala,
            y: saida.nomes.deslocamento,
            duration: saida.nomes.duracao,
            ease: curvas.saida,
          },
          saida.aperto.duracao,
        )
        .call(resolver, [], saida.nevoaEm);
      if (imagem) {
        linha.add(
          soltarSelo(imagem, { ...saida.solta, curva: curvas.saida }),
          saida.aperto.duracao,
        );
      }
      // O clarão que sai de trás do selo (um gradiente grande que cresce até 3,4 vezes) é uma animação do navegador: por JavaScript,
      // quadro a quadro, pesava justamente no toque (11/11/2026, ADR-0044). Sobe, atinge o máximo a 35% e se desfaz crescendo.
      if (typeof brilho.animate === 'function') {
        clarao = animarNoNavegador(
          brilho,
          [
            { opacity: 0, transform: 'scale(0.3)', easing: curvaCss(curvas.saida) },
            {
              opacity: saida.brilho.opacidade,
              transform: `scale(${String(saida.brilho.escala * 0.6)})`,
              offset: 0.35,
              easing: curvaCss(curvas.senoSaida),
            },
            { opacity: 0, transform: `scale(${String(saida.brilho.escala)})` },
          ],
          {
            duration: saida.brilho.duracao * 1000,
            delay: saida.aperto.duracao * 1000,
            fill: 'both',
          },
        );
      } else {
        linha
          .fromTo(
            brilho,
            { opacity: 0, scale: 0.3 },
            {
              opacity: saida.brilho.opacidade,
              scale: saida.brilho.escala * 0.6,
              duration: saida.brilho.duracao * 0.35,
              ease: curvas.saida,
            },
            saida.aperto.duracao,
          )
          .to(
            brilho,
            {
              opacity: 0,
              scale: saida.brilho.escala,
              duration: saida.brilho.duracao * 0.65,
              ease: curvas.senoSaida,
            },
            saida.aperto.duracao + saida.brilho.duracao * 0.35,
          );
      }
      linhaDaSaida = linha;
    });
  }

  /** O estado final de um item que entrou: visível e no lugar (o que o navegador mostrava ao fim da animação). */
  function aparecerDeVez(elemento: HTMLElement, sobe: boolean): void {
    elemento.style.opacity = '1';
    if (sobe) elemento.style.transform = '';
  }

  /**
   * Um item da landing entrando, delicado e fluido (11/11/2026): esmaece e, se `sobe`, sobe alguns pixels, numa animação do navegador,
   * com a mesma duração e a mesma curva de todos os outros, para entrarem juntos. Ao fim o estado final vai para o estilo (`noEstilo`)
   * e a animação é cancelada. Sem `animate` ou com animação reduzida, aparece de uma vez.
   */
  function entrarSuave(elemento: HTMLElement, sobe: boolean, noEstilo = true): void {
    if (estado.reduzido || typeof elemento.animate !== 'function') {
      if (noEstilo) aparecerDeVez(elemento, sobe);
      return;
    }
    const quadros: Keyframe[] = sobe
      ? [
          { opacity: 0, transform: `translateY(${String(config.entrada.sobe)}px)` },
          { opacity: 1, transform: 'translateY(0px)' },
        ]
      : [{ opacity: 0 }, { opacity: 1 }];
    const animacao = animarNoNavegador(elemento, quadros, {
      duration: duracoes.entradaJunto * 1000,
      easing: curvaCss(curvas.saida),
      fill: 'both',
    });
    const terminar = () => {
      entradasEmCurso.delete(animacao);
      animacao.onfinish = null;
      if (noEstilo) aparecerDeVez(elemento, sobe);
      animacao.cancel();
    };
    entradasEmCurso.set(animacao, terminar);
    animacao.onfinish = terminar;
  }

  /** O toque chegou no meio da entrada: o que ainda estava entrando vai direto ao fim, para a saída partir do estado certo. */
  function concluirEntrada(): void {
    for (const terminar of [...entradasEmCurso.values()]) terminar();
  }

  /**
   * A landing inteira entra de uma vez: os nomes, o selo (se a imagem chegou), "Toque para entrar" e os botões fixos de cima (que a CSS
   * esconde enquanto a página carrega) aparecem no mesmo instante, na mesma duração e na mesma curva.
   */
  function revelarJuntos(entrada: HTMLElement, comSelo: boolean): void {
    const tocar = obterBotao(entrada, '.entrada__tocar');
    tocar.hidden = false;
    entrarSuave(obter(entrada, '.entrada__nomes'), true);
    entrarSuave(tocar, true);
    if (comSelo) entrarSuave(obter(entrada, '.entrada__selo'), false);
    for (const botao of document.querySelectorAll<HTMLElement>('.botao-som, .botao-pular')) {
      entrarSuave(botao, false, false);
    }
  }

  /** Espera a imagem do selo no máximo `entradaAguardaSelo`; diz se ela chegou a tempo de entrar junto com o resto. */
  function aguardarSelo(): Promise<boolean> {
    return new Promise((resolver) => {
      const limite = gsap.delayedCall(duracoes.entradaAguardaSelo, () => {
        resolver(false);
      });
      void seloPronto.then(() => {
        limite.kill();
        resolver(true);
      });
    });
  }

  /**
   * Mostra "Toque para entrar" e espera o toque. "Pular para o convite" não é daqui: é um botão fixo
   * que vale em toda a abertura, a partir da segunda visita (SPEC-14).
   */
  async function esperarToque(entrada: HTMLElement): Promise<EscolhaDeEntrada> {
    const tocar = obterBotao(entrada, '.entrada__tocar');

    // Tudo entra junto (os nomes, o selo, "Toque para entrar" e os botões de cima), no mesmo instante em que a fase muda (a CSS mostra os
    // botões fixos pela fase): se o selo demorar mais que `entradaAguardaSelo`, a landing entra sem ele e ele chega sozinho, com a mesma
    // suavidade.
    const comSelo = await aguardarSelo();
    if (encerrada) return 'entrar';
    revelarJuntos(entrada, comSelo);
    if (!comSelo) {
      void seloPronto.then(() => {
        if (!encerrada) entrarSuave(obter(entrada, '.entrada__selo'), false);
      });
    }
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
          aoRomper = estado.reduzido ? esmaecerTudo(entrada) : romperOSelo(entrada);
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
      encerrada = false;
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
      await Promise.all([esperarBosque(entrada), aoRomper]);
      return escolha;
    },

    skip() {
      linhaDaSaida?.kill();
      cancelarAnimacoesDoNavegador();
      (secao ?? raiz.querySelector<HTMLElement>('.entrada'))?.setAttribute('hidden', '');
    },

    destroy() {
      linhaDaSaida?.kill();
      cancelarAnimacoesDoNavegador();
      pararDeOuvirGiro?.();
      animacoes?.revert();
      ouvintes?.abort();
      secao?.removeAttribute('hidden');
    },
  };
}
