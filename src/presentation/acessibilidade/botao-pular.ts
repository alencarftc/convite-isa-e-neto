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
 * "Pular para o convite" sempre à mão a partir da segunda visita (SPEC-14, RF-14.1 e RF-14.2): um só
 * botão fixo no canto superior esquerdo (o som fica no direito), da entrada até a carta aberta, em
 * vez de existir só na tela de entrada. Some no estado final e no modo de segurança (RNF-14.2).
 *
 * A primeira visita é lida **uma vez, ao montar**: o convite registra a visita quando a carta abre
 * (`registrarVisita`), ainda durante a primeira abertura, e o botão não pode aparecer nesse momento.
 * Devolve a função que o remove.
 */
export function montarBotaoPular({
  corpo,
  conteudo,
  estado,
  aoAcionar,
}: DependenciasDoBotaoPular): () => void {
  const jaVisitado = estado.visitado;

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'botao-pular';
  botao.textContent = conteudo.dicas.pular;

  function refletir(): void {
    botao.hidden = !jaVisitado || ehFaseFinal(estado.fase);
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
