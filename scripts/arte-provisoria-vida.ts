/**
 * Desenhos da ARTE PROVISÓRIA da cena viva (épico 13, SPEC-18, RF-18.8): folhas e esquilo. Cada função
 * devolve o corpo de um SVG e o tamanho dele; `gerar-arte-provisoria.ts` embrulha no `<svg>` com o
 * marcador. São traços simples na paleta do projeto, só para a cena ter o que mover até as imagens 20 e 21
 * chegarem (`docs/specs-cena-viva/README.md`, "Imagens novas"). O casal sentado (imagem 19) foi
 * revertido em 31/10/2026 (ADR-0014).
 */

export interface DesenhoProvisorio {
  readonly largura: number;
  readonly altura: number;
  readonly corpo: string;
}

/** Folha caindo, 128 × 128: três variações de forma e de verde (20a a 20c). */
export function folha(variacao: 'a' | 'b' | 'c'): DesenhoProvisorio {
  const cores = {
    a: { claro: '#b4c597', escuro: '#728b5c', nervura: '#4f6a3f' },
    b: { claro: '#a2b98a', escuro: '#5f7d52', nervura: '#44603a' },
    c: { claro: '#d4c58a', escuro: '#8f8b4f', nervura: '#6a6636' },
  }[variacao];
  const contorno = {
    a: 'M64 6 C104 28 116 72 64 122 C12 72 24 28 64 6Z',
    b: 'M64 4 C92 30 100 76 66 124 C34 86 30 34 64 4Z',
    c: 'M64 8 C108 34 108 78 64 120 C26 88 14 40 64 8Z',
  }[variacao];
  return {
    largura: 128,
    altura: 128,
    corpo: `<defs><linearGradient id="folha" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0" stop-color="${cores.claro}"/><stop offset="1" stop-color="${cores.escuro}"/></linearGradient></defs>
<path d="${contorno}" fill="url(#folha)"/>
<path d="M64 14 C64 50 66 90 66 118" fill="none" stroke="${cores.nervura}" stroke-width="3" stroke-linecap="round" opacity="0.65"/>
<path d="M65 44 L40 30 M65 62 L86 46 M66 80 L42 64 M66 96 L84 82" fill="none" stroke="${cores.nervura}" stroke-width="2" stroke-linecap="round" opacity="0.45"/>`,
  };
}

/**
 * Esquilo de lado, olhando para a direita (RF-21.4), 256 × 192: encolhido (pousado) ou esticado (no pulo).
 * As patas encostam na base da imagem no encolhido; no esticado ele está no ar.
 */
export function esquilo(pose: 'encolhido' | 'esticado'): DesenhoProvisorio {
  const definicoes = `<defs>
  <linearGradient id="pelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3683a"/><stop offset="1" stop-color="#8a4a28"/></linearGradient>
  <linearGradient id="rabo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c47a47"/><stop offset="1" stop-color="#8a4a28"/></linearGradient>
</defs>`;
  if (pose === 'encolhido') {
    return {
      largura: 256,
      altura: 192,
      corpo: `${definicoes}
<path d="M84 168 C14 160 -2 76 52 40 C84 18 122 44 104 78 C96 96 116 118 112 150 Z" fill="url(#rabo)"/>
<path d="M60 70 C70 52 92 46 100 62" fill="none" stroke="#e0a974" stroke-width="5" stroke-linecap="round" opacity="0.55"/>
<ellipse cx="130" cy="140" rx="52" ry="34" fill="url(#pelo)"/>
<ellipse cx="146" cy="154" rx="30" ry="18" fill="#dcae84"/>
<ellipse cx="104" cy="152" rx="26" ry="22" fill="#8a4a28"/>
<ellipse cx="172" cy="176" rx="14" ry="7" fill="#7a4023"/>
<ellipse cx="112" cy="180" rx="18" ry="6" fill="#7a4023"/>
<circle cx="178" cy="106" r="25" fill="#a85f34"/>
<path d="M164 90 L158 64 L182 82Z" fill="#8a4a28"/>
<ellipse cx="198" cy="114" rx="16" ry="11" fill="#cb8d60"/>
<circle cx="211" cy="110" r="4" fill="#3b2418"/>
<circle cx="184" cy="100" r="4.2" fill="#2a1a10"/>
<circle cx="185.4" cy="98.6" r="1.3" fill="#fff6e6"/>`,
    };
  }
  return {
    largura: 256,
    altura: 192,
    corpo: `${definicoes}
<path d="M64 92 C8 100 -4 40 36 22 C62 12 84 34 74 54 C68 66 84 74 92 82 Z" fill="url(#rabo)"/>
<g transform="rotate(-14 130 92)">
  <ellipse cx="128" cy="96" rx="62" ry="26" fill="url(#pelo)"/>
  <ellipse cx="140" cy="106" rx="38" ry="12" fill="#dcae84"/>
  <path d="M70 100 C48 108 30 124 20 144" fill="none" stroke="#7a4023" stroke-width="12" stroke-linecap="round"/>
  <path d="M182 104 C206 116 224 126 240 128" fill="none" stroke="#7a4023" stroke-width="11" stroke-linecap="round"/>
  <circle cx="190" cy="78" r="23" fill="#a85f34"/>
  <path d="M178 62 L174 38 L196 54Z" fill="#8a4a28"/>
  <ellipse cx="209" cy="86" rx="15" ry="10" fill="#cb8d60"/>
  <circle cx="221" cy="83" r="3.8" fill="#3b2418"/>
  <circle cx="196" cy="73" r="4" fill="#2a1a10"/>
  <circle cx="197.3" cy="71.7" r="1.2" fill="#fff6e6"/>
</g>`,
  };
}
