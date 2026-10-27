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
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import sharp, { type Sharp } from 'sharp';

import { LIMITE_DAS_IMAGENS } from '../verificar/orcamento';
import {
  caixaDoObjeto,
  comFolga,
  descontaminarBorda,
  erodirAlfa,
  escurecerBase,
  limparRecorte,
  medirPoseGirada,
  normalizarAlfa,
  type Quadro,
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
    const limite = LIMITE_DAS_IMAGENS[objeto.chave];
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

/** Quanto da largura vertical cada lado da moldura de árvores cobre: um terço, para o lago e o céu aparecerem. */
const COBERTURA_DA_MOLDURA_VERTICAL = 0.33;
/**
 * Quanto da altura vertical a moldura cobre, contada do alto: as copas ficam no alto e os troncos descem até
 * aqui, onde o primeiro plano (grama e rosas, na base da tela) os esconde. Em escala cheia (1,0) os troncos
 * ocupavam quase metade da largura do celular.
 */
const ALTURA_DA_MOLDURA_VERTICAL = 0.9;
/**
 * Fração da fatia, do lado voltado ao centro, que esmaece até sumir. Embaixo, onde está o tronco, o
 * esmaecimento é curto (o tronco fica inteiro); no alto, onde a copa é cortada pela fatia, é longo, para a
 * folhagem se desfazer aos poucos em vez de terminar numa parede vertical.
 */
const ESMAECIMENTO_DO_TRONCO = 0.15;
const ESMAECIMENTO_DA_COPA = 0.7;
/** A copa vai do alto até esta fração da altura; o tronco começa a esta outra (transição suave entre as duas). */
const COPA_ATE = 0.28;
const TRONCO_DESDE = 0.55;

/**
 * A moldura de árvores só veio em 16:9. No celular (retrato) o `object-fit: cover` mostraria apenas o
 * meio vazio dela, sem nenhum tronco, então o 9:16 é montado com as duas laterais da mesma arte, em escala
 * menor que a da altura inteira (as árvores tomavam quase metade da tela): cada tronco no seu canto, a copa
 * no alto, os galhos esmaecendo em direção ao centro.
 */
async function molduraVertical(): Promise<void> {
  const largura = 941;
  const altura = 1672;
  const limite = LIMITE_DAS_IMAGENS.arvores;
  const quadro = await lerQuadro(join(originais, '05-arvores-16x9.png'));
  limparRecorte(quadro, 2, { bordaAberta: true });
  const escala = (altura * ALTURA_DA_MOLDURA_VERTICAL) / quadro.altura;
  const fatia = Math.round((largura * COBERTURA_DA_MOLDURA_VERTICAL) / escala);

  const lado = async (esquerda: number, paraADireita: boolean) => {
    const { data, info } = await paraSharp(quadro)
      .extract({ left: esquerda, top: 0, width: fatia, height: quadro.altura })
      .resize({ height: Math.round(quadro.altura * escala) })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const suave = (t: number) => t * t * (3 - 2 * t);
    for (let y = 0; y < info.height; y++) {
      // 0 na copa, 1 no tronco: a largura do esmaecimento passa de um valor ao outro sem degrau
      const altura = y / info.height;
      const tronco = suave(
        Math.min(1, Math.max(0, (altura - COPA_ATE) / (TRONCO_DESDE - COPA_ATE))),
      );
      const faixa = Math.round(
        info.width *
          (ESMAECIMENTO_DA_COPA + (ESMAECIMENTO_DO_TRONCO - ESMAECIMENTO_DA_COPA) * tronco),
      );
      for (let x = 0; x < faixa; x++) {
        // 0 na ponta voltada ao centro, 1 onde o esmaecimento termina (curva suave, sem degrau)
        const peso = suave(x / faixa);
        const coluna = paraADireita ? info.width - 1 - x : x;
        const indice = (y * info.width + coluna) * 4 + 3;
        data[indice] = Math.round((data[indice] ?? 0) * peso);
      }
    }
    return { data, info };
  };

  const [esquerdo, direito] = await Promise.all([
    lado(0, true),
    lado(quadro.largura - fatia, false),
  ]);
  const montada = await sharp({
    create: {
      width: largura,
      height: altura,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      [esquerdo, direito].map(({ data, info }, indice) => ({
        input: data,
        raw: { width: info.width, height: info.height, channels: 4 as const },
        left: indice === 0 ? 0 : largura - info.width,
        top: 0,
      })),
    )
    .raw()
    .toBuffer({ resolveWithObject: true });
  const base = sharp(montada.data, {
    raw: { width: montada.info.width, height: montada.info.height, channels: 4 },
  });
  const codificada = await codificarNoLimite(base, largura, limite);
  const destino = 'assets/scene/05-arvores-9x16.webp';
  escrever(join(publico, destino), codificada.buffer);
  relatar(`${destino} (montada)`, codificada, limite);
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
 * O papel da carta veio com uma moldura de mesa em volta (bege liso). Sai a moldura a partir das
 * bordas, de modo que a borda irregular do papel, com o filete dourado, vire o contorno da imagem; a
 * carta a estica em três partes (topo, meio, base) sem cortar nada, e a sombra dela segue o contorno.
 * Imprime a proporção (altura / largura) e a faixa do meio, que vão para `config.carta.papel`.
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
  const codificada = await codificarNoLimite(base, Math.min(recorte.largura, 900), limite);
  escrever(join(publico, 'assets/objects/14-papel-carta.webp'), codificada.buffer);
  relatar(
    `assets/objects/14-papel-carta.webp (${String(fundo)} px de moldura)`,
    codificada,
    limite,
  );
  console.log(
    `  papel: proporção ${(recorte.altura / recorte.largura).toFixed(3)} (altura / largura)  → config.carta.papel`,
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

/** Prévia do WhatsApp (1200 × 630): o bosque, o selo com as iniciais e o baú. */
async function previa(): Promise<void> {
  const largura = 1200;
  const altura = 630;
  const cenaMestre = join(originais, '01-cena-mestre-16x9.png');
  const meta = await sharp(cenaMestre).metadata();
  const alturaDoRecorte = Math.round((meta.width * altura) / largura);
  const fundo = await sharp(cenaMestre)
    .removeAlpha()
    .extract({
      left: 0,
      top: Math.round((meta.height - alturaDoRecorte) * 0.7),
      width: meta.width,
      height: alturaDoRecorte,
    })
    .resize(largura, altura)
    .toBuffer();

  const bau = await sharp(join(publico, 'assets/objects/08-bau-fechado.webp'))
    .resize({ width: 330 })
    .toBuffer();
  const bauMeta = await sharp(bau).metadata();
  const larguraDoSelo = 270;
  const selo = await sharp(join(publico, 'assets/objects/15-selo.webp'))
    .resize({ width: larguraDoSelo })
    .toBuffer();
  const brilho = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(largura)}" height="${String(altura)}">` +
      `<defs><radialGradient id="b" cx="50%" cy="30%" r="38%"><stop offset="0" stop-color="#f6f3e0" stop-opacity="0.85"/><stop offset="1" stop-color="#f6f3e0" stop-opacity="0"/></radialGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#b)"/></svg>`,
  );
  const jpg = await sharp(fundo)
    .composite([
      { input: brilho },
      { input: selo, left: Math.round((largura - larguraDoSelo) / 2), top: 36 },
      {
        input: bau,
        left: Math.round((largura - 330) / 2),
        top: altura - bauMeta.height - 24,
      },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  escrever(join(publico, 'og-image.jpg'), jpg);
  console.log(`  og-image.jpg                       1200 x 630  ${kb(jpg.length)}`);
}

async function main(): Promise<void> {
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
    [{ origem: '04-lago.png', destino: 'assets/scene/04-lago.webp', chave: 'lago', largura: 1536 }],
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
  await molduraVertical();
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
  for (const [letra, chave] of [
    ['a', 'balaoA'],
    ['b', 'balaoB'],
    ['c', 'balaoC'],
  ] as const) {
    await objetos(
      [
        {
          origem: `11-balao-${letra}.png`,
          destino: `assets/objects/11-balao-${letra}.webp`,
          chave,
          largura: 640,
        },
      ],
      { limpar: true },
    );
  }
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

  console.log('Casal');
  await casal();

  console.log('Derivados');
  await poseDaChave();
  await selos();
  await previa();
}

await main();
