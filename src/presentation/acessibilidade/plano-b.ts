import { PLANO_B } from '@/domain/plano-b/plano-b';

/**
 * Avisa o script do `<head>` que o pacote iniciou e desfaz o plano B, se ele já tinha entrado
 * (SPEC-15, RF-15.6): em rede lenta o convite assume quando o pacote chega, e o texto simples some.
 * Roda no `main.ts` quando a composição terminou sem erro, então um import ou uma montagem quebrados
 * não marcam e levam ao plano B.
 */
export function marcarInicioDoConvite(janela: object, documento: Document): void {
  Reflect.set(janela, PLANO_B.variavel, PLANO_B.marca);
  documento.documentElement.classList.remove(PLANO_B.classe);
}
