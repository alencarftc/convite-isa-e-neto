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

/** Tamanho das artes de retrato (9:16) das camadas do cenário, em pixels da arte. */
const LARGURA_DO_RETRATO = 941;
const ALTURA_DO_RETRATO = 1672;

/**
 * A moldura de árvores só veio em 16:9. No celular (retrato) o `object-fit: cover` mostraria apenas o meio
 * vazio dela, sem tronco nem copa. O 9:16 é montado com os DOIS lados da mesma arte, cada um do seu canto, com a
 * arte esticada na vertical (`ESCALA_X` menor que `ESCALA_Y`): os troncos ficam finos e altos, com a copa caída
 * sobre o céu, como numa moldura de retrato, e nenhuma fatia é apagada: a arte aparece inteira em vez de
 * esmaecer (o esmaecimento dos troncos os fazia "sumir"). A base da arte (as moitas) esmaece embaixo, onde o
 * primeiro plano a esconde.
 */
const ESCALA_X_DA_MOLDURA = 0.65;
const ESCALA_Y_DA_MOLDURA = 1.55;
const ESMAECIMENTO_DA_BASE = 0.05;

async function molduraVertical(): Promise<void> {
  const limite = LIMITE_DAS_IMAGENS.arvores;
  const quadro = await lerQuadro(join(originais, '05-arvores-16x9.png'));
  limparRecorte(quadro, 2, { bordaAberta: true });
  const largura = Math.round(quadro.largura * ESCALA_X_DA_MOLDURA);
  const altura = Math.round(quadro.altura * ESCALA_Y_DA_MOLDURA);
  const esticada = await paraSharp(quadro)
    .resize(largura, altura, { fit: 'fill' })
    .png()
    .toBuffer();

  const lado = async (esquerda: number) => {
    const { data, info } = await sharp(esticada)
      .extract({ left: esquerda, top: 0, width: LARGURA_DO_RETRATO, height: altura })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    // A base esmaece em linha reta, de cheia a nada, nas últimas linhas.
    const faixa = Math.round(info.height * ESMAECIMENTO_DA_BASE);
    for (let y = info.height - faixa; y < info.height; y++) {
      const peso = (info.height - 1 - y) / faixa;
      for (let x = 0; x < info.width; x++) {
        const indice = (y * info.width + x) * 4 + 3;
        data[indice] = Math.round((data[indice] ?? 0) * peso);
      }
    }
    return { data, info };
  };
  const [esquerdo, direito] = await Promise.all([lado(0), lado(largura - LARGURA_DO_RETRATO)]);
  const montada = await sharp({
    create: {
      width: LARGURA_DO_RETRATO,
      height: ALTURA_DO_RETRATO,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      [esquerdo, direito].map(({ data, info }) => ({
        input: data,
        raw: { width: info.width, height: info.height, channels: 4 as const },
        left: 0,
        top: 0,
      })),
    )
    .raw()
    .toBuffer({ resolveWithObject: true });
  const base = sharp(montada.data, {
    raw: { width: montada.info.width, height: montada.info.height, channels: 4 },
  });
  const codificada = await codificarNoLimite(base, LARGURA_DO_RETRATO, limite);
  const destino = 'assets/scene/05-arvores-9x16.webp';
  escrever(join(publico, destino), codificada.buffer);
  relatar(`${destino} (montada)`, codificada, limite);
}

/**
 * O lago em retrato: a mesma arte, com a água prolongada para baixo pelo espelho das últimas linhas, na mesma
 * escala. Na vertical a camada do lago termina acima da grama e o que ficava entre os dois mostrava o céu por trás
 * das flores ("céu no mar"); com a água continuando até a grama, o buraco some. O espelho é contínuo na emenda.
 */
const LINHAS_DE_AGUA_A_MAIS = 300;
const LARGURA_DO_LAGO_VERTICAL = 1280;

async function lagoVertical(): Promise<void> {
  const limite = LIMITE_DAS_IMAGENS.lago;
  const quadro = await lerQuadro(join(originais, '04-lago.png'));
  normalizarAlfa(quadro);
  const { largura, altura } = quadro;
  const extensao = await paraSharp(quadro)
    .extract({
      left: 0,
      top: altura - LINHAS_DE_AGUA_A_MAIS,
      width: largura,
      height: LINHAS_DE_AGUA_A_MAIS,
    })
    .flip()
    .png()
    .toBuffer();
  const inteiro = await paraSharp(quadro).png().toBuffer();
  const montada = await sharp({
    create: {
      width: largura,
      height: altura + LINHAS_DE_AGUA_A_MAIS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: inteiro, left: 0, top: 0 },
      { input: extensao, left: 0, top: altura },
    ])
    .png()
    .toBuffer();
  const codificada = await codificarNoLimite(sharp(montada), LARGURA_DO_LAGO_VERTICAL, limite);
  const destino = 'assets/scene/04-lago-9x16.webp';
  escrever(join(publico, destino), codificada.buffer);
  relatar(`${destino} (água prolongada)`, codificada, limite);
}

/**
 * O primeiro plano em retrato: o recorte cheio só mostrava o meio, com pouca flor. Aqui é um mosaico dos dois
 * cantos da arte (os maciços de rosas), com uma emenda esmaecida no meio, como no computador. `ESCALA_DO_MOSAICO`
 * é a razão entre a arte e o mosaico (maior = rosas maiores).
 */
const LARGURA_DO_MOSAICO = 1100;
const ALTURA_DO_MOSAICO = 683;
const ESCALA_DO_MOSAICO = 1.3;
const EMENDA_DO_MOSAICO = 140;

async function primeiroPlanoVertical(): Promise<Quadro4> {
  const limite = LIMITE_DAS_IMAGENS.primeiroPlano;
  const quadro = await lerQuadro(join(originais, '06-primeiro-plano.png'));
  normalizarAlfa(quadro);
  const caixa = caixaDoObjeto(quadro);
  if (!caixa) throw new RangeError('Primeiro plano sem nenhum pixel visível');
  const recorte = await paraSharp(quadro)
    .extract({
      left: 0,
      top: caixa.topo,
      width: quadro.largura,
      height: quadro.altura - caixa.topo,
    })
    .resize({
      height: ALTURA_DO_MOSAICO,
      fit: 'fill',
      width: Math.round(quadro.largura * ESCALA_DO_MOSAICO),
    })
    .png()
    .toBuffer();
  const meta = await sharp(recorte).metadata();
  const larguraDaArte = meta.width;
  const metade = LARGURA_DO_MOSAICO / 2 + EMENDA_DO_MOSAICO / 2;

  const lado = async (esquerda: number, esmaece: boolean) => {
    const { data, info } = await sharp(recorte)
      .extract({ left: esquerda, top: 0, width: metade, height: ALTURA_DO_MOSAICO })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Só o lado direito esmaece, na borda voltada ao centro, em curva suave: o esquerdo fica inteiro por baixo,
    // então a emenda mistura as cores sem abrir um buraco de transparência no meio.
    if (esmaece) {
      for (let x = 0; x < EMENDA_DO_MOSAICO; x++) {
        const u = x / EMENDA_DO_MOSAICO;
        const peso = u * u * (3 - 2 * u);
        for (let y = 0; y < info.height; y++) {
          const indice = (y * info.width + x) * 4 + 3;
          data[indice] = Math.round((data[indice] ?? 0) * peso);
        }
      }
    }
    return { data, info };
  };
  const [esquerdo, direito] = await Promise.all([
    lado(0, false),
    lado(larguraDaArte - metade, true),
  ]);
  const montado = await sharp({
    create: {
      width: LARGURA_DO_MOSAICO,
      height: ALTURA_DO_MOSAICO,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: esquerdo.data,
        raw: { width: esquerdo.info.width, height: esquerdo.info.height, channels: 4 },
        left: 0,
        top: 0,
      },
      {
        input: direito.data,
        raw: { width: direito.info.width, height: direito.info.height, channels: 4 },
        left: LARGURA_DO_MOSAICO - direito.info.width,
        top: 0,
      },
    ])
    .raw()
    .toBuffer({ resolveWithObject: true });
  const codificada = await codificarNoLimite(
    sharp(montado.data, {
      raw: { width: LARGURA_DO_MOSAICO, height: ALTURA_DO_MOSAICO, channels: 4 },
    }),
    LARGURA_DO_MOSAICO,
    limite,
  );
  const destino = 'assets/scene/06-primeiro-plano-9x16.webp';
  escrever(join(publico, destino), codificada.buffer);
  relatar(`${destino} (mosaico)`, codificada, limite);
  return {
    largura: LARGURA_DO_MOSAICO,
    altura: ALTURA_DO_MOSAICO,
    dados: new Uint8Array(montado.data.buffer, montado.data.byteOffset, montado.data.byteLength),
    canais: 4,
  };
}

/**
 * O chão sob o convite: quando a cena sobe (a carta abre), a base da tela fica sem arte. Em vez de um espelho do
 * primeiro plano (que aparecia como uma imagem duplicada), a faixa continua as cores da borda de baixo dele, em
 * degradê para um tom médio mais escuro: uma imagem minúscula, ampliada pelo navegador, que vira um borrão
 * suave de grama fora de foco. As primeiras linhas são transparentes e ganham corpo aos poucos: a faixa começa
 * um pouco acima da borda do primeiro plano e se mistura com ele, sem deixar uma linha de emenda.
 */
const COLUNAS_DO_CHAO = 12;
/** Linhas da faixa e quantas delas, no alto, entram em degradê de transparência (a emenda com o primeiro plano). */
const LINHAS_DO_CHAO = 48;
const LINHAS_DA_EMENDA = 6;

async function chao(quadro: Quadro, destino: string): Promise<void> {
  const limite = LIMITE_DAS_IMAGENS.chao;
  const faixa = Math.max(1, Math.round(quadro.altura * 0.04));
  const medias: number[][] = [];
  for (let c = 0; c < COLUNAS_DO_CHAO; c++) {
    const x0 = Math.floor((c * quadro.largura) / COLUNAS_DO_CHAO);
    const x1 = Math.floor(((c + 1) * quadro.largura) / COLUNAS_DO_CHAO);
    const soma = [0, 0, 0];
    let peso = 0;
    for (let y = quadro.altura - faixa; y < quadro.altura; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * quadro.largura + x) * 4;
        const a = (quadro.dados[i + 3] ?? 0) / 255;
        soma[0] = (soma[0] ?? 0) + (quadro.dados[i] ?? 0) * a;
        soma[1] = (soma[1] ?? 0) + (quadro.dados[i + 1] ?? 0) * a;
        soma[2] = (soma[2] ?? 0) + (quadro.dados[i + 2] ?? 0) * a;
        peso += a;
      }
    }
    medias.push(peso > 0 ? soma.map((s) => s / peso) : [90, 100, 60]);
  }
  const geral = [0, 1, 2].map(
    (canal) => medias.reduce((s, m) => s + (m[canal] ?? 0), 0) / medias.length,
  );
  const dados = Buffer.alloc(COLUNAS_DO_CHAO * LINHAS_DO_CHAO * 4);
  for (let l = 0; l < LINHAS_DO_CHAO; l++) {
    const t = Math.max(0, l - LINHAS_DA_EMENDA) / (LINHAS_DO_CHAO - 1 - LINHAS_DA_EMENDA);
    const emenda = Math.min(1, l / LINHAS_DA_EMENDA);
    for (let c = 0; c < COLUNAS_DO_CHAO; c++) {
      const origem = (l * COLUNAS_DO_CHAO + c) * 4;
      for (let canal = 0; canal < 3; canal++) {
        const cor = (medias[c]?.[canal] ?? 0) * (1 - 0.8 * t) + (geral[canal] ?? 0) * 0.8 * t;
        dados[origem + canal] = Math.round(cor * (1 - 0.12 * t));
      }
      dados[origem + 3] = Math.round(255 * emenda * emenda * (3 - 2 * emenda));
    }
  }
  const buffer = await sharp(dados, {
    raw: { width: COLUNAS_DO_CHAO, height: LINHAS_DO_CHAO, channels: 4 },
  })
    .webp({ quality: 80, alphaQuality: 100 })
    .toBuffer();
  escrever(join(publico, destino), buffer);
  relatar(destino, { buffer, qualidade: 80, largura: COLUNAS_DO_CHAO }, limite);
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
  await lagoVertical();
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
  const retrato = await primeiroPlanoVertical();
  await chao(retrato, 'assets/scene/06-chao-9x16.webp');
  // O chão do computador vem da borda de baixo do primeiro plano em 16:9.
  const paisagem = await lerQuadro(join(originais, '06-primeiro-plano.png'));
  normalizarAlfa(paisagem);
  await chao(paisagem, 'assets/scene/06-chao-16x9.webp');

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
