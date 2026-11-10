/**
 * Prepara a arte gerada para o site: `pnpm arte`.
 *
 * Lê as imagens originais de `arte/originais/` (PNG enormes, com restos de recorte nas bordas) e
 * escreve em `public/` os arquivos que o convite carrega: WebP com recorte limpo, do tamanho em que
 * aparecem, com a maior qualidade que cabe no orçamento de peso de cada uma (SPEC-12, `orcamento.ts`).
 * Também mede a chave na horizontal, e gera a prévia do WhatsApp e os ícones.
 *
 * Os originais nunca vão para `public/`: o Vite copiaria os 41 MB para o site.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import sharp, { type Sharp } from 'sharp';

import { LIMITE_DAS_IMAGENS } from '../verificar/orcamento';
import {
  type Caixa,
  caixaDoObjeto,
  caixasDosObjetos,
  comFolga,
  criarQuadro,
  descontaminarBorda,
  erodirAlfa,
  escurecerBase,
  expandirCeuPalido,
  isolarPrimeiroPlano,
  limparRecorte,
  medirPoseGirada,
  normalizarAlfa,
  type Quadro,
  removerCeu,
  removerFundoLiso,
  removerFundoNeutroInterno,
  removerManchasPequenas,
  suavizarAlfa,
  unirCaixas,
} from './pixels';

const raiz = join(import.meta.dirname, '..', '..');
const originais = join(raiz, 'arte', 'originais');
const publico = join(raiz, 'public');

/** Qualidades tentadas, da melhor para a pior; a primeira que cabe no limite vale. */
const QUALIDADES = [90, 86, 82, 78, 74, 70, 66, 62, 58] as const;
/** Quanto do limite o arquivo pode usar: sobra margem para a arte final trocar sem estourar. */
const USO_DO_LIMITE = 0.95;
const FOLGA_DO_RECORTE = 6;
/** A chave `lago` leva a cena inteira no retrato (limite maior); o lago do computador continua nos 150 kB de antes. */
const LIMITE_DO_LAGO_NO_COMPUTADOR = 150 * 1024;

type Quadro4 = Quadro & { readonly canais: 4 };

async function lerQuadro(caminho: string): Promise<Quadro4> {
  const { data, info } = await sharp(caminho)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    largura: info.width,
    altura: info.height,
    dados: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    canais: 4,
  };
}

function paraSharp(quadro: Quadro) {
  return sharp(Buffer.from(quadro.dados), {
    raw: { width: quadro.largura, height: quadro.altura, channels: 4 },
  });
}

function escrever(caminho: string, conteudo: Buffer): void {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo);
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

interface Codificada {
  readonly buffer: Buffer;
  readonly qualidade: number;
  readonly largura: number;
}

/**
 * Codifica em WebP na melhor qualidade que cabe em `limite` bytes; se nem a pior cabe, encolhe a
 * imagem em 10% e tenta de novo (até 60% do tamanho de partida).
 */
async function codificarNoLimite(
  base: Sharp,
  larguraDePartida: number,
  limite: number,
): Promise<Codificada> {
  for (let escala = 1; escala >= 0.6; escala -= 0.1) {
    const largura = Math.round(larguraDePartida * escala);
    // Pixels crus, com as dimensões que o redimensionamento deu: cada qualidade parte deles.
    const { data, info } = await base
      .clone()
      .resize({ width: largura })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const crua = { raw: { width: info.width, height: info.height, channels: info.channels } };
    for (const qualidade of QUALIDADES) {
      const buffer = await sharp(data, crua)
        .webp({ quality: qualidade, alphaQuality: 90, effort: 5, smartSubsample: true })
        .toBuffer();
      if (buffer.length <= limite * USO_DO_LIMITE) return { buffer, qualidade, largura };
    }
  }
  throw new RangeError(`Não coube em ${kb(limite)} nem a 60% do tamanho`);
}

function relatar(rotulo: string, codificada: Codificada, limite: number): void {
  const uso = Math.round((100 * codificada.buffer.length) / limite);
  console.log(
    `  ${rotulo.padEnd(34)} ${String(codificada.largura).padStart(5)} px  q${String(codificada.qualidade)}  ${kb(codificada.buffer.length).padStart(7)}  (${String(uso)}% de ${kb(limite)})`,
  );
}

/** Cenas: imagens cheias, sem recorte. */
async function cena(origem: string, destino: string, chave: keyof typeof LIMITE_DAS_IMAGENS) {
  const limite = LIMITE_DAS_IMAGENS[chave];
  const meta = await sharp(join(originais, origem)).metadata();
  const codificada = await codificarNoLimite(
    sharp(join(originais, origem)).removeAlpha(),
    meta.width,
    limite,
  );
  escrever(join(publico, destino), codificada.buffer);
  relatar(destino, codificada, limite);
}

