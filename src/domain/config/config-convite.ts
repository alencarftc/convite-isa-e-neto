import type { ArteDaImagem, ChaveDeImagem } from '../imagens/catalogo-de-imagens';

/** Formato de `src/config/config.ts` (SPEC-01, "Conteúdo e configuração"). Tempos em segundos. */
export interface ConfigConvite {
  /** ISO 8601 com fuso explícito. */
  readonly casamento: string;
  /** ISO 8601 com fuso explícito. */
  readonly prazoConfirmacao: string;
  readonly links: {
    readonly formulario: string;
    readonly mapa: string;
  };
  readonly duracoes: {
    readonly nevoa: number;
    readonly bau: number;
    readonly balao: number;
    readonly carta: number;
    readonly convite: number;
    readonly esperaSelo: number;
    readonly dicaChave: number;
    readonly reforcoDica: number;
    readonly limiteCritico: number;
    readonly limiteSeguranca: number;
    /** Espera antes de tentar baixar de novo uma imagem que falhou (SPEC-02). */
    readonly novaTentativaDeImagem: number;
    /** Nomes do casal aparecem (SPEC-02, "Animações da entrada"). */
    readonly entradaNomes: number;
    /** Atraso dos nomes depois do primeiro quadro. */
    readonly entradaNomesAtraso: number;
    /** "Toque para entrar" aparece. */
    readonly entradaChamada: number;
    /** Os textos da entrada somem no toque. */
    readonly entradaSaida: number;
    /** Cada camada da névoa em repouso vai e volta nesse tempo. */
    readonly nevoaEmRepouso: number;
    /** Depois do toque, tempo de espera antes de mostrar "Preparando o bosque…". */
    readonly avisoDeEspera: number;
  };
  /** Arquivo de cada imagem do convite (SPEC-02, SPEC-03); caminhos relativos à página. */
  readonly imagens: Readonly<Record<ChaveDeImagem, ArteDaImagem>>;
  readonly curvas: {
    readonly suave: string;
    readonly saida: string;
    readonly pouso: string;
  };
  readonly volumes: {
    readonly ambiente: number;
    readonly ambienteSobMusica: number;
    readonly efeitos: number;
    readonly musica: number;
  };
  /** Transições de volume do áudio, em segundos (SPEC-08, tabela "Comportamento"). */
  readonly transicoesDeAudio: {
    /** Ambiente sobe de 0 ao volume normal no toque de entrada. */
    readonly entradaDoAmbiente: number;
    /** Ambiente baixa quando uma música entra. */
    readonly ambienteSobMusica: number;
    /** Música entra (de 0 ao volume) ou sai (ao 0). */
    readonly musica: number;
    /** Ambiente volta ao volume normal quando a música 2 termina. */
    readonly retornoDoAmbiente: number;
  };
  /** Trecho inicial de cada música, em segundos (SPEC-08). */
  readonly musicas: {
    readonly inicio1: number;
    readonly inicio2: number;
  };
}
