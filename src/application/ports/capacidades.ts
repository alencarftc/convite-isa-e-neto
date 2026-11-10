/** O que o navegador do convidado consegue fazer (SPEC-17, SPEC-18), para a apresentação escolher o caminho. */
export interface Capacidades {
  /**
   * O navegador baixa um arquivo por `<a download>`? Falso no iPhone e no iPad (inclusive no
   * navegador interno do WhatsApp, que costuma não baixar) e quando o navegador não sabe dizer:
   * nesses casos "Salvar na agenda" abre o Google Agenda em vez de baixar o `.ics`.
   */
  baixaArquivos(): boolean;
  /**
   * O navegador desenha com WebGL e sem a ressalva de desempenho (software, lista de bloqueio)? Falso na
   * dúvida: a água e o vento do casal (SPEC-19, SPEC-22) só rodam com WebGL de verdade; sem ele a cena fica
   * como a pintura.
   */
  suportaWebGL(): boolean;
  /**
   * Aparelho modesto (memória até 2 GB ou até 4 núcleos): a cena viva roda no nível leve (SPEC-18). Falso
   * quando o navegador não informa.
   */
  aparelhoModesto(): boolean;
}
