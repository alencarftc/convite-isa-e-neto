/** Cor RGB com cada canal de 0 a 1, como o WebGL a recebe. */
export type CorRgb = readonly [number, number, number];

/**
 * Lê uma cor de um token da CSS: `#rgb`, `#rrggbb` (com ou sem alfa, que é ignorado) ou `rgb(r, g, b)`. Devolve
 * `undefined` para o que não entende, e quem chama escolhe o que fazer.
 */
export function analisarCor(texto: string): CorRgb | undefined {
  const limpo = texto.trim().toLowerCase();
  const hexa = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(limpo);
  if (hexa?.[1]) {
    const digitos = hexa[1];
    const longos = digitos.length >= 6;
    const canal = (indice: number) => {
      const bruto = longos
        ? digitos.slice(indice * 2, indice * 2 + 2)
        : `${digitos.charAt(indice)}${digitos.charAt(indice)}`;
      return Number.parseInt(bruto, 16) / 255;
    };
    return [canal(0), canal(1), canal(2)];
  }
  const funcao = /^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/.exec(limpo);
  if (funcao?.[1] && funcao[2] && funcao[3]) {
    return [Number(funcao[1]) / 255, Number(funcao[2]) / 255, Number(funcao[3]) / 255];
  }
  return undefined;
}
