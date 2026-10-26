import gsap from 'gsap';

import type { Relogio } from '@/application/ports/relogio';
import type { InformacoesDoMomento } from '@/application/use-cases/obter-informacoes';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import { msAteProximoMinuto } from '@/domain/tempo/tempo';

export interface DependenciasInformacoes {
  readonly raiz: HTMLElement;
  readonly conteudo: ConteudoConvite;
  readonly config: ConfigConvite;
  readonly obterInformacoes: () => InformacoesDoMomento;
  readonly relogio: Relogio;
  /** Os cartões surgem ao entrar na tela (SPEC-07); sem isso, já nascem visíveis. */
  readonly animar?: boolean;
}

export interface InformacoesMontadas {
  /** Recalcula e redesenha agora. */
  atualizar(): void;
  /** Remove o bloco, o temporizador e os ouvintes. */
  destruir(): void;
}

function criarCartao(modificador: string): HTMLDivElement {
  const cartao = document.createElement('div');
  cartao.className = `cartao ${modificador}`;
  return cartao;
}

function criarParagrafo(classe: string, texto: string): HTMLParagraphElement {
  const paragrafo = document.createElement('p');
  paragrafo.className = classe;
  paragrafo.textContent = texto;
  return paragrafo;
}

function criarTitulo(texto: string): HTMLHeadingElement {
  const titulo = document.createElement('h3');
  titulo.className = 'cartao__titulo';
  titulo.textContent = texto;
  return titulo;
}

function criarLink(classe: string, texto: string, href: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = classe;
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = texto;
  return link;
}

/** Escreve a contagem com os números em destaque (`<strong>`), sem mudar o texto lido. */
function escreverContagem(paragrafo: HTMLElement, texto: string): void {
  const partes = texto.split(/(\d+)/).filter((parte) => parte !== '');
  paragrafo.replaceChildren(
    ...partes.map((parte) => {
      if (!/^\d+$/.test(parte)) return document.createTextNode(parte);
      const numero = document.createElement('strong');
      numero.textContent = parte;
      return numero;
    }),
  );
}

/**
 * Cada cartão surge quando entra na tela: `opacity` 0→1 e `y` 16→0, em `duracoes.cartoes`
 * (SPEC-07, "Estilo"). Sem `IntersectionObserver`, tudo já aparece. Devolve a função que desliga.
 */
function revelarAoEntrarNaTela(cartoes: readonly HTMLElement[], config: ConfigConvite): () => void {
  const { duracoes, curvas, movimento } = config;
  if (typeof IntersectionObserver === 'undefined') return () => undefined;

  gsap.set(cartoes, { opacity: 0, y: movimento.deslocamentoDosCartoes });
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        gsap.to(entrada.target, {
          opacity: 1,
          y: 0,
          duration: duracoes.cartoes,
          ease: curvas.saida,
        });
        observador.unobserve(entrada.target);
      }
    },
    { threshold: 0.15 },
  );
  for (const cartao of cartoes) observador.observe(cartao);
  return () => {
    observador.disconnect();
  };
}

/**
 * Monta o bloco "Informações" (SPEC-07): contagem, agradecimento (depois do casamento), mensagem do
 * casal, traje e botões. O estado é recalculado ao montar, a cada virada de minuto e quando o
 * convidado volta ao aplicativo (RF-07.3).
 */
export function montarInformacoes(dependencias: DependenciasInformacoes): InformacoesMontadas {
  const { raiz, conteudo, config, obterInformacoes, relogio, animar = false } = dependencias;

  const secao = document.createElement('section');
  secao.className = 'informacoes';
  secao.setAttribute('aria-label', conteudo.rotulos.informacoes);

  const cartaoContagem = criarCartao('cartao--contagem');
  const textoContagem = document.createElement('p');
  textoContagem.setAttribute('aria-live', 'off'); // RNF-07.3: sem anúncio a cada minuto
  cartaoContagem.append(textoContagem);

  const cartaoAgradecimento = criarCartao('cartao--agradecimento');
  const textoAgradecimento = document.createElement('p');
  cartaoAgradecimento.append(textoAgradecimento);

  const cartaoMensagem = criarCartao('cartao--mensagem');
  cartaoMensagem.append(
    criarTitulo(conteudo.rotulos.mensagem),
    ...conteudo.mensagem.paragrafos.map((paragrafo) =>
      criarParagrafo('mensagem__paragrafo', paragrafo),
    ),
    criarParagrafo('mensagem__verso', conteudo.mensagem.versoLouvor),
    criarParagrafo('mensagem__assinatura', conteudo.mensagem.assinatura),
  );

  const cartaoTraje = criarCartao('cartao--traje');
  cartaoTraje.append(
    criarTitulo(conteudo.rotulos.traje),
    criarParagrafo('traje__texto', conteudo.dressCode),
  );

  const cartaoAcoes = criarCartao('cartao--acoes');
  const botaoConfirmar = criarLink(
    'botao botao--principal',
    conteudo.botoes.confirmar,
    config.links.formulario,
  );
  const avisoPrazo = criarParagrafo('acoes__prazo', conteudo.botoes.prazo);
  const avisoEncerrado = criarParagrafo('acoes__encerrado', conteudo.botoes.encerrado);
  const botaoComoChegar = criarLink(
    'botao botao--secundario',
    conteudo.botoes.comoChegar,
    config.links.mapa,
  );
  cartaoAcoes.append(botaoConfirmar, avisoPrazo, avisoEncerrado, botaoComoChegar);

  const cartoes = [cartaoContagem, cartaoAgradecimento, cartaoMensagem, cartaoTraje, cartaoAcoes];
  secao.append(...cartoes);

  function atualizar(): void {
    const informacoes = obterInformacoes();

    cartaoContagem.hidden = informacoes.contagem === null;
    escreverContagem(textoContagem, informacoes.contagem ?? '');

    cartaoAgradecimento.hidden = informacoes.agradecimento === null;
    textoAgradecimento.textContent = informacoes.agradecimento ?? '';

    botaoConfirmar.hidden = informacoes.confirmacao !== 'aberta';
    avisoPrazo.hidden = informacoes.confirmacao !== 'aberta';
    avisoEncerrado.hidden = informacoes.confirmacao !== 'encerrada';
    botaoComoChegar.hidden = !informacoes.comoChegarVisivel;
    cartaoAcoes.hidden = informacoes.confirmacao === 'oculta' && !informacoes.comoChegarVisivel;
  }

  let temporizador: ReturnType<typeof setTimeout> | undefined;
  function agendarProximaVirada(): void {
    temporizador = setTimeout(() => {
      atualizar();
      agendarProximaVirada();
    }, msAteProximoMinuto(relogio.agora()));
  }

  function aoVoltarParaOConvite(): void {
    if (document.visibilityState === 'visible') atualizar();
  }

  document.addEventListener('visibilitychange', aoVoltarParaOConvite);
  atualizar();
  agendarProximaVirada();
  raiz.append(secao);
  const pararDeRevelar = animar ? revelarAoEntrarNaTela(cartoes, config) : () => undefined;

  return {
    atualizar,
    destruir() {
      clearTimeout(temporizador);
      pararDeRevelar();
      document.removeEventListener('visibilitychange', aoVoltarParaOConvite);
      secao.remove();
    },
  };
}
