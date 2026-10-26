/** Um item que o gate de publicação acusa (SPEC-12, "Checagem automática"). */
export interface Problema {
  readonly regra: string;
  readonly mensagem: string;
}
