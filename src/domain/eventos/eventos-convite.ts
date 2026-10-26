/** O que o convidado escolhe ao tocar na entrada (SPEC-02). */
export type EscolhaDeEntrada = 'entrar' | 'pular';

/**
 * Eventos do barramento (SPEC-01, tabela "Eventos"). O valor é o tipo dos dados;
 * `undefined` significa evento sem dados.
 */
export interface EventosConvite {
  'entrada:tocou': { readonly escolha: EscolhaDeEntrada };
  'bosque:pronto': undefined;
  'bau:girou': undefined;
  'bau:abriu': undefined;
  'historia:inicio': { readonly duracao: number };
  'historia:balao': { readonly indice: number; readonly frase: string };
  'historia:fim': undefined;
  'carta:pousou': undefined;
  'carta:abrindo': { readonly origem: 'toque' | 'tempo' | 'gesto' };
  'convite:aberto': undefined;
  /**
   * O convidado foi direto ao final (Pular, atalho de teclado ou animação reduzida): as etapas do
   * meio não rodaram. A música 2 entra nesse momento (SPEC-08, tabela "Comportamento").
   */
  'convite:pulado': undefined;
  'som:alterado': { readonly ligado: boolean };
  seguranca: { readonly erro: unknown };
}
