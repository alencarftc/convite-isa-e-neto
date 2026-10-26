import { PLANO_B } from '@/domain/plano-b/plano-b';

/**
 * Avisa o script do `<head>` que o pacote iniciou e desfaz o plano B, se ele já tinha entrado
 * (SPEC-15, RF-15.6): em rede lenta o convite assume quando o pacote chega, e o texto simples some.
 * Roda na primeira linha do `main.ts`, depois dos imports, então um import quebrado não marca.
 */
export function marcarInicioDoConvite(janela: object, documento: Document): void {
  Reflect.set(janela, PLANO_B.variavel, PLANO_B.marca);
  documento.documentElement.classList.remove(PLANO_B.classe);
}
