export type PrioridadeDeImagem = 'alta' | 'baixa';

/** Porta de download de imagens (SPEC-02). */
export interface CarregadorDeImagens {
  /**
   * Baixa e decodifica a imagem, deixando-a pronta no cache do navegador. Devolve `false` se o
   * arquivo não existir ou não decodificar; nunca rejeita.
   */
  baixar(url: string, prioridade: PrioridadeDeImagem): Promise<boolean>;
}
