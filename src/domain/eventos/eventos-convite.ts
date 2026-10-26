/**
 * Eventos do barramento (SPEC-01, tabela "Eventos"). O valor é o tipo dos dados;
 * `undefined` significa evento sem dados.
 */
export interface EventosConvite {
  'entrada:tocou': { readonly escolha: 'entrar' | 'pular' };
  'bosque:pronto': undefined;
  'bau:girou': undefined;
  'bau:abriu': undefined;
  'historia:inicio': { readonly duracao: number };
  'historia:balao': { readonly indice: number; readonly frase: string };
  'historia:fim': undefined;
  'carta:pousou': undefined;
  'carta:abrindo': { readonly origem: 'toque' | 'tempo' };
  'convite:aberto': undefined;
  'som:alterado': { readonly ligado: boolean };
  seguranca: { readonly erro: unknown };
}
