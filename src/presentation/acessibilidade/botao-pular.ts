import type { EstadoConvite } from '@/application/estado-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import { ehFaseFinal } from '@/domain/fase/fase';

export interface DependenciasDoBotaoPular {
  /** Onde o botão entra: antes do convite, para ficar logo depois do atalho na ordem do Tab (RF-14.3). */
  readonly corpo: HTMLElement;
  readonly conteudo: ConteudoConvite;
  readonly estado: EstadoConvite;
  /** O que fazer ao acionar: o mesmo destino do atalho "Ir direto ao convite". */
  readonly aoAcionar: () => void;
}

/**
 * "Pular para o convite" sempre à mão (SPEC-14, RF-14.1; ADR-0012): um só botão fixo no canto
 * superior esquerdo (o som fica no direito), da entrada até a carta aberta, já na primeira visita.
 * É a única forma de abreviar a abertura: nenhum toque na cena acelera ou pula uma animação, então
 * o convidado escolhe ver tudo ou ir direto. Some no estado final e no modo de segurança (RNF-14.2).
 * Devolve a função que o remove.
 */
export function montarBotaoPular({
  corpo,
  conteudo,
  estado,
  aoAcionar,
}: DependenciasDoBotaoPular): () => void {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'botao-pular';
  botao.textContent = conteudo.dicas.pular;

  function refletir(): void {
    botao.hidden = ehFaseFinal(estado.fase);
  }

  refletir();
  botao.addEventListener('click', aoAcionar);
  const pararDeOuvir = estado.aoMudar(refletir);
  corpo.prepend(botao);

  return () => {
    pararDeOuvir();
    botao.removeEventListener('click', aoAcionar);
    botao.remove();
  };
}
