/**
 * Gera a ARTE PROVISÓRIA: as fotos dos balões (retratos pintados em aquarela simples, na paleta do projeto,
 * no lugar das fotos reais do casal, SPEC-05) e, na branch da cena viva, as folhas, o esquilo e o casal
 * sentado (SPEC-18, RF-18.8). A arte do bosque, do baú, da carta etc. já é a gerada (`pnpm arte`,
 * ADR-0011); o que está aqui continua pendente.
 *
 * Os arquivos vão para `public/assets/provisorio/` e carregam o marcador `ARTE PROVISÓRIA` (comentário e
 * `data-provisorio`), sem texto visível: no balão elas devem parecer retratos, não avisos. O gate
 * `pnpm verificar` falha enquanto `config.imagens` ou `content.baloes[].foto` apontarem para eles ou o
 * `alt` estiver entre colchetes. Rodar: `pnpm arte:provisoria` (os SVGs gerados são versionados).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { casalSentado, type DesenhoProvisorio, esquilo, folha } from './arte-provisoria-vida';

const MARCADOR =
  'ARTE PROVISÓRIA: substituir pela foto real do casal (docs/requisitos.md, "Fotos dos balões")';
const MARCADOR_DA_VIDA =
  'ARTE PROVISÓRIA: substituir pela imagem definitiva (docs/specs-cena-viva/README.md, "Imagens novas")';

const TAMANHO_FOTO = 400;

interface Paleta {
  /** Céu no alto e no horizonte. */
  readonly ceu: readonly [string, string];
  readonly sol: string;
  readonly colina: string;
  readonly terno: string;
  readonly vestido: string;
}

const PALETAS: readonly Paleta[] = [
  {
    ceu: ['#f4e3c1', '#ecc99a'],
    sol: '#fff4d6',
    colina: '#b9b78f',
    terno: '#46526b',
    vestido: '#fbf6ea',
  },
  {
    ceu: ['#dbe6f2', '#bdd0e6'],
    sol: '#fdf8e6',
    colina: '#a9bd9e',
    terno: '#3d4a63',
    vestido: '#faf5ec',
  },
  {
    ceu: ['#f1dcd6', '#e7bfb4'],
    sol: '#fff0d9',
    colina: '#c2ae92',
    terno: '#4b4a63',
    vestido: '#fbf3ea',
  },
  {
    ceu: ['#dce8d6', '#bfd5b8'],
    sol: '#fdf6dc',
    colina: '#9db38c',
    terno: '#41546a',
    vestido: '#faf6ec',
  },
  {
    ceu: ['#f2e6bd', '#e9c98d'],
    sol: '#fff6d8',
    colina: '#b3ad7f',
    terno: '#4a4f66',
    vestido: '#fbf5e8',
  },
];

function svg(
  corpo: string,
  nome: string,
  largura: number = TAMANHO_FOTO,
  altura: number = TAMANHO_FOTO,
  marcador: string = MARCADOR,
): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- ${marcador} · ${nome} -->`,
    `<svg xmlns="http://www.w3.org/2000/svg" data-provisorio="true" width="${String(largura)}" height="${String(altura)}" viewBox="0 0 ${String(largura)} ${String(altura)}">`,
    corpo,
    '</svg>',
    '',
  ].join('\n');
}

/** Retrato provisório: céu em degradê, sol baixo, colinas e o casal de mãos dadas, em silhueta suave. */
function foto(numero: number): string {
  const p = PALETAS[numero - 1] ?? PALETAS[0];
  if (!p) throw new RangeError(`Sem paleta para a foto ${String(numero)}`);
  const deslocamento = (numero - 1) * 14 - 28; // cada foto enquadra o casal um pouco diferente
  return svg(
    `<defs>
  <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.ceu[0]}"/><stop offset="1" stop-color="${p.ceu[1]}"/></linearGradient>
  <radialGradient id="sol" cx="${String(62 + numero * 3)}%" cy="46%" r="46%"><stop offset="0" stop-color="${p.sol}" stop-opacity="0.95"/><stop offset="1" stop-color="${p.sol}" stop-opacity="0"/></radialGradient>
  <linearGradient id="terno" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.terno}"/><stop offset="1" stop-color="#2d3548"/></linearGradient>
  <linearGradient id="vestido" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.vestido}"/><stop offset="1" stop-color="#e6dcc6"/></linearGradient>
  <radialGradient id="vinheta" cx="50%" cy="46%" r="70%"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a2d1f" stop-opacity="0.22"/></radialGradient>
</defs>
<rect width="400" height="400" fill="url(#ceu)"/>
<rect width="400" height="400" fill="url(#sol)"/>
<path d="M0 262 Q90 226 180 252 T400 238 V400 H0Z" fill="${p.colina}" fill-opacity="0.55"/>
<path d="M0 300 Q120 268 240 292 T400 284 V400 H0Z" fill="${p.colina}" fill-opacity="0.85"/>
<ellipse cx="${String(200 + deslocamento)}" cy="352" rx="96" ry="9" fill="#3a2d1f" fill-opacity="0.18"/>
<g transform="translate(${String(deslocamento)} 0)">
  <circle cx="168" cy="176" r="23" fill="#d9b799"/>
  <path d="M168 153 q-24 -4 -24 18 q10 -16 24 -16 q14 0 22 8 q-4 -16 -22 -10z" fill="#4a3a2d"/>
  <path d="M132 352 v-96 q0 -40 36 -40 q36 0 36 40 v96z" fill="url(#terno)"/>
  <circle cx="236" cy="184" r="21" fill="#e0c1a4"/>
  <path d="M236 163 q-26 -2 -26 24 q4 -22 26 -20 q24 -2 26 20 q0 -24 -26 -24z" fill="#5a4332"/>
  <path d="M230 205 q-34 8 -44 147 h104 q-8 -139 -34 -147z" fill="url(#vestido)"/>
  <path d="M196 262 q14 10 22 -2" fill="none" stroke="#d9b799" stroke-width="9" stroke-linecap="round"/>
</g>
<rect width="400" height="400" fill="url(#vinheta)"/>`,
    `foto ${String(numero)}`,
  );
}

const destino = join(import.meta.dirname, '..', 'public', 'assets', 'provisorio');
mkdirSync(destino, { recursive: true });
for (const numero of [1, 2, 3, 4, 5]) {
  const nome = `foto-${String(numero)}.svg`;
  writeFileSync(join(destino, nome), foto(numero), 'utf8');
  console.log(`foto provisória ${nome}`);
}

/** Cena viva (épico 13): folhas 20a–c, esquilo 21a–b e o casal sentado no lugar da imagem 17/19. */
const desenhosDaVida: readonly (readonly [string, DesenhoProvisorio])[] = [
  ['folha-a.svg', folha('a')],
  ['folha-b.svg', folha('b')],
  ['folha-c.svg', folha('c')],
  ['esquilo-encolhido.svg', esquilo('encolhido')],
  ['esquilo-esticado.svg', esquilo('esticado')],
  ['casal.svg', casalSentado()],
];
for (const [nome, { corpo, largura, altura }] of desenhosDaVida) {
  writeFileSync(join(destino, nome), svg(corpo, nome, largura, altura, MARCADOR_DA_VIDA), 'utf8');
  console.log(`arte provisória ${nome}`);
}
