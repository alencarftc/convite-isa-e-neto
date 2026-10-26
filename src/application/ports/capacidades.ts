/** O que o navegador do convidado consegue fazer (SPEC-17), para a apresentação escolher o caminho. */
export interface Capacidades {
  /**
   * O navegador baixa um arquivo por `<a download>`? Falso no iPhone e no iPad (inclusive no
   * navegador interno do WhatsApp, que costuma não baixar) e quando o navegador não sabe dizer:
   * nesses casos "Salvar na agenda" abre o Google Agenda em vez de baixar o `.ics`.
   */
  baixaArquivos(): boolean;
}