interface Objeto {
  readonly origem: string;
  readonly destino: string;
  readonly chave: keyof typeof LIMITE_DAS_IMAGENS;
  /** Largura final, em pixels, antes de procurar a qualidade. */
  readonly largura: number;
  /** Teto de peso desta imagem, quando a chave tem outro teto para a outra orientação. */
  readonly limite?: number;
}

/**
 * Objetos recortados. As imagens de um mesmo `grupo` (baú fechado e aberto; envelope fechado e
 * aberto) recebem o MESMO recorte e a mesma escala, para se sobreporem sem pular na troca.
 */
async function objetos(
  lista: readonly Objeto[],
  opcoes: {
    limpar: boolean;
    bordaAberta?: boolean;
    /** Escurece a base do objeto, onde ele toca o chão (oclusão de ambiente): fração da altura e força. */
    baseNoChao?: { readonly fracao: number; readonly forca: number };
  },
): Promise<void> {
  const quadros = await Promise.all(lista.map((o) => lerQuadro(join(originais, o.origem))));
  const limpezas = quadros.map((quadro) => {
    if (opcoes.limpar) {
      return limparRecorte(quadro, 2, { bordaAberta: opcoes.bordaAberta ?? false }).removidos;
    }
    normalizarAlfa(quadro);
    return 0;
  });
  const caixas = quadros.map((quadro) => {
    const caixa = caixaDoObjeto(quadro);
    if (!caixa) throw new RangeError('Imagem sem nenhum pixel visível');
    return caixa;
  });
  // O recorte único do grupo: todos olham a mesma região, na mesma escala.
  const comum = comFolga(unirCaixas(caixas), FOLGA_DO_RECORTE, quadros[0] as Quadro);
  const escala = (lista[0]?.largura ?? comum.largura) / comum.largura;
  for (const [indice, objeto] of lista.entries()) {
    const quadro = quadros[indice] as Quadro;
    if (opcoes.baseNoChao) {
      escurecerBase(quadro, comum, opcoes.baseNoChao.fracao, opcoes.baseNoChao.forca);
    }
    const limite = objeto.limite ?? LIMITE_DAS_IMAGENS[objeto.chave];
    const base = paraSharp(quadro).extract({
      left: comum.esquerda,
      top: comum.topo,
      width: comum.largura,
      height: comum.altura,
    });
    const codificada = await codificarNoLimite(base, Math.round(comum.largura * escala), limite);
    escrever(join(publico, objeto.destino), codificada.buffer);
    relatar(`${objeto.destino} (${String(limpezas[indice] ?? 0)} resíduos)`, codificada, limite);
  }
}

/**
 * A cena em retrato (9:16) é a pintura mestre (`01-cena-mestre-9x16`) inteira: o bosque, a ponte de rosas, o lago e o
 * gramado com o muro de pedra, numa composição pensada para o celular. Só o céu dela sai (as árvores, as colinas e o
 * lago ficam), para o céu de verdade, que a história troca de baunilha para pôr do sol, aparecer por trás das folhas.
 * Ela ocupa a chave `lago` do manifesto, a camada do meio, e as camadas das árvores e do primeiro plano ficam vazias
 * na vertical (`vazio.webp`). As medidas da semente e do horizonte são da pintura, em pixels dela.
 */
const SEMENTE_DO_CEU = [571, 386] as const;
const HORIZONTE_DA_PINTURA = 722;
const AREA_DO_BOLSAO_DE_CEU = 60;
/** As nuvens brancas da pintura (claras, soltas, sem tocar a borda) também saem, até este tamanho. */
const FURO_NO_CEU = { area: 14000, luma: 185 } as const;
/** Quantos pixels da borda do recorte pegam a cor das folhas, para não sobrar um contorno claro de céu antigo. */
const PROFUNDIDADE_DA_BORDA_DO_CEU = 2;

async function cenaVertical(): Promise<Quadro4> {
  const limite = LIMITE_DAS_IMAGENS.lago;
  const quadro = await lerQuadro(join(originais, '01-cena-mestre-9x16.png'));
  const removidos = removerCeu(quadro, {
    semente: SEMENTE_DO_CEU,
    limiteDeY: HORIZONTE_DA_PINTURA,
    areaDoBolsao: AREA_DO_BOLSAO_DE_CEU,
    furo: FURO_NO_CEU,
  });
  descontaminarBorda(quadro, PROFUNDIDADE_DA_BORDA_DO_CEU);
  suavizarAlfa(quadro, 1);
  const base = paraSharp(quadro);
  const codificada = await codificarNoLimite(base, quadro.largura, limite);
  const destino = 'assets/scene/01-cena-9x16.webp';
  escrever(join(publico, destino), codificada.buffer);
  relatar(`${destino} (${String(removidos)} px de céu)`, codificada, limite);
  return quadro;
}

/**
 * O primeiro plano da pintura mestre, para ficar à frente do baú e do esquilo: os arbustos de rosas dos cantos de baixo
 * (das linhas a 80% da altura para baixo, o que não parece gramado e é grande). É uma cópia exata dos pixels da cena,
 * com o resto transparente: não muda a imagem, só deixa os arbustos taparem os cantos do baú e o esquilo que passa atrás.
 */
