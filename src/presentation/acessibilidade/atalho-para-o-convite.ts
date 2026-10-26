import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';

export interface DependenciasDoAtalho {
  /** Onde o botão entra: o primeiro elemento focável da página (RF-09.4), normalmente o `<body>`. */
  readonly corpo: HTMLElement;
  readonly conteudo: ConteudoConvite;
  /** O que fazer ao acionar: o mesmo destino de "Pular para o convite". */
  readonly aoAcionar: () => void;
}

/**
 * "Ir direto ao convite" (SPEC-09, RF-09.4): atalho para leitor de tela e teclado, o primeiro
 * elemento focável da página. Fica fora da vista e só aparece ao receber foco, então não muda a regra
 * de "Pular para o convite" só a partir da segunda visita. Devolve a função que o remove.
 */
export function montarAtalhoParaOConvite({
  corpo,
  conteudo,
  aoAcionar,
}: DependenciasDoAtalho): () => void {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'visualmente-oculto atalho';
  botao.textContent = conteudo.dicas.atalho;
  botao.addEventListener('click', aoAcionar);
  corpo.prepend(botao);

  return () => {
    botao.removeEventListener('click', aoAcionar);
    botao.remove();
  };
}
