/**
 * Gera a ARTE PROVISÓRIA do convite: SVGs simples, na paleta do projeto, que ocupam o lugar das
 * imagens geradas (docs/requisitos.md, "Imagens a gerar") enquanto elas não existem. Servem para
 * montar e conferir enquadramento, camadas, profundidade e animação.
 *
 * Os arquivos vão para `public/assets/provisorio/` e carregam o marcador `ARTE PROVISÓRIA`. O gate
 * `pnpm verificar` falha enquanto o manifesto de imagens (`config.imagens`) apontar para eles.
 * Rodar: `pnpm arte:provisoria` (os SVGs gerados são versionados).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MARCADOR =
  'ARTE PROVISÓRIA: substituir pela imagem gerada (docs/requisitos.md, "Imagens a gerar")';

const COR = {
  marfim: '#f6f3e0',
  bege: '#dbceb0',
  serenidade: '#91a8d0',
  dourado: '#b18e4a',
  texto: '#32425d',
  verdeEscuro: '#4f6b58',
  verdeMedio: '#6b8a6a',
  verdeClaro: '#8fae85',
  madeira: '#8a5a3b',
  madeiraEscura: '#5e3b27',
} as const;

interface Tamanho {
  readonly largura: number;
  readonly altura: number;
}

const VERTICAL: Tamanho = { largura: 1080, altura: 1920 };
const HORIZONTAL: Tamanho = { largura: 1920, altura: 1080 };

function svg({ largura, altura }: Tamanho, corpo: string, nome: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- ${MARCADOR} · ${nome} -->`,
    `<svg xmlns="http://www.w3.org/2000/svg" data-provisorio="true" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">`,
    corpo,
    '</svg>',
    '',
  ].join('\n');
}

function rotulo({ largura, altura }: Tamanho, texto: string): string {
  const tamanho = Math.round(Math.min(largura, altura) * 0.035);
  return `<text x="${largura / 2}" y="${altura - tamanho}" text-anchor="middle" font-family="Georgia, serif" font-size="${tamanho}" fill="${COR.texto}" fill-opacity="0.55">PROVISÓRIO · ${texto}</text>`;
}

function ceu(t: Tamanho): string {
  return svg(
    t,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#faf6e2"/><stop offset="1" stop-color="#efe5c2"/></linearGradient></defs>
<rect width="${t.largura}" height="${t.altura}" fill="url(#g)"/>
<g fill="#ffffff" fill-opacity="0.55"><ellipse cx="${t.largura * 0.25}" cy="${t.altura * 0.18}" rx="${t.largura * 0.18}" ry="${t.altura * 0.03}"/><ellipse cx="${t.largura * 0.7}" cy="${t.altura * 0.28}" rx="${t.largura * 0.22}" ry="${t.altura * 0.035}"/></g>
<g fill="${COR.serenidade}" fill-opacity="0.18"><ellipse cx="${t.largura * 0.55}" cy="${t.altura * 0.1}" rx="${t.largura * 0.3}" ry="${t.altura * 0.02}"/></g>`,
    'céu baunilha',
  );
}

function ceuPorDoSol(t: Tamanho): string {
  return svg(
    t,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4c39c"/><stop offset="0.6" stop-color="#f1b98a"/><stop offset="1" stop-color="#e6a578"/></linearGradient>
<radialGradient id="s" cx="0.85" cy="0.35" r="0.5"><stop offset="0" stop-color="#fff0c4" stop-opacity="0.95"/><stop offset="0.35" stop-color="#ffd59a" stop-opacity="0.5"/><stop offset="1" stop-color="#ffd59a" stop-opacity="0"/></radialGradient></defs>
<rect width="${t.largura}" height="${t.altura}" fill="url(#g)"/>
<rect width="${t.largura}" height="${t.altura}" fill="url(#s)"/>
<circle cx="${t.largura * 0.85}" cy="${t.altura * 0.35}" r="${Math.min(t.largura, t.altura) * 0.06}" fill="#fff6dc"/>`,
    'céu do pôr do sol',
  );
}

function lago(t: Tamanho): string {
  const { largura: l, altura: a } = t;
  const margem = a * 0.46;
  return svg(
    t,
    `<defs><linearGradient id="agua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6c7e3"/><stop offset="1" stop-color="${COR.serenidade}"/></linearGradient></defs>
<g fill="${COR.verdeEscuro}"><ellipse cx="${l * 0.1}" cy="${margem}" rx="${l * 0.14}" ry="${a * 0.3}"/><ellipse cx="${l * 0.32}" cy="${margem}" rx="${l * 0.12}" ry="${a * 0.2}"/><ellipse cx="${l * 0.55}" cy="${margem}" rx="${l * 0.16}" ry="${a * 0.26}"/><ellipse cx="${l * 0.78}" cy="${margem}" rx="${l * 0.13}" ry="${a * 0.22}"/><ellipse cx="${l * 0.95}" cy="${margem}" rx="${l * 0.12}" ry="${a * 0.28}"/></g>
<rect x="0" y="${margem}" width="${l}" height="${a - margem}" fill="url(#agua)"/>
<g stroke="#ffffff" stroke-opacity="0.6" stroke-width="${a * 0.008}" stroke-linecap="round"><path d="M${l * 0.2} ${a * 0.65} h${l * 0.12}"/><path d="M${l * 0.5} ${a * 0.78} h${l * 0.18}"/><path d="M${l * 0.7} ${a * 0.6} h${l * 0.1}"/></g>
${rotulo(t, 'lago e mata')}`,
    'lago e mata ao fundo',
  );
}

function arvores(t: Tamanho): string {
  const { largura: l, altura: a } = t;
  const tronco = (x: number, largura: number) =>
    `<rect x="${x}" y="${a * 0.15}" width="${largura}" height="${a * 0.85}" fill="${COR.madeiraEscura}"/>`;
  const copa = (cx: number, cy: number, rx: number, ry: number, cor: string) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${cor}"/>`;
  return svg(
    t,
    `${tronco(l * 0.02, l * 0.07)}${tronco(l * 0.9, l * 0.07)}
${copa(l * 0.06, a * 0.12, l * 0.2, a * 0.14, COR.verdeEscuro)}${copa(l * 0.18, a * 0.04, l * 0.22, a * 0.1, COR.verdeMedio)}
${copa(l * 0.94, a * 0.12, l * 0.2, a * 0.14, COR.verdeEscuro)}${copa(l * 0.82, a * 0.04, l * 0.22, a * 0.1, COR.verdeMedio)}
${copa(l * 0.5, a * -0.02, l * 0.4, a * 0.07, COR.verdeClaro)}`,
    'árvores de moldura',
  );
}

function primeiroPlano(t: Tamanho): string {
  const { largura: l, altura: a } = t;
  const lamina = (x: number, altura: number) =>
    `<path d="M${x} ${a} q${l * 0.004} ${-altura * 0.6} ${l * 0.012} ${-altura} q${l * 0.004} ${altura * 0.5} ${l * 0.012} ${altura} z" fill="${COR.verdeMedio}"/>`;
  const folhas = Array.from({ length: 28 }, (_, i) =>
    lamina((i / 28) * l, a * (0.35 + ((i * 7) % 5) * 0.08)),
  ).join('');
  const rosa = (cx: number, cy: number, r: number) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#7f9bc9"/><circle cx="${cx}" cy="${cy}" r="${r * 0.45}" fill="#5f7fb5"/>`;
  return svg(
    t,
    `<rect x="0" y="${a * 0.55}" width="${l}" height="${a * 0.45}" fill="${COR.verdeEscuro}"/>
${folhas}
${rosa(l * 0.12, a * 0.62, a * 0.07)}${rosa(l * 0.3, a * 0.8, a * 0.05)}${rosa(l * 0.72, a * 0.7, a * 0.06)}${rosa(l * 0.9, a * 0.58, a * 0.05)}
${rotulo(t, 'primeiro plano')}`,
    'grama e rosas azuis',
  );
}

const OBJETO: Tamanho = { largura: 640, altura: 520 };

function bauFechado(): string {
  return svg(
    OBJETO,
    `<rect x="40" y="200" width="560" height="270" rx="18" fill="${COR.madeira}" stroke="${COR.madeiraEscura}" stroke-width="10"/>
<path d="M40 215 q0 -135 280 -135 q280 0 280 135 z" fill="#9b6845" stroke="${COR.madeiraEscura}" stroke-width="10"/>
<rect x="40" y="195" width="560" height="26" fill="${COR.dourado}"/>
<rect x="290" y="185" width="60" height="80" rx="8" fill="${COR.dourado}" stroke="${COR.madeiraEscura}" stroke-width="6"/>
<circle cx="320" cy="215" r="9" fill="${COR.madeiraEscura}"/><rect x="316" y="215" width="8" height="26" fill="${COR.madeiraEscura}"/>
${rotulo(OBJETO, 'baú')}`,
    'baú fechado',
  );
}

function bauAberto(): string {
  return svg(
    OBJETO,
    `<rect x="40" y="250" width="560" height="220" rx="18" fill="${COR.madeira}" stroke="${COR.madeiraEscura}" stroke-width="10"/>
<rect x="60" y="262" width="520" height="40" fill="#3b2418"/>
<path d="M60 262 l30 -190 q230 -40 460 0 l30 190 z" fill="#9b6845" stroke="${COR.madeiraEscura}" stroke-width="10"/>
<rect x="40" y="245" width="560" height="22" fill="${COR.dourado}"/>
<circle cx="320" cy="285" r="60" fill="#ffe9a8" fill-opacity="0.55"/>
${rotulo(OBJETO, 'baú aberto')}`,
    'baú aberto',
  );
}

const TAMANHO_CHAVE: Tamanho = { largura: 360, altura: 160 };

function chave(): string {
  return svg(
    TAMANHO_CHAVE,
    `<circle cx="80" cy="80" r="56" fill="none" stroke="${COR.dourado}" stroke-width="22"/>
<circle cx="80" cy="80" r="14" fill="${COR.dourado}"/>
<rect x="132" y="68" width="200" height="24" rx="8" fill="${COR.dourado}"/>
<rect x="276" y="92" width="22" height="40" fill="${COR.dourado}"/><rect x="310" y="92" width="22" height="30" fill="${COR.dourado}"/>`,
    'chave',
  );
}

const TAMANHO_CURSOR: Tamanho = { largura: 48, altura: 48 };

/** Cursor de chave (48 px, ponto ativo na ponta); derivado da imagem 10 na versão final. */
function cursorChave(): string {
  return svg(
    TAMANHO_CURSOR,
    `<g transform="rotate(-45 24 24)"><circle cx="9" cy="24" r="7" fill="none" stroke="${COR.dourado}" stroke-width="4"/><rect x="14" y="22" width="30" height="4" rx="1.5" fill="${COR.dourado}"/><rect x="34" y="26" width="4" height="7" fill="${COR.dourado}"/><rect x="40" y="26" width="4" height="5" fill="${COR.dourado}"/></g>`,
    'cursor de chave',
  );
}