const TOPO_DO_PRIMEIRO_PLANO = 0.8;
const AREA_MINIMA_DO_PRIMEIRO_PLANO = 9000;

async function primeiroPlanoVertical(): Promise<void> {
  const limite = LIMITE_DAS_IMAGENS.primeiroPlano;
  const quadro = await lerQuadro(join(originais, '01-cena-mestre-9x16.png'));
  const mantidos = isolarPrimeiroPlano(quadro, {
    topo: Math.round(quadro.altura * TOPO_DO_PRIMEIRO_PLANO),
    areaMinima: AREA_MINIMA_DO_PRIMEIRO_PLANO,
  });
  suavizarAlfa(quadro, 2);
  const codificada = await codificarNoLimite(paraSharp(quadro), quadro.largura, limite);
  const destino = 'assets/scene/01-cena-9x16-frente.webp';
  escrever(join(publico, destino), codificada.buffer);
  relatar(`${destino} (${String(mantidos)} px de arbustos)`, codificada, limite);
}

/**
 * A cena do computador (16:9) também é a pintura mestre (`01-cena-mestre-16x9`): o bosque, o lago, o muro de pedra à beira
 * dele e o gramado onde o baú se assenta, com os arbustos de rosas nos cantos (09/11/2026; antes o computador usava
 * camadas separadas, sem o muro, e o baú ficava sobre a água). Como na vertical, só o céu sai, e ela ocupa a chave `lago`
 * (variante `computador`); as árvores e o primeiro plano seguem a mesma ideia da vertical. O céu da pintura tem partes
 * quentes, que `removerCeu` pega, e partes pálidas e cinzentas no alto, que `expandirCeuPalido` completa. As medidas da
 * semente e do horizonte são da pintura, em pixels dela (1672 × 941).
 */
const SEMENTE_DO_CEU_16X9 = [931, 215] as const;
const HORIZONTE_DA_PINTURA_16X9 = 335;
const LUMINANCIA_DO_CEU_PALIDO = 185;

async function cenaComputador(): Promise<void> {
  const limite = LIMITE_DAS_IMAGENS.lago;
  const quadro = await lerQuadro(join(originais, '01-cena-mestre-16x9.png'));
  const quentes = removerCeu(quadro, {
    semente: SEMENTE_DO_CEU_16X9,
    limiteDeY: HORIZONTE_DA_PINTURA_16X9,
    areaDoBolsao: AREA_DO_BOLSAO_DE_CEU,
    furo: FURO_NO_CEU,
  });
  const palidos = expandirCeuPalido(quadro, {
    limiteDeY: HORIZONTE_DA_PINTURA_16X9,
    luminanciaMinima: LUMINANCIA_DO_CEU_PALIDO,
  });
  descontaminarBorda(quadro, PROFUNDIDADE_DA_BORDA_DO_CEU);
  suavizarAlfa(quadro, 1);
  const codificada = await codificarNoLimite(paraSharp(quadro), quadro.largura, limite);
  const destino = 'assets/scene/01-cena-16x9.webp';
  escrever(join(publico, destino), codificada.buffer);
  relatar(`${destino} (${String(quentes + palidos)} px de céu)`, codificada, limite);
}

/**
 * O primeiro plano da pintura mestre 16:9, a mesma ideia do vertical: os arbustos de rosas dos cantos de baixo (das linhas
 * a 80% da altura para baixo), cópia exata dos pixels da cena com o resto transparente, para taparem o baú e o esquilo que
 * passa atrás sem mudar a imagem.
 */
async function primeiroPlanoComputador(): Promise<void> {
  const limite = LIMITE_DAS_IMAGENS.primeiroPlano;
  const quadro = await lerQuadro(join(originais, '01-cena-mestre-16x9.png'));
  const mantidos = isolarPrimeiroPlano(quadro, {
    topo: Math.round(quadro.altura * TOPO_DO_PRIMEIRO_PLANO),
    areaMinima: AREA_MINIMA_DO_PRIMEIRO_PLANO,
  });
  suavizarAlfa(quadro, 2);
  const codificada = await codificarNoLimite(paraSharp(quadro), quadro.largura, limite);
  const destino = 'assets/scene/01-cena-16x9-frente.webp';
  escrever(join(publico, destino), codificada.buffer);
  relatar(`${destino} (${String(mantidos)} px de arbustos)`, codificada, limite);
}

/**
 * O chão sob o convite (09/11/2026 no computador; 10/11/2026 no celular): quando a cena sobe e a carta abre, a base da tela
 * fica sem pintura. Em vez do verde chapado, ou de uma imagem minúscula ampliada (um borrão fosco, que o casal não quis), a
 * faixa é gramado de verdade: um retalho do gramado da própria pintura mestre (do centro, sem rosas) ladrilhado, cada
 * ladrilho virado em relação ao vizinho, o que torna as emendas invisíveis num gramado. O retalho cai exatamente na posição
 * dele na pintura, e a primeira linha de ladrilhos vem de cabeça para baixo: a borda de cima da faixa é a última linha do
 * gramado, a que está junto da borda de baixo da pintura. A CSS esmaece a borda de cima sobre a pintura. As medidas do
 * retalho são frações da pintura.
 */
