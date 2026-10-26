/** Imagem que já carregou e pode ser clonada sem piscar. */
export function estaPronta(imagem: HTMLImageElement): boolean {
  return imagem.complete && imagem.naturalWidth > 0;
}

/**
 * Pétala decorativa: clone de uma variação já carregada. Todas têm a classe `petala`, que é por onde
 * `removerPetalas` as encontra (as da chuva da carta ganham também `petala--chuva`).
 */
export function criarPetala(
  modelo: HTMLImageElement,
  largura: string,
  modificador?: string,
): HTMLImageElement {
  const petala = modelo.cloneNode() as HTMLImageElement;
  petala.className = modificador === undefined ? 'petala' : `petala ${modificador}`;
  petala.alt = '';
  petala.setAttribute('aria-hidden', 'true');
  petala.style.width = largura;
  return petala;
}

/**
 * Tira do DOM as pétalas que ainda estão no ar. Cada pétala se remove sozinha no fim da animação, mas
 * se a animação for interrompida (Pular, modo de segurança) esse fim nunca chega e elas ficariam
 * congeladas sobre a cena.
 */
export function removerPetalas(conteiner: ParentNode): void {
  for (const petala of conteiner.querySelectorAll('.petala')) petala.remove();
}
