/**
 * Desenhos da ARTE PROVISÓRIA da cena viva (épico 13, SPEC-18, RF-18.8): folhas, esquilo e o casal
 * sentado. Cada função devolve o corpo de um SVG e o tamanho dele; `gerar-arte-provisoria.ts` embrulha
 * no `<svg>` com o marcador. São traços simples na paleta do projeto, só para a cena ter o que mover até
 * as imagens 19, 20 e 21 chegarem (`docs/specs-cena-viva/README.md`, "Imagens novas").
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

/**
 * Casal sentado na grama, de costas, 520 × 400 (imagem 19): ela apoia a cabeça no ombro dele, que a
 * abraça; luz de contra dourada no contorno; um pedaço de grama e rosas azuis sob eles dá o contato com o
 * chão. Sem rosto nem perfil (SPEC-22, RF-22.7).
 */
export function casalSentado(): DesenhoProvisorio {
  return {
    largura: 520,
    altura: 400,
    corpo: `<defs>
  <linearGradient id="grama" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93aa73"/><stop offset="1" stop-color="#617a50"/></linearGradient>
  <linearGradient id="terno" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5670"/><stop offset="1" stop-color="#2b3347"/></linearGradient>
  <linearGradient id="vestido" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8f1e2"/><stop offset="1" stop-color="#d9ccb2"/></linearGradient>
</defs>
<path d="M6 372 C34 340 96 334 150 344 C214 332 296 338 360 336 C430 330 492 340 514 368 C516 390 470 398 400 397 C300 399 120 400 40 394 C14 390 4 384 6 372Z" fill="url(#grama)"/>
<path d="M40 360 l4 -18 l5 17 M96 352 l3 -20 l6 19 M420 350 l4 -19 l5 18 M470 360 l3 -16 l6 15" fill="none" stroke="#7d9660" stroke-width="3" stroke-linecap="round"/>
<g fill="#5f82b8"><circle cx="64" cy="362" r="11"/><circle cx="82" cy="372" r="8"/><circle cx="446" cy="360" r="10"/><circle cx="238" cy="378" r="9"/></g>
<g fill="#aac2e6" opacity="0.8"><circle cx="62" cy="359" r="4"/><circle cx="444" cy="357" r="4"/><circle cx="236" cy="375" r="3.5"/></g>
<ellipse cx="316" cy="360" rx="132" ry="30" fill="#f4ebd8"/>
<path d="M236 364 C232 288 256 250 290 240 C334 232 384 250 402 310 C410 336 412 352 414 364Z" fill="url(#vestido)"/>
<path d="M112 368 C100 276 120 226 172 212 L236 212 C282 222 300 256 300 304 L298 368Z" fill="url(#terno)"/>
<path d="M186 214 C186 196 192 192 206 192 C220 192 226 198 226 214Z" fill="#6d5242"/>
<circle cx="206" cy="168" r="34" fill="#3b2d25"/>
<path d="M176 150 C190 130 224 128 238 148" fill="none" stroke="#ffd9a1" stroke-width="3.5" stroke-linecap="round" opacity="0.85"/>
<path d="M276 198 C272 160 322 146 340 178 C354 212 352 268 342 304 C324 318 292 316 282 300 C272 270 272 232 276 198Z" fill="#5b4333"/>
<path d="M290 176 C302 158 328 158 338 176" fill="none" stroke="#ffd9a1" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
<path d="M296 262 C328 258 364 262 384 272" fill="none" stroke="#3a4560" stroke-width="22" stroke-linecap="round"/>
<circle cx="388" cy="274" r="9" fill="#d6b79b"/>
<path d="M172 212 C196 204 228 206 250 218" fill="none" stroke="#ffd9a1" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
<path d="M398 262 C408 292 412 326 414 352" fill="none" stroke="#ffe6c0" stroke-width="3" stroke-linecap="round" opacity="0.75"/>`,
  };
}
