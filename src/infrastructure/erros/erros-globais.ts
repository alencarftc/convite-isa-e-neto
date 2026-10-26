export type JanelaDeErros = Pick<Window, 'addEventListener' | 'removeEventListener'> & {
  readonly location: Pick<Location, 'origin'>;
};

/**
 * Liga `error` e `unhandledrejection` ao modo de segurança (RF-01.9). Erros de arquivos que não
 * são do próprio site (extensões do navegador, scripts de terceiros) são ignorados: não derrubam
 * o convite (SPEC-09, casos de borda). Devolve a função que desliga os dois ouvintes.
 */
export function ouvirErrosGlobais(
  janela: JanelaDeErros,
  aoFalhar: (erro: unknown) => void,
): () => void {
  const aoErro = (evento: ErrorEvent) => {
    if (evento.filename.startsWith(janela.location.origin))
      aoFalhar(evento.error ?? evento.message);
  };
  const aoRejeitar = (evento: PromiseRejectionEvent) => {
    aoFalhar(evento.reason);
  };

  janela.addEventListener('error', aoErro);
  janela.addEventListener('unhandledrejection', aoRejeitar);
  return () => {
    janela.removeEventListener('error', aoErro);
    janela.removeEventListener('unhandledrejection', aoRejeitar);
  };
}
