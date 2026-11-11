/**
 * As curvas do GSAP que `config.curvas` usa, com a curva de Bézier equivalente do CSS. As animações que o navegador roda sozinho
 * (`Element.animate`, ADR-0044) usam a do CSS; o GSAP a chama por outro nome. No GSAP, `power1` é a quadrática, `power2` a cúbica e
 * `power3` a quártica. Uma curva sem equivalente (a elástica) cai em `linear`.
 */
const CURVAS: Readonly<Record<string, string>> = {
  none: 'linear',
  linear: 'linear',
  'sine.in': 'cubic-bezier(0.12, 0, 0.39, 0)',
  'sine.out': 'cubic-bezier(0.61, 1, 0.88, 1)',
  'sine.inOut': 'cubic-bezier(0.37, 0, 0.63, 1)',
  'power1.in': 'cubic-bezier(0.11, 0, 0.5, 0)',
  'power1.out': 'cubic-bezier(0.5, 1, 0.89, 1)',
  'power1.inOut': 'cubic-bezier(0.45, 0, 0.55, 1)',
  'power2.in': 'cubic-bezier(0.32, 0, 0.67, 0)',
  'power2.out': 'cubic-bezier(0.33, 1, 0.68, 1)',
  'power2.inOut': 'cubic-bezier(0.65, 0, 0.35, 1)',
  'power3.in': 'cubic-bezier(0.5, 0, 0.75, 0)',
  'power3.out': 'cubic-bezier(0.25, 1, 0.5, 1)',
  'power3.inOut': 'cubic-bezier(0.76, 0, 0.24, 1)',
};

/** O nome da curva do GSAP (`config.curvas.suave`) vira o da curva do CSS, ou `linear` se não houver equivalente. */
export function curvaCss(nomeNoGsap: string): string {
  return CURVAS[nomeNoGsap] ?? 'linear';
}
