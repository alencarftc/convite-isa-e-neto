/**
 * O happy-dom não decodifica imagens: `complete` e `naturalWidth` ficam sempre em falso e em 0. Faz toda `<img>`
 * parecer carregada (ou não), para os elementos de vida que só usam imagem pronta (folhas, esquilo) poderem ser
 * testados. Devolve a função que desfaz.
 */
export function fingirImagens(carregadas: boolean): () => void {
  const anteriores = ['complete', 'naturalWidth'].map(
    (nome) => [nome, Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, nome)] as const,
  );
  Object.defineProperty(HTMLImageElement.prototype, 'complete', {
    configurable: true,
    get: () => carregadas,
  });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
    configurable: true,
    get: () => (carregadas ? 20 : 0),
  });
  return () => {
    for (const [nome, descritor] of anteriores) {
      if (descritor) Object.defineProperty(HTMLImageElement.prototype, nome, descritor);
      else Reflect.deleteProperty(HTMLImageElement.prototype, nome);
    }
  };
}
