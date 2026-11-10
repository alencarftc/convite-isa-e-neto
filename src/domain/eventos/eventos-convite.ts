/** O que o convidado escolhe ao tocar na entrada (SPEC-02). */
export type EscolhaDeEntrada = 'entrar' | 'pular';

/**
 * Eventos do barramento (SPEC-01, tabela "Eventos"). O valor é o tipo dos dados;
 * `undefined` significa evento sem dados.
 */
export interface EventosConvite {
  'entrada:tocou': { readonly escolha: EscolhaDeEntrada };
  'bosque:pronto': undefined;
  /** O convidado tocou no baú (ou na chave guardada): a música da história começa a subir. */
  'bau:tocado': undefined;
  'bau:girou': undefined;
  'bau:abriu': undefined;
  /** A tampa terminou de abrir: o baú está aberto e a luz sobe (a fada cintila, SPEC-08). */
  'bau:aberto': undefined;
  'historia:inicio': { readonly duracao: number };
  'historia:balao': { readonly indice: number; readonly frase: string };
  /** O último balão começou a subir: a poeira de fada passa a se esvair, devagar, até o fim da história. */
  'historia:ultimo': undefined;
  'historia:fim': undefined;
  'carta:pousou': undefined;
  'carta:abrindo': { readonly origem: 'toque' | 'gesto' };
  'convite:aberto': undefined;
  /**
   * O convidado foi direto ao final (Pular, atalho de teclado ou animação reduzida): as etapas do
   * meio não rodaram. A música 2 entra nesse momento (SPEC-08, tabela "Comportamento").
   */
  'convite:pulado': undefined;
  'som:alterado': { readonly ligado: boolean };
  seguranca: { readonly erro: unknown };
}
