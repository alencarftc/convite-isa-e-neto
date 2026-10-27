/**
 * O happy-dom não implementa a geometria de SVG que o GSAP consulta ao animar um elemento SVG (a matriz da
 * transformação e a caixa do desenho): sem isto, cada quadro de um pássaro lança um erro. Os valores são os de uma
 * transformação neutra e de uma caixa pequena; os testes conferem o ciclo de vida, não o desenho.
 */
export function instalarGeometriaDeSvg(): void {
  const matriz = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const geometria: PropertyDescriptorMap = {
    transform: {
      configurable: true,
      get: () => ({ baseVal: { consolidate: () => ({ matrix: matriz }) } }),
    },
    getBBox: { configurable: true, value: () => ({ x: -9, y: -6, width: 18, height: 6 }) },
  };
  // A propriedade pode vir de qualquer classe da cadeia do SVG: o suporte vai em todas.
  const classes = [
    'SVGElement',
    'SVGGraphicsElement',
    'SVGGElement',
    'SVGPathElement',
    'SVGSVGElement',
  ];
  for (const nome of classes) {
    const construtor = (
      globalThis as unknown as Record<string, { prototype?: object } | undefined>
    )[nome];
    if (construtor?.prototype) Object.defineProperties(construtor.prototype, geometria);
  }
}