interface TiraDeGramado {
  /** O arquivo da pintura mestre em `arte/originais`. */
  readonly pintura: string;
  readonly retalho: { esquerda: number; largura: number; topo: number; altura: number };
  /** Largura da faixa em pixels; sem ela, a da pintura. */
  readonly largura?: number;
  readonly altura: number;
  readonly destino: string;
  readonly limite: number;
}

const RETALHO_DO_GRAMADO = { esquerda: 0.38, largura: 0.29, topo: 0.84, altura: 0.15 } as const;
/** O gramado limpo da pintura vertical (941 × 1672): o centro, acima dos arbustos de rosas dos cantos. */
const RETALHO_DO_GRAMADO_VERTICAL = {
  esquerda: 0.2,
  largura: 0.4,
  topo: 0.74,
  altura: 0.08,
} as const;

async function tiraDeGramado(opcoes: TiraDeGramado): Promise<void> {
  const pintura = sharp(join(originais, opcoes.pintura)).removeAlpha();
  const { width: largura, height: altura } = await pintura.metadata();
  if (!largura || !altura) throw new Error(`A pintura ${opcoes.pintura} não tem tamanho`);
  const larguraDaTira = opcoes.largura ?? largura;
  const retalhoDaPintura = opcoes.retalho;
  const ladrilhoLargura = Math.round(largura * retalhoDaPintura.largura);
  const ladrilhoAltura = Math.round(altura * retalhoDaPintura.altura);
  const retalho = await pintura
    .clone()
    .extract({
      left: Math.round(largura * retalhoDaPintura.esquerda),
      top: Math.round(altura * retalhoDaPintura.topo),
      width: ladrilhoLargura,
      height: ladrilhoAltura,
    })
    .png()
    .toBuffer();
  // As quatro posições do ladrilho: [virado na vertical?, virado na horizontal?].
  const variantes = new Map<string, Buffer>();
  for (const [vertical, horizontal] of [
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ] as const) {
    let imagem = sharp(retalho);
    if (vertical) imagem = imagem.flip();
    if (horizontal) imagem = imagem.flop();
    variantes.set(`${String(vertical)}${String(horizontal)}`, await imagem.png().toBuffer());
  }

  // Margem à esquerda para os ladrilhos que começam antes da borda da faixa (`composite` não aceita posição negativa).
  const margem = ladrilhoLargura * 3;
  const linhas = Math.ceil(opcoes.altura / ladrilhoAltura);
  const origemX = Math.round(largura * retalhoDaPintura.esquerda);
  const ladrilhos: { input: Buffer; left: number; top: number }[] = [];
  for (let linha = 0; linha < linhas; linha++) {
    for (let k = -8; k <= 8; k++) {
      const x = origemX + k * ladrilhoLargura;
      if (x + ladrilhoLargura <= 0 || x >= larguraDaTira) continue;
      const input = variantes.get(`${String(linha % 2 === 0)}${String(Math.abs(k) % 2 === 1)}`);
      if (input) ladrilhos.push({ input, left: margem + x, top: linha * ladrilhoAltura });
    }
  }
  const montado = await sharp({
    create: {
      width: larguraDaTira + margem * 2,
      height: linhas * ladrilhoAltura,
      channels: 3,
      background: { r: 120, g: 130, b: 70 },
    },
  })
    .composite(ladrilhos)
    .png()
    .toBuffer();
  const base = sharp(montado).extract({
    left: margem,
    top: 0,
    width: larguraDaTira,
    height: opcoes.altura,
  });
  const codificada = await codificarNoLimite(base, larguraDaTira, opcoes.limite);
  escrever(join(publico, opcoes.destino), codificada.buffer);
  relatar(opcoes.destino, codificada, opcoes.limite);
}

function chaoDoComputador(): Promise<void> {
  return tiraDeGramado({
    pintura: '01-cena-mestre-16x9.png',
    retalho: RETALHO_DO_GRAMADO,
    altura: 420,
    destino: 'assets/scene/06-chao-computador.webp',
    limite: 160 * 1024,
  });
}

/** O chão de qualquer tela de toque: a faixa mede 1000 px e a CSS a mostra na escala da pintura vertical (cerca de 0,49). */
function chaoDoCelular(): Promise<void> {
  return tiraDeGramado({
    pintura: '01-cena-mestre-9x16.png',
    retalho: RETALHO_DO_GRAMADO_VERTICAL,
    largura: 1000,
    altura: 900,
    destino: 'assets/scene/06-chao-celular.webp',
    limite: 200 * 1024,
  });
}

