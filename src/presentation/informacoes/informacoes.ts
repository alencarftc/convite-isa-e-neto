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

function criarLink(classe: string, texto: string, href: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = classe;
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = texto;
  return link;
}

/**
 * Monta o bloco "Informações" (SPEC-07): contagem, agradecimento e botões.
 * O estado é recalculado ao montar, a cada virada de minuto e quando o
 * convidado volta ao aplicativo (RF-07.3).
 */
export function montarInformacoes(dependencias: DependenciasInformacoes): InformacoesMontadas {
  const { raiz, conteudo, config, obterInformacoes, relogio } = dependencias;

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

  secao.append(cartaoContagem, cartaoAgradecimento, cartaoAcoes);

  function atualizar(): void {
    const informacoes = obterInformacoes();

    cartaoContagem.hidden = informacoes.contagem === null;
    textoContagem.textContent = informacoes.contagem ?? '';

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

  return {
    atualizar,
    destruir() {
      clearTimeout(temporizador);
      document.removeEventListener('visibilitychange', aoVoltarParaOConvite);
      secao.remove();
    },
  };
}
