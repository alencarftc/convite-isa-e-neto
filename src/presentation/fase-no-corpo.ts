import type { EstadoConvite } from '@/application/estado-convite';

/**
 * Espelha a fase atual no atributo `data-fase` do `<body>`, para o CSS reagir a cada etapa
 * (SPEC-01, "Orquestrador"). Devolve a função que para de espelhar.
 */
export function refletirFaseNoCorpo(estado: EstadoConvite, corpo: HTMLElement): () => void {
  const refletir = (atual: EstadoConvite) => {
    corpo.setAttribute('data-fase', atual.fase);
  };
  refletir(estado);
  return estado.aoMudar(refletir);
}