/** Uma imagem de 1 × 1 transparente: as camadas que na vertical não têm arte (as árvores e o primeiro plano). */
async function vazio(): Promise<void> {
  const buffer = await sharp({
    create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .webp({ lossless: true })
    .toBuffer();
  escrever(join(publico, 'assets/scene/vazio.webp'), buffer);
  console.log(`  assets/scene/vazio.webp ${String(buffer.length)} bytes`);
}

/** O casal veio sem recorte, sobre um fundo cinza liso: o fundo sai a partir das bordas. */
async function casal(): Promise<void> {
  const quadro = await lerQuadro(join(originais, '17-casal-costas.webp'));
  const fundo = removerFundoLiso(quadro, 5) + removerFundoNeutroInterno(quadro, 8, 150);
  // Respingos do fundo que sobraram soltos ao redor do casal.
  removerManchasPequenas(quadro, 60);
  // A borda guarda um pouco do fundo escuro misturado: ganha a cor de dentro, e o alfa suaviza.
  descontaminarBorda(quadro, 4);
  erodirAlfa(quadro, 1);
  suavizarAlfa(quadro, 1);
  const caixa = caixaDoObjeto(quadro);
  if (!caixa) throw new RangeError('O casal sumiu junto com o fundo');
  const recorte = comFolga(caixa, FOLGA_DO_RECORTE, quadro);
  const limite = LIMITE_DAS_IMAGENS.casal;
  const base = paraSharp(quadro).extract({
    left: recorte.esquerda,
    top: recorte.topo,
    width: recorte.largura,
    height: recorte.altura,
  });
  const codificada = await codificarNoLimite(base, Math.min(recorte.largura, 760), limite);
  escrever(join(publico, 'assets/couple/17-casal-costas.webp'), codificada.buffer);
  relatar(`assets/couple/17-casal-costas.webp (${String(fundo)} px de fundo)`, codificada, limite);
}

/**
 * A faixa do meio do papel, sem rosas (de `de` a `ate`, em frações da altura): é o que o miolo da carta
 * repete quando o texto é longo. Tem de bater com `config.carta.papel.corte`.
 */
const CORTE_DO_PAPEL = { de: 0.43, ate: 0.56 } as const;

/**
 * O ladrilho do miolo da carta: a faixa do meio do papel seguida do próprio espelho. Espelhada, a faixa
 * emenda consigo mesma em cima e embaixo (a borda irregular e o filete dourado continuam), e repetida na
 * vertical dá o papel inteiro com a textura de verdade, sem as listras que esticar uma faixa fina deixava.
 */
async function miolo(base: Sharp, largura: number): Promise<void> {
  const limite = LIMITE_DAS_IMAGENS.papelMiolo;
  const { data, info } = await base
    .clone()
    .resize({ width: largura })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const crua = { raw: { width: info.width, height: info.height, channels: info.channels } };
  const topo = Math.round(info.height * CORTE_DO_PAPEL.de);
  const altura = Math.round(info.height * CORTE_DO_PAPEL.ate) - topo;
  const faixa = await sharp(data, crua)
    .extract({ left: 0, top: topo, width: info.width, height: altura })
    .png()
    .toBuffer();
  const espelho = await sharp(faixa).flip().png().toBuffer();
  const ladrilho = await sharp({
    create: {
      width: info.width,
      height: altura * 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: faixa, left: 0, top: 0 },
      { input: espelho, left: 0, top: altura },
    ])
    .png()
    .toBuffer();
  const codificada = await codificarNoLimite(sharp(ladrilho), info.width, limite);
  escrever(join(publico, 'assets/objects/14-papel-miolo.webp'), codificada.buffer);
  relatar('assets/objects/14-papel-miolo.webp', codificada, limite);
}

/**
 * O papel da carta veio com uma moldura de mesa em volta (bege liso). Sai a moldura a partir das
 * bordas, de modo que a borda irregular do papel, com o filete dourado, vire o contorno da imagem; a
 * carta o monta em três partes (topo, miolo, base) sem cortar nada, e a sombra dela segue o contorno.
 * O miolo é um ladrilho espelhado da faixa do meio (`miolo`). Imprime a proporção (altura / largura),
 * que vai para `config.carta.papel`.
 */
async function papel(): Promise<void> {
  const quadro = await lerQuadro(join(originais, '14-papel-carta.png'));
  const fundo = removerFundoLiso(quadro, 18);
  descontaminarBorda(quadro, 3);
  erodirAlfa(quadro, 1);
  suavizarAlfa(quadro, 1);
  const caixa = caixaDoObjeto(quadro);
  if (!caixa) throw new RangeError('O papel sumiu junto com a moldura');
  const recorte = comFolga(caixa, 2, quadro);
  const limite = LIMITE_DAS_IMAGENS.papelCarta;
  const base = paraSharp(quadro).extract({
    left: recorte.esquerda,
    top: recorte.topo,
    width: recorte.largura,
    height: recorte.altura,
  });
  const largura = Math.min(recorte.largura, 900);
  const codificada = await codificarNoLimite(base, largura, limite);
  escrever(join(publico, 'assets/objects/14-papel-carta.webp'), codificada.buffer);
  relatar(
    `assets/objects/14-papel-carta.webp (${String(fundo)} px de moldura)`,
    codificada,
    limite,
  );
  await miolo(base, largura);
  console.log(
    `  papel: proporção ${(recorte.altura / recorte.largura).toFixed(3)} (altura / largura)  → config.carta.papel`,
  );
}

/** Quanto o fundo cinza liso das folhas e do esquilo pode variar e ainda ser fundo, e a área mínima de um objeto. */
const TOLERANCIA_DO_FUNDO_DA_CENA_VIVA = 14;
const AREA_MINIMA_DE_OBJETO = 20000;
const MARGEM_DO_ESQUILO = 24;

/** Copia a região `caixa` de um quadro para um quadro novo. */
function recortarCaixa(quadro: Quadro4, caixa: Caixa): Quadro4 {
  const dados = new Uint8Array(caixa.largura * caixa.altura * 4);
  for (let y = 0; y < caixa.altura; y++) {
    const origem = ((caixa.topo + y) * quadro.largura + caixa.esquerda) * 4;
    dados.set(quadro.dados.subarray(origem, origem + caixa.largura * 4), y * caixa.largura * 4);
  }
  return { largura: caixa.largura, altura: caixa.altura, dados, canais: 4 };
}

async function gravarPng(quadro: Quadro, caminho: string): Promise<void> {
  escrever(caminho, await paraSharp(quadro).png().toBuffer());
}

/** Lê uma imagem com vários objetos sobre fundo cinza liso, tira o fundo e devolve o quadro e a caixa de cada objeto. */
async function lerObjetosDeUmaFolha(arquivo: string, esperados: number) {
  const quadro = await lerQuadro(join(originais, arquivo));
  removerFundoLiso(quadro, TOLERANCIA_DO_FUNDO_DA_CENA_VIVA);
  descontaminarBorda(quadro, 3);
  erodirAlfa(quadro, 1);
  suavizarAlfa(quadro, 1);
  const caixas = caixasDosObjetos(quadro, AREA_MINIMA_DE_OBJETO);
  if (caixas.length !== esperados) {
    throw new RangeError(
      `${arquivo}: esperava ${String(esperados)} objetos e achei ${String(caixas.length)}`,
    );
  }
  return { quadro, caixas };
}

/**
 * As folhas e o esquilo podem vir numa imagem só cada (`20-folhas.webp` com as três folhas lado a lado,
 * `21-esquilo.webp` com as duas poses): aqui elas são repartidas e gravadas, já sem o fundo, nos nomes que o resto do
 * pipeline espera (`20-folha-a.png`…, `21-esquilo-encolhido.png`, `21-esquilo-esticado.png`). As duas poses do esquilo
 * ganham o mesmo quadro (mesmo tamanho, centradas e com a base na mesma linha), porque a troca de pose não pode pular.
 */
async function repartirCenaViva(): Promise<void> {
  if (existsSync(join(originais, '20-folhas.webp'))) {
    const { quadro, caixas } = await lerObjetosDeUmaFolha('20-folhas.webp', 3);
    for (const [indice, letra] of (['a', 'b', 'c'] as const).entries()) {
      const caixa = caixas[indice];
      if (caixa)
        await gravarPng(recortarCaixa(quadro, caixa), join(originais, `20-folha-${letra}.png`));
    }
    console.log('  20-folhas.webp repartida em 20-folha-a, -b e -c');
  }
  if (existsSync(join(originais, '21-esquilo.webp'))) {
    const { quadro, caixas } = await lerObjetosDeUmaFolha('21-esquilo.webp', 2);
    const largura = Math.max(...caixas.map((c) => c.largura)) + 2 * MARGEM_DO_ESQUILO;
    const altura = Math.max(...caixas.map((c) => c.altura)) + 2 * MARGEM_DO_ESQUILO;
    for (const [indice, nome] of (['encolhido', 'esticado'] as const).entries()) {
      const caixa = caixas[indice];
      if (!caixa) continue;
      const pose = recortarCaixa(quadro, caixa);
      const quadroComum = criarQuadro(largura, altura);
      const esquerda = Math.round((largura - caixa.largura) / 2);
      const topo = altura - MARGEM_DO_ESQUILO - caixa.altura;
      for (let y = 0; y < caixa.altura; y++) {
        const origem = y * caixa.largura * 4;
        quadroComum.dados.set(
          pose.dados.subarray(origem, origem + caixa.largura * 4),
          ((topo + y) * largura + esquerda) * 4,
        );
      }
      await gravarPng(quadroComum, join(originais, `21-esquilo-${nome}.png`));
    }
    console.log('  21-esquilo.webp repartida em 21-esquilo-encolhido e -esticado (mesmo quadro)');
  }
}

/**
 * As folhas (20a–c) e as duas poses do esquilo (21a–b) da cena viva: só entram se as imagens definitivas já estiverem em
 * `arte/originais/` (os prompts estão em `docs/specs-cena-viva/prompts-das-imagens-definitivas.md`); enquanto não
 * chegam, a cena usa a arte provisória. As duas poses do esquilo levam o mesmo recorte, para a troca de pose não pular.
 */
async function cenaViva(): Promise<void> {
  await repartirCenaViva();
  const chegou = (nome: string) => existsSync(join(originais, nome));
  for (const letra of ['a', 'b', 'c'] as const) {
    const origem = `20-folha-${letra}.png`;
    if (!chegou(origem)) {
      console.log(`  ${origem} ainda não chegou: a cena usa a folha provisória`);
      continue;
    }
    await objetos(
      [
        {
          origem,
          destino: `assets/objects/20-folha-${letra}.webp`,
          chave: `folha${letra.toUpperCase()}` as 'folhaA',
          largura: 256,
        },
      ],
      { limpar: true },
    );
  }
  const poses = ['21-esquilo-encolhido.png', '21-esquilo-esticado.png'] as const;
  if (!poses.every(chegou)) {
    console.log('  21-esquilo-*.png ainda não chegaram: a cena usa o esquilo provisório');
    return;
  }
  await objetos(
    [
      {
        origem: poses[0],
        destino: 'assets/objects/21-esquilo-encolhido.webp',
        chave: 'esquiloEncolhido',
        largura: 384,
      },
      {
        origem: poses[1],
        destino: 'assets/objects/21-esquilo-esticado.webp',
        chave: 'esquiloEsticado',
        largura: 384,
      },
    ],
    { limpar: true },
  );
}

/** Quanto a chave está inclinada na arte (ponta embaixo à esquerda, argola em cima à direita), em graus. */
const INCLINACAO_DA_CHAVE = 45;

/**
 * A chave entra na fechadura na horizontal: gira a arte pela inclinação dela e mede o comprimento e a
 * ponta. Os números vão para `config.bau.chave` (a cena posiciona a ponta na fechadura por eles).
 */
async function poseDaChave(): Promise<void> {
  const quadro = await lerQuadro(join(publico, 'assets/objects/10-chave.webp'));
  const { comprimento, ponta } = medirPoseGirada(quadro, INCLINACAO_DA_CHAVE);
  const f = (n: number) => n.toFixed(3);
  console.log(
    `  chave na horizontal: comprimento ${f(comprimento)}, ponta (${f(ponta.x)}, ${f(ponta.y)})  → config.bau.chave`,
  );
}

/** Ícones do site: o próprio selo (que já traz as iniciais I&D), recortado em quadrado. */
async function selos(): Promise<void> {
  const quadro = await lerQuadro(join(originais, '15-selo.png'));
  limparRecorte(quadro, 2);
  const caixa = caixaDoObjeto(quadro);
  if (!caixa) throw new RangeError('Selo sem pixels');
  const recorte = comFolga(caixa, 4, quadro);
  const quadrado = Math.max(recorte.largura, recorte.altura);
  const base = await paraSharp(quadro)
    .extract({
      left: recorte.esquerda,
      top: recorte.topo,
      width: recorte.largura,
      height: recorte.altura,
    })
    .resize({
      width: quadrado,
      height: quadrado,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  for (const [arquivo, lado] of [
    ['favicon/favicon-32.png', 32],
    ['favicon/apple-touch-icon.png', 180],
  ] as const) {
    const png = await sharp(base).resize(lado, lado).png({ compressionLevel: 9 }).toBuffer();
    escrever(join(publico, arquivo), png);
    console.log(`  ${arquivo.padEnd(34)} ${String(lado).padStart(5)} px  ${kb(png.length)}`);
  }
}

/**
 * Prévia do WhatsApp (1200 × 630): só o selo com as iniciais, sobre o marfim da carta (ADR-0040). Nem o bosque nem o baú
 * aparecem: o casamento e a cena são a surpresa. O arquivo tem sufixo de versão (`-v2`) porque o WhatsApp guarda a prévia
 * antiga pelo endereço da imagem (RF-10.6).
 */
async function previa(): Promise<void> {
  const largura = 1200;
  const altura = 630;
  const alturaDoSelo = 470;
  const selo = await sharp(join(originais, '15-selo.png'))
    .trim()
    .resize({ height: alturaDoSelo, fit: 'inside' })
    .png()
    .toBuffer();
  const medida = await sharp(selo).metadata();
  const esquerda = Math.round((largura - medida.width) / 2);
  const topo = Math.round((altura - medida.height) / 2) - 6;
  const fundo = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(largura)}" height="${String(altura)}">` +
      `<defs><radialGradient id="f" cx="50%" cy="48%" r="78%"><stop offset="0" stop-color="#fbf9ec"/><stop offset="1" stop-color="#e4dcbc"/></radialGradient>` +
      `<filter id="s" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="16"/></filter></defs>` +
      `<rect width="100%" height="100%" fill="url(#f)"/>` +
      `<ellipse cx="${String(largura / 2)}" cy="${String(topo + medida.height - 18)}" rx="${String(medida.width * 0.36)}" ry="20" fill="#3a2e22" fill-opacity="0.3" filter="url(#s)"/></svg>`,
  );
  const jpg = await sharp(fundo)
    .composite([{ input: selo, left: esquerda, top: topo }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  escrever(join(publico, 'og-image-v2.jpg'), jpg);
  console.log(`  og-image-v2.jpg                    1200 x 630  ${kb(jpg.length)}`);
}

async function main(): Promise<void> {
  // `pnpm arte -- --so-chao`: só as faixas de gramado do rodapé (computador e celular).
  if (process.argv.includes('--so-chao')) {
    console.log('Chão');
    await chaoDoComputador();
    await chaoDoCelular();
    return;
  }
  // `pnpm arte -- --so-previa`: só a imagem da prévia do WhatsApp.
  if (process.argv.includes('--so-previa')) {
    console.log('Prévia');
    await previa();
    return;
  }
  // `pnpm arte -- --so-computador`: só a cena e o primeiro plano do computador, sem refazer o resto.
  if (process.argv.includes('--so-computador')) {
    console.log('Cena do computador');
    await cenaComputador();
    await primeiroPlanoComputador();
    await chaoDoComputador();
    return;
  }
  console.log('Cenas');
  await cena('02-ceu-baunilha-16x9.png', 'assets/scene/02-ceu-baunilha-16x9.webp', 'ceu');
  await cena('02-ceu-baunilha-9x16.png', 'assets/scene/02-ceu-baunilha-9x16.webp', 'ceu');
  await cena(
    '03-ceu-por-do-sol-16x9.png',
    'assets/scene/03-ceu-por-do-sol-16x9.webp',
    'ceuPorDoSol',
  );
  await cena(
    '03-ceu-por-do-sol-9x16.png',
    'assets/scene/03-ceu-por-do-sol-9x16.webp',
    'ceuPorDoSol',
  );

  console.log('Camadas com transparência');
  await objetos(
    [
      {
        origem: '04-lago.png',
        destino: 'assets/scene/04-lago.webp',
        chave: 'lago',
        largura: 1536,
        limite: LIMITE_DO_LAGO_NO_COMPUTADOR,
      },
    ],
    { limpar: false },
  );
  await objetos(
    [
      {
        origem: '05-arvores-16x9.png',
        destino: 'assets/scene/05-arvores-16x9.webp',
        chave: 'arvores',
        largura: 1672,
      },
    ],
    { limpar: true, bordaAberta: true },
  );
  await objetos(
    [
      {
        origem: '06-primeiro-plano.png',
        destino: 'assets/scene/06-primeiro-plano.webp',
        chave: 'primeiroPlano',
        largura: 1536,
      },
    ],
    { limpar: false },
  );
  await cenaVertical();
  await vazio();
  await primeiroPlanoVertical();
  await cenaComputador();
  await primeiroPlanoComputador();
  await chaoDoComputador();
  await chaoDoCelular();

  console.log('Objetos');
  await objetos(
    [
      {
        origem: '08-bau-fechado.png',
        destino: 'assets/objects/08-bau-fechado.webp',
        chave: 'bauFechado',
        largura: 900,
      },
      {
        origem: '09-bau-aberto.png',
        destino: 'assets/objects/09-bau-aberto.webp',
        chave: 'bauAberto',
        largura: 900,
      },
    ],
    { limpar: true, baseNoChao: { fracao: 0.16, forca: 0.4 } },
  );
  await objetos(
    [
      {
        origem: '10-chave.png',
        destino: 'assets/objects/10-chave.webp',
        chave: 'chave',
        largura: 300,
      },
    ],
    { limpar: true },
  );
  await objetos(
    [
      {
        origem: '12-envelope-fechado.png',
        destino: 'assets/objects/12-envelope-fechado.webp',
        chave: 'envelopeFechado',
        largura: 1100,
      },
      {
        origem: '13-envelope-aberto.png',
        destino: 'assets/objects/13-envelope-aberto.webp',
        chave: 'envelopeAberto',
        largura: 1100,
      },
    ],
    { limpar: true },
  );
  await papel();
  await objetos(
    [
      {
        origem: '15-selo.png',
        destino: 'assets/objects/15-selo.webp',
        chave: 'selo',
        largura: 400,
      },
    ],
    { limpar: true },
  );
  for (const letra of ['a', 'b', 'c'] as const) {
    await objetos(
      [
        {
          origem: `16-petala-${letra}.png`,
          destino: `assets/objects/16-petala-${letra}.webp`,
          chave: `petala${letra.toUpperCase()}` as 'petalaA',
          largura: 160,
        },
      ],
      { limpar: true },
    );
  }

  console.log('Cena viva');
  await cenaViva();

  console.log('Casal');
  await casal();

  console.log('Derivados');
  await poseDaChave();
  await selos();
  await previa();
}

await main();
