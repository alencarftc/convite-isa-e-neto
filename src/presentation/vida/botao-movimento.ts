import type { EstadoConvite } from '@/application/estado-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';

export interface DependenciasBotaoMovimento {
  readonly corpo: HTMLElement;
  readonly dicas: Pick<ConteudoConvite['dicas'], 'pausarAnimacao' | 'retomarAnimacao'>;
  readonly estado: EstadoConvite;
}

const NAMESPACE_SVG = 'http://www.w3.org/2000/svg';

/** Duas barras (pausar) e um triângulo (retomar), em 24 × 24, como os ícones do botão de som. */
const PAUSAR = 'M8.5 5.5v13M15.5 5.5v13';
const RETOMAR = 'M8 5.5v13l10.5-6.5z';

function criarIcone(modificador: 'pausar' | 'retomar', traco: string): SVGSVGElement {
  const svg = document.createElementNS(NAMESPACE_SVG, 'svg');
  svg.setAttribute('class', `botao-movimento__icone botao-movimento__icone--${modificador}`);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const caminho = document.createElementNS(NAMESPACE_SVG, 'path');
  caminho.setAttribute('d', traco);
  svg.append(caminho);
  return svg;
}

/**
 * "Pausar animação" (SPEC-18, RF-18.9; WCAG 2.2.2): ao lado do botão de som, alterna entre pausar e retomar
 * todo o movimento de ambiente e lembra a escolha para a próxima visita (`estado.definirMovimento`). O nome
 * acessível muda com o estado ("Pausar animação" ↔ "Retomar animação"); por isso o botão não usa
 * `aria-pressed`, que com o nome trocado seria lido duas vezes. Devolve a função que o remove.
 */
export function montarBotaoMovimento({
  corpo,
  dicas,
  estado,
}: DependenciasBotaoMovimento): () => void {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'botao-movimento';
  botao.append(criarIcone('pausar', PAUSAR), criarIcone('retomar', RETOMAR));

  function refletir(): void {
    const ligado = estado.movimentoLigado;
    const nome = ligado ? dicas.pausarAnimacao : dicas.retomarAnimacao;
    botao.setAttribute('aria-label', nome);
    botao.title = nome;
    botao.setAttribute('data-pausado', String(!ligado));
  }

  function alternar(): void {
    estado.definirMovimento(!estado.movimentoLigado);
  }

  refletir();
  botao.addEventListener('click', alternar);
  const pararDeOuvir = estado.aoMudar(refletir);
  // Logo depois do botão de som, na ordem do Tab (SPEC-14, RF-14.3); sem ele, no começo do contêiner.
  const som = corpo.querySelector('.botao-som');
  if (som) som.after(botao);
  else corpo.prepend(botao);

  return () => {
    pararDeOuvir();
    botao.removeEventListener('click', alternar);
    botao.remove();
  };
}
