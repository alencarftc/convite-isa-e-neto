/** Cor em hexadecimal de 6 dígitos (`#32425d`) → componentes de 0 a 255. */
function componentes(hex: string): readonly [number, number, number] {
  const limpo = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(limpo)) throw new RangeError(`Cor inválida: "${hex}"`);
  return [
    Number.parseInt(limpo.slice(0, 2), 16),
    Number.parseInt(limpo.slice(2, 4), 16),
    Number.parseInt(limpo.slice(4, 6), 16),
  ];
}

/** Luminância relativa (WCAG 2.x). */
function luminancia(hex: string): number {
  const [r, g, b] = componentes(hex).map((canal) => {
    const c = canal / 255;
    return c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Razão de contraste WCAG entre duas cores (de 1 a 21). A SPEC-09 exige pelo menos 4,5:1 em todo
 * texto; o texto principal (azul-noite sobre marfim) tem 9,1:1.
 */
export function razaoDeContraste(corA: string, corB: string): number {
  const [clara, escura] = [luminancia(corA), luminancia(corB)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (clara + 0.05) / (escura + 0.05);
}
