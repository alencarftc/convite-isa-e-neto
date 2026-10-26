import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { EstadoConvite } from '@/application/estado-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';

export interface DependenciasBotaoSom {
  readonly raiz: HTMLElement;
  readonly dicas: ConteudoConvite['dicas'];
  readonly estado: EstadoConvite;
  readonly eventos: BarramentoEventos<EventosConvite>;
}

const NAMESPACE_SVG = 'http://www.w3.org/2000/svg';

/** Caixa do alto-falante, comum aos dois ícones; as ondas ou o corte vêm em seguida. */
const CAIXA = 'M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z';
const ONDAS = 'M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11';
const CORTE = 'M16 9.5l5 5m0-5l-5 5';

function criarIcone(modificador: 'ligado' | 'desligado', tracos: readonly string[]): SVGSVGElement {
  const svg = document.createElementNS(NAMESPACE_SVG, 'svg');
  svg.setAttribute('class', `botao-som__icone botao-som__icone--${modificador}`);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const traco of tracos) {
    const caminho = document.createElementNS(NAMESPACE_SVG, 'path');
    caminho.setAttribute('d', traco);
    svg.append(caminho);
  }
  return svg;
}

/**
 * Botão de som fixo no canto superior direito, desde a entrada (SPEC-08, RF-08.5). É um
 * `<button aria-pressed>` com nome fixo ("Som"); o texto "Som ligado"/"Som desligado" aparece ao
 * passar o cursor (`title`). Só emite `som:alterado`: quem muda o estado e o áudio é o caso de uso.
 * Devolve a função que remove o botão e os ouvintes.
 */
export function montarBotaoSom({ raiz, dicas, estado, eventos }: DependenciasBotaoSom): () => void {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'botao-som';
  botao.setAttribute('aria-label', dicas.som);
  botao.append(criarIcone('ligado', [CAIXA, ONDAS]), criarIcone('desligado', [CAIXA, CORTE]));

  function refletir(): void {
    botao.setAttribute('aria-pressed', String(estado.somLigado));
    botao.title = estado.somLigado ? dicas.somLigado : dicas.somDesligado;
  }

  function alternar(): void {
    eventos.emit('som:alterado', { ligado: !estado.somLigado });
  }

  refletir();
  botao.addEventListener('click', alternar);
  const pararDeOuvir = estado.aoMudar(refletir);
  // Primeiro filho do contêiner: na ordem do Tab vem antes das etapas (SPEC-14, RF-14.3).
  raiz.prepend(botao);

  return () => {
    pararDeOuvir();
    botao.removeEventListener('click', alternar);
    botao.remove();
  };
}
