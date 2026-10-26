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
  };
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
  /** Trecho inicial de cada música, em segundos (SPEC-08). */
  readonly musicas: {
    readonly inicio1: number;
    readonly inicio2: number;
  };
}
