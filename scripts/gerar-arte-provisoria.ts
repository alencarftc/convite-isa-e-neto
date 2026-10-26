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

const TAMANHO_BALAO: Tamanho = { largura: 360, altura: 300 };

/** Balão-nuvem; as três variações mudam a silhueta (SPEC-05, RF-05.2). */
function balao(variacao: 'a' | 'b' | 'c'): string {
  const formas = {
    a: [
      [110, 190, 80],
      [180, 140, 100],
      [260, 180, 78],
      [190, 200, 90],
    ],
    b: [
      [100, 170, 70],
      [170, 120, 95],
      [250, 150, 85],
      [270, 200, 65],
      [160, 200, 90],
    ],
    c: [
      [120, 200, 75],
      [190, 160, 95],
      [265, 190, 70],
      [210, 120, 70],
    ],
  } as const;
  const nuvens = formas[variacao]
    .map(
      ([cx, cy, r]) =>
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" fill-opacity="0.92" stroke="${COR.serenidade}" stroke-opacity="0.5" stroke-width="3"/>`,
    )
    .join('');
  return svg(
    TAMANHO_BALAO,
    `<g>${nuvens}</g><path d="M180 285 q-6 -22 0 -40 q6 18 0 40z" fill="${COR.serenidade}" fill-opacity="0.7"/>${rotulo(TAMANHO_BALAO, `balão ${variacao}`)}`,
    `balão-nuvem ${variacao}`,
  );
}

const TAMANHO_FOTO: Tamanho = { largura: 400, altura: 400 };

/** Retrato provisório: fundo quente e duas silhuetas; as fotos reais vêm do casal (SPEC-05). */
function foto(numero: number): string {
  const fundo = ['#e9d3b0', '#d6dfe9', '#e6d0cf', '#d3e0cf', '#e9dcb4'][numero - 1] ?? '#e9d3b0';
  return svg(
    TAMANHO_FOTO,
    `<rect width="400" height="400" fill="${fundo}"/>
<circle cx="150" cy="150" r="42" fill="${COR.texto}" fill-opacity="0.55"/><path d="M80 330 q0 -110 70 -110 q70 0 70 110z" fill="${COR.texto}" fill-opacity="0.55"/>
<circle cx="255" cy="165" r="38" fill="${COR.texto}" fill-opacity="0.4"/><path d="M190 330 q0 -100 65 -100 q65 0 65 100z" fill="${COR.texto}" fill-opacity="0.4"/>
<text x="200" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="${COR.texto}" fill-opacity="0.6">PROVISÓRIO · foto ${numero}</text>`,
    `foto ${numero}`,
  );
}

const TAMANHO_ENVELOPE: Tamanho = { largura: 720, altura: 480 };

/** Envelope bege, sem selo (a imagem 12 deve nascer sem selo; SPEC-06, questões em aberto). */
function envelopeFechado(): string {
  return svg(
    TAMANHO_ENVELOPE,
    `<rect x="10" y="30" width="700" height="440" rx="14" fill="${COR.bege}" stroke="#b9aa86" stroke-width="4"/>
<path d="M10 40 L360 290 L710 40" fill="none" stroke="#b9aa86" stroke-width="4"/>
<path d="M10 470 L260 250 M710 470 L460 250" fill="none" stroke="#b9aa86" stroke-width="3"/>
<path d="M10 40 Q360 330 710 40 z" fill="#e3d7b9"/>`,
    'envelope fechado',
  );
}

/** Envelope com a aba aberta (o interior escuro aparece). */
function envelopeAberto(): string {
  return svg(
    TAMANHO_ENVELOPE,
    `<rect x="10" y="130" width="700" height="340" rx="14" fill="${COR.bege}" stroke="#b9aa86" stroke-width="4"/>
<path d="M10 140 L360 360 L710 140 z" fill="#c8ba94"/>
<path d="M10 140 L360 20 L710 140 z" fill="#d6c8a4" stroke="#b9aa86" stroke-width="4"/>
<path d="M10 470 L260 300 M710 470 L460 300" fill="none" stroke="#b9aa86" stroke-width="3"/>`,
    'envelope aberto',
  );
}

const TAMANHO_SELO: Tamanho = { largura: 240, altura: 240 };

/** Selo de cera azul; as iniciais I&D são texto por cima (SPEC-06, RF-06.2). */
function selo(): string {
  return svg(
    TAMANHO_SELO,
    `<circle cx="120" cy="120" r="108" fill="#6f8cbf" stroke="#4f6b9c" stroke-width="6"/>
<circle cx="120" cy="120" r="84" fill="none" stroke="#8aa6d3" stroke-width="4"/>
<circle cx="80" cy="76" r="26" fill="#ffffff" fill-opacity="0.18"/>`,
    'selo de cera',
  );
}

const TAMANHO_PAPEL: Tamanho = { largura: 560, altura: 900 };

/** Papel da carta: marfim com fibras sutis. */
function papelCarta(): string {
  const fibras = Array.from(
    { length: 24 },
    (_, i) =>
      `<path d="M${(i * 83) % 560} ${(i * 197) % 900} q40 -10 80 6" stroke="#d9cfae" stroke-opacity="0.35" stroke-width="2" fill="none"/>`,
  ).join('');
  return svg(
    TAMANHO_PAPEL,
    `<rect width="560" height="900" fill="#f8f4e2"/>${fibras}<rect x="6" y="6" width="548" height="888" fill="none" stroke="#e5dbbb" stroke-width="3"/>`,
    'papel da carta',
  );
}

const TAMANHO_CASAL: Tamanho = { largura: 320, altura: 520 };

/** Casal de costas à beira do lago: duas silhuetas lado a lado. */
function casal(): string {
  return svg(
    TAMANHO_CASAL,
    `<g fill="${COR.texto}" fill-opacity="0.85"><circle cx="120" cy="90" r="34"/><path d="M60 480 L80 150 q40 -26 80 0 L190 480 z"/></g>
<g fill="${COR.dourado}" fill-opacity="0.9"><circle cx="215" cy="110" r="30"/><path d="M165 480 L175 175 q40 -20 80 0 L280 480 z"/></g>
${rotulo(TAMANHO_CASAL, 'casal')}`,
    'casal de costas',
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
  'balao-a.svg': balao('a'),
  'balao-b.svg': balao('b'),
  'balao-c.svg': balao('c'),
  'envelope-fechado.svg': envelopeFechado(),
  'envelope-aberto.svg': envelopeAberto(),
  'selo.svg': selo(),
  'papel-carta.svg': papelCarta(),
  'casal.svg': casal(),
  'foto-1.svg': foto(1),
  'foto-2.svg': foto(2),
  'foto-3.svg': foto(3),
  'foto-4.svg': foto(4),
  'foto-5.svg': foto(5),
};

const destino = join(import.meta.dirname, '..', 'public', 'assets', 'provisorio');
mkdirSync(destino, { recursive: true });
for (const [nome, conteudo] of Object.entries(arquivos)) {
  writeFileSync(join(destino, nome), conteudo, 'utf8');
  console.log(`arte provisória ${nome}`);
}
