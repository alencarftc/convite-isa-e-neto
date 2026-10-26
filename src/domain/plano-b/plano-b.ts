/**
 * Contrato entre o script inline do `<head>` e o pacote (SPEC-15, RF-15.6). O script inline não
 * pode importar nada, então estes nomes são copiados para ele na geração do HTML
 * (`scripts/vite/plano-b.ts`); um teste confere que os dois lados usam os mesmos.
 */
export const PLANO_B = {
  /** Classe que o script põe no `<html>` quando o pacote não inicia: mostra o texto simples. */
  classe: 'plano-b',
  /** Propriedade de `window` que o pacote preenche na primeira linha do `main.ts`. */
  variavel: '__convite',
  /** Valor da propriedade quando o pacote iniciou. */
  marca: 'iniciou',
} as const;
