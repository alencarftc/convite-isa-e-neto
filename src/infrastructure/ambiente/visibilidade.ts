export interface DocumentoVisivel {
  readonly hidden: boolean;
  addEventListener(tipo: 'visibilitychange', escuta: () => void): void;
  removeEventListener(tipo: 'visibilitychange', escuta: () => void): void;
}

export interface JanelaComPagina {
  addEventListener(tipo: 'pagehide' | 'pageshow', escuta: () => void): void;
  removeEventListener(tipo: 'pagehide' | 'pageshow', escuta: () => void): void;
}

/**
 * Avisa quando o convidado sai do convite (troca de aplicativo, bloqueio de tela, fechar a aba) e
 * quando volta (SPEC-08, RF-08.7). `pagehide` cobre navegadores que não disparam `visibilitychange`
 * ao sair. Quem recebe os avisos deve aceitar repetição: os dois eventos podem chegar juntos.
 * Devolve a função que desliga os ouvintes.
 */
export function ouvirSaidaEVolta(
  documento: DocumentoVisivel,
  janela: JanelaComPagina,
  aoSair: () => void,
  aoVoltar: () => void,
): () => void {
  const aoMudarVisibilidade = () => {
    if (documento.hidden) aoSair();
    else aoVoltar();
  };

  documento.addEventListener('visibilitychange', aoMudarVisibilidade);
  janela.addEventListener('pagehide', aoSair);
  janela.addEventListener('pageshow', aoVoltar);
  return () => {
    documento.removeEventListener('visibilitychange', aoMudarVisibilidade);
    janela.removeEventListener('pagehide', aoSair);
    janela.removeEventListener('pageshow', aoVoltar);
  };
}
