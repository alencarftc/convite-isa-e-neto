import type { EstadoConvite } from '@/application/estado-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import { ehFaseFinal } from '@/domain/fase/fase';

export interface DependenciasDoAtalho {
  /** Onde o botão entra: o primeiro elemento focável da página (RF-09.4), normalmente o `<body>`. */
  readonly corpo: HTMLElement;
  readonly conteudo: ConteudoConvite;
  readonly estado: EstadoConvite;
  /** O que fazer ao acionar: o mesmo destino de "Pular para o convite". */
  readonly aoAcionar: () => void;
}

/**
 * "Ir direto ao convite" (SPEC-09, RF-09.4): atalho para leitor de tela e teclado, o primeiro
 * elemento focável da página. Fica fora da vista e só aparece ao receber foco, então não muda a regra
 * de "Pular para o convite" só a partir da segunda visita. Quando o convite chega ao estado final ou
 * ao modo de segurança ele sai do Tab, pois já não leva a lugar nenhum. Devolve a função que o remove.
 */
export function montarAtalhoParaOConvite({
  corpo,
  conteudo,
  estado,
  aoAcionar,
}: DependenciasDoAtalho): () => void {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'visualmente-oculto atalho';
  botao.textContent = conteudo.dicas.atalho;

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
