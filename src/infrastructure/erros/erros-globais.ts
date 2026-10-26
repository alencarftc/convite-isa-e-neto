export type JanelaDeErros = Pick<Window, 'addEventListener' | 'removeEventListener'> & {
  readonly location: Pick<Location, 'origin'>;
};

const RECUSAS_DE_MIDIA = ['NotAllowedError', 'AbortError'];

function ehRecusaDeMidia(motivo: unknown): boolean {
  return motivo instanceof DOMException && RECUSAS_DE_MIDIA.includes(motivo.name);
}

/**
 * Liga `error` e `unhandledrejection` ao modo de segurança (RF-01.9). Erros de arquivos que não
 * são do próprio site (extensões do navegador, scripts de terceiros) são ignorados: não derrubam
 * o convite (SPEC-09, casos de borda). Uma rejeição de reprodução de mídia (`NotAllowedError`, quando o
 * navegador recusa tocar sem gesto, ou `AbortError`) é do som, e o som nunca é condição para o convite
 * andar (SPEC-08, RF-08.8): vai para `aoAvisar`, não para o modo de segurança. Devolve a função que
 * desliga os dois ouvintes.
 */
export function ouvirErrosGlobais(
  janela: JanelaDeErros,
  aoFalhar: (erro: unknown) => void,
  aoAvisar: (aviso: unknown) => void = () => undefined,
): () => void {
  const aoErro = (evento: ErrorEvent) => {
    if (evento.filename.startsWith(janela.location.origin))
      aoFalhar(evento.error ?? evento.message);
  };
  const aoRejeitar = (evento: PromiseRejectionEvent) => {
    if (ehRecusaDeMidia(evento.reason)) aoAvisar(evento.reason);
    else aoFalhar(evento.reason);
  };

  janela.addEventListener('error', aoErro);
  janela.addEventListener('unhandledrejection', aoRejeitar);
  return () => {
    janela.removeEventListener('error', aoErro);
    janela.removeEventListener('unhandledrejection', aoRejeitar);
  };
}