const TAMANHO_PETALA: Tamanho = { largura: 96, altura: 128 };

/** Pétala azul; as três variações mudam a curvatura (SPEC-06 reaproveita). */
function petala(curva: number, tom: string): string {
  return svg(
    TAMANHO_PETALA,
    `<path d="M48 4 C ${88 - curva} 36, ${88 - curva} 96, 48 124 C ${8 + curva} 96, ${8 + curva} 36, 48 4 z" fill="${tom}" fill-opacity="0.9"/><path d="M48 14 V112" stroke="#ffffff" stroke-opacity="0.45" stroke-width="2"/>`,
    'pétala azul',
  );
}

/** Altura da faixa em relação à tela, por orientação (SPEC-03, tabela "Camadas"). */
const FAIXA_LAGO = { vertical: 0.3, horizontal: 0.4 } as const;
const FAIXA_FRENTE = { vertical: 0.34, horizontal: 0.3 } as const;

function faixa(orientacao: 'vertical' | 'horizontal', proporcao: number): Tamanho {
  const tela = orientacao === 'vertical' ? VERTICAL : HORIZONTAL;
  return { largura: tela.largura, altura: Math.round(tela.altura * proporcao) };
}

const arquivos: Record<string, string> = {
  'ceu-9x16.svg': ceu(VERTICAL),
  'ceu-16x9.svg': ceu(HORIZONTAL),
  'ceu-por-do-sol-9x16.svg': ceuPorDoSol(VERTICAL),
  'ceu-por-do-sol-16x9.svg': ceuPorDoSol(HORIZONTAL),
  'lago-9x16.svg': lago(faixa('vertical', FAIXA_LAGO.vertical)),
  'lago-16x9.svg': lago(faixa('horizontal', FAIXA_LAGO.horizontal)),
  'arvores-9x16.svg': arvores(VERTICAL),
  'arvores-16x9.svg': arvores(HORIZONTAL),
  'primeiro-plano-9x16.svg': primeiroPlano(faixa('vertical', FAIXA_FRENTE.vertical)),
  'primeiro-plano-16x9.svg': primeiroPlano(faixa('horizontal', FAIXA_FRENTE.horizontal)),
  'bau-fechado.svg': bauFechado(),
  'bau-aberto.svg': bauAberto(),
  'chave.svg': chave(),
  'cursor-chave.svg': cursorChave(),
  'petala-a.svg': petala(0, '#8fa9d3'),
  'petala-b.svg': petala(12, '#7f9bc9'),
  'petala-c.svg': petala(-10, '#a3b8dc'),
};

const destino = join(import.meta.dirname, '..', 'public', 'assets', 'provisorio');
mkdirSync(destino, { recursive: true });
for (const [nome, conteudo] of Object.entries(arquivos)) {
  writeFileSync(join(destino, nome), conteudo, 'utf8');
  console.log(`arte provisória ${nome}`);
}
