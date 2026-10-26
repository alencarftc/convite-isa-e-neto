export interface OpcoesDoErroForcado {
  /** `import.meta.env.DEV`: o erro forçado só existe em desenvolvimento (SPEC-01, RF-01.10). */
  readonly desenvolvimento: boolean;
  /** `location.search`. */
  readonly busca: string;
}

const NOME_DE_CENA = /^[a-z]+$/;

/**
 * Em desenvolvimento, `?erro=<cena>` pede que a cena indicada falhe, para testar o modo de
 * segurança (CT-01.7). Devolve o nome da cena ou `null`.
 */
export function lerErroForcado({ desenvolvimento, busca }: OpcoesDoErroForcado): string | null {
  if (!desenvolvimento) return null;
  const nome = new URLSearchParams(busca).get('erro');
  return nome !== null && NOME_DE_CENA.test(nome) ? nome : null;
}
