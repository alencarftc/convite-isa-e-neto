/**
 * Operações sobre os pixels da arte gerada (`pnpm arte`): limpar o recorte, achar a caixa do objeto e
 * tirar o fundo liso. Puras e sem dependências, sobre um quadro RGBA, para testar sem tocar o disco.
 */

/** Quadro RGBA de 8 bits, linha por linha. */
export interface Quadro {
  readonly largura: number;
  readonly altura: number;
  readonly dados: Uint8Array;
}

export interface Caixa {
  readonly esquerda: number;
  readonly topo: number;
  readonly largura: number;
  readonly altura: number;
}

export function criarQuadro(largura: number, altura: number): Quadro {
  return { largura, altura, dados: new Uint8Array(largura * altura * 4) };
}

/** Matiz (0 a 360), saturação e valor (0 a 1) de uma cor RGB. */
export function paraHsv(r: number, g: number, b: number): [number, number, number] {
  const maior = Math.max(r, g, b);
  const menor = Math.min(r, g, b);
  const delta = maior - menor;
  let matiz = 0;
  if (delta > 0) {
    if (maior === r) matiz = ((g - b) / delta) % 6;
    else if (maior === g) matiz = (b - r) / delta + 2;
    else matiz = (r - g) / delta + 4;
    matiz *= 60;
    if (matiz < 0) matiz += 360;
  }
  return [matiz, maior === 0 ? 0 : delta / maior, maior / 255];
}

/**
 * Sobra do recorte por cor: o gerador tirou o fundo com uma cor-chave, e restos dela ficam nas
 * bordas como amarelo e vermelho puros. Nenhuma cor da arte (azuis, cremes, dourados) é tão saturada.
 */
export function ehResiduoDeRecorte(r: number, g: number, b: number): boolean {
  const [matiz, saturacao, valor] = paraHsv(r, g, b);
  if (saturacao < 0.9 || valor < 0.75) return false;
  return matiz <= 25 || matiz >= 335 || (matiz >= 45 && matiz <= 75);
}

/** Alfa quase opaco vira opaco e quase transparente vira transparente: as imagens vieram com 252. */
export function normalizarAlfa(quadro: Quadro, minimo = 10, maximo = 235): void {
  const { dados } = quadro;
  for (let i = 3; i < dados.length; i += 4) {
    const alfa = dados[i] ?? 0;
    if (alfa <= minimo) dados[i] = 0;
    else if (alfa >= maximo) dados[i] = 255;
  }
}

/** Torna transparente todo pixel de resíduo de recorte; devolve quantos foram. */
export function removerResiduosDeRecorte(quadro: Quadro): number {
  const { dados } = quadro;
  let removidos = 0;
  for (let i = 0; i < dados.length; i += 4) {
    if ((dados[i + 3] ?? 0) === 0) continue;
    if (ehResiduoDeRecorte(dados[i] ?? 0, dados[i + 1] ?? 0, dados[i + 2] ?? 0)) {
      dados[i + 3] = 0;
      removidos += 1;
    }
  }
  return removidos;
}

/** O que há além das bordas da imagem, para o filtro de alfa. */
export interface OpcoesDeBorda {
  /**
   * Objeto que sai do quadro (os troncos da moldura de árvores): fora da imagem não é transparente,
   * é "continua". Sem isso, as 2 últimas linhas e colunas esmaecem e desenham um fio na tela.
   */
  readonly bordaAberta?: boolean;
}

/** Filtro de mínimo (ou de máximo) do alfa numa janela de `raio`, em duas passadas. */
function filtrarAlfa(quadro: Quadro, raio: number, maximo: boolean, aberta: boolean): void {
  if (raio <= 0) return;
  const { largura, altura, dados } = quadro;
  const escolher = maximo ? Math.max : Math.min;
  // Fora da imagem: transparente (a borda da tela também é borda do objeto) ou ignorado (bordaAberta).
  const fora = maximo ? 0 : 255;
  const foraDaImagem = aberta ? fora : 0;
  const meio = new Uint8Array(largura * altura);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      let valor = maximo ? 0 : 255;
      for (let dx = -raio; dx <= raio; dx++) {
        const vizinho = x + dx;
        const alfa =
          vizinho < 0 || vizinho >= largura
            ? foraDaImagem
            : (dados[(y * largura + vizinho) * 4 + 3] ?? 0);
        valor = escolher(valor, alfa);
      }
      meio[y * largura + x] = valor;
    }
  }
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      let valor = maximo ? 0 : 255;
      for (let dy = -raio; dy <= raio; dy++) {
        const vizinho = y + dy;
        const alfa =
          vizinho < 0 || vizinho >= altura ? foraDaImagem : (meio[vizinho * largura + x] ?? 0);
        valor = escolher(valor, alfa);
      }
      dados[(y * largura + x) * 4 + 3] = valor;
    }
  }
}

/** Come `raio` pixels da borda do objeto: leva embora o anel contaminado pela cor-chave. */
export function erodirAlfa(quadro: Quadro, raio: number, opcoes: OpcoesDeBorda = {}): void {
  filtrarAlfa(quadro, raio, false, opcoes.bordaAberta ?? false);
}

/** Suaviza o alfa com uma média 3 × 3, `passadas` vezes, para a borda não ficar serrilhada. */
export function suavizarAlfa(quadro: Quadro, passadas = 1): void {
  const { largura, altura, dados } = quadro;
  for (let passada = 0; passada < passadas; passada++) {
    const copia = new Uint8Array(largura * altura);
    for (let i = 0; i < copia.length; i++) copia[i] = dados[i * 4 + 3] ?? 0;
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        let soma = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const vx = x + dx;
            const vy = y + dy;
            if (vx < 0 || vy < 0 || vx >= largura || vy >= altura) continue;
            soma += copia[vy * largura + vx] ?? 0;
            n += 1;
          }
        }
        dados[(y * largura + x) * 4 + 3] = Math.round(soma / n);
      }
    }
  }
}

/** Limpeza completa de um objeto recortado: alfa limpo, sem resíduo, sem anel e com borda suave. */
export function limparRecorte(
  quadro: Quadro,
  raioDeErosao = 2,
  opcoes: OpcoesDeBorda = {},
): { removidos: number } {
  normalizarAlfa(quadro);
  const removidos = removerResiduosDeRecorte(quadro);
  erodirAlfa(quadro, raioDeErosao, opcoes);
  suavizarAlfa(quadro, 1);
  return { removidos };
}

/** Menor caixa que contém todo pixel com alfa acima de `limiar`; `undefined` se não houver nenhum. */
export function caixaDoObjeto(quadro: Quadro, limiar = 16): Caixa | undefined {
  const { largura, altura, dados } = quadro;
  let esquerda = largura;
  let topo = altura;
  let direita = -1;
  let base = -1;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      if ((dados[(y * largura + x) * 4 + 3] ?? 0) <= limiar) continue;
      esquerda = Math.min(esquerda, x);
      direita = Math.max(direita, x);
      topo = Math.min(topo, y);
      base = Math.max(base, y);
    }
  }
  if (direita < 0) return undefined;
  return { esquerda, topo, largura: direita - esquerda + 1, altura: base - topo + 1 };
}

/** União de várias caixas: as imagens de um par (baú fechado e aberto) precisam do mesmo recorte. */
export function unirCaixas(caixas: readonly Caixa[]): Caixa {
  const primeira = caixas[0];
  if (!primeira) throw new RangeError('Nenhuma caixa para unir');
  let esquerda = primeira.esquerda;
  let topo = primeira.topo;
  let direita = primeira.esquerda + primeira.largura;
  let base = primeira.topo + primeira.altura;
  for (const caixa of caixas) {
    esquerda = Math.min(esquerda, caixa.esquerda);
    topo = Math.min(topo, caixa.topo);
    direita = Math.max(direita, caixa.esquerda + caixa.largura);
    base = Math.max(base, caixa.topo + caixa.altura);
  }
  return { esquerda, topo, largura: direita - esquerda, altura: base - topo };
}

/** Acrescenta uma folga em volta da caixa, sem passar dos limites do quadro. */
export function comFolga(caixa: Caixa, folga: number, quadro: Quadro): Caixa {
  const esquerda = Math.max(0, caixa.esquerda - folga);
  const topo = Math.max(0, caixa.topo - folga);
  const direita = Math.min(quadro.largura, caixa.esquerda + caixa.largura + folga);
  const base = Math.min(quadro.altura, caixa.topo + caixa.altura + folga);
  return { esquerda, topo, largura: direita - esquerda, altura: base - topo };
}

/** Cor média dos quatro cantos: o fundo liso das imagens que vieram sem recorte. */
export function corDoFundo(quadro: Quadro): [number, number, number] {
  const { largura, altura, dados } = quadro;
  const cantos: [number, number][] = [
    [0, 0],
    [largura - 1, 0],
    [0, altura - 1],
    [largura - 1, altura - 1],
  ];
  const soma = [0, 0, 0];
  for (const [x, y] of cantos) {
    const i = (y * largura + x) * 4;
    soma[0] = (soma[0] ?? 0) + (dados[i] ?? 0);
    soma[1] = (soma[1] ?? 0) + (dados[i + 1] ?? 0);
    soma[2] = (soma[2] ?? 0) + (dados[i + 2] ?? 0);
  }
  return [(soma[0] ?? 0) / 4, (soma[1] ?? 0) / 4, (soma[2] ?? 0) / 4];
}

/**
 * Tira o fundo liso: a partir das bordas, todo pixel a até `tolerancia` da cor do fundo é fundo
 * (alfa 0). Só o que se liga à borda sai, então um tom escuro dentro do objeto (o cabelo, um
 * sapato) fica. Devolve quantos pixels viraram transparentes.
 */
export function removerFundoLiso(quadro: Quadro, tolerancia: number): number {
  const { largura, altura, dados } = quadro;
  const [fr, fg, fb] = corDoFundo(quadro);
  const visitado = new Uint8Array(largura * altura);
  const fila: number[] = [];
  const ehFundo = (indice: number) => {
    const i = indice * 4;
    return (
      Math.hypot((dados[i] ?? 0) - fr, (dados[i + 1] ?? 0) - fg, (dados[i + 2] ?? 0) - fb) <=
      tolerancia
    );
  };
  const empilhar = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= largura || y >= altura) return;
    const indice = y * largura + x;
    if (visitado[indice] === 1 || !ehFundo(indice)) return;
    visitado[indice] = 1;
    fila.push(indice);
  };
  for (let x = 0; x < largura; x++) {
    empilhar(x, 0);
    empilhar(x, altura - 1);
  }
  for (let y = 0; y < altura; y++) {
    empilhar(0, y);
    empilhar(largura - 1, y);
  }
  let removidos = 0;
  // A fila cresce enquanto é percorrida: o iterador do array confere o tamanho a cada passo.
  for (const indice of fila) {
    dados[indice * 4 + 3] = 0;
    removidos += 1;
    const x = indice % largura;
    const y = Math.floor(indice / largura);
    empilhar(x + 1, y);
    empilhar(x - 1, y);
    empilhar(x, y + 1);
    empilhar(x, y - 1);
  }
  return removidos;
}

/** Componentes conexos (8 vizinhos) de uma máscara: devolve o rótulo de cada pixel e a área de cada rótulo. */
function componentes(
  mascara: Uint8Array,
  largura: number,
  altura: number,
): { rotulos: Int32Array; areas: number[] } {
  const rotulos = new Int32Array(largura * altura).fill(-1);
  const areas: number[] = [];
  const pilha: number[] = [];
  for (let inicio = 0; inicio < mascara.length; inicio++) {
    if (mascara[inicio] !== 1 || rotulos[inicio] !== -1) continue;
    const rotulo = areas.length;
    let area = 0;
    rotulos[inicio] = rotulo;
    pilha.push(inicio);
    for (let topo = pilha.pop(); topo !== undefined; topo = pilha.pop()) {
      area += 1;
      const x = topo % largura;
      const y = Math.floor(topo / largura);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const vx = x + dx;
          const vy = y + dy;
          if (vx < 0 || vy < 0 || vx >= largura || vy >= altura) continue;
          const vizinho = vy * largura + vx;
          if (mascara[vizinho] !== 1 || rotulos[vizinho] !== -1) continue;
          rotulos[vizinho] = rotulo;
          pilha.push(vizinho);
        }
      }
    }
    areas.push(area);
  }
  return { rotulos, areas };
}

/**
 * Tira também o fundo que ficou preso DENTRO do objeto (entre o pescoço e o cabelo, entre o braço e o
 * corpo), onde a varredura a partir das bordas não chega. Só sai uma região contínua de cinza neutro,
 * a até `tolerancia` da cor do fundo, com pelo menos `areaMinima` pixels: as sombras escuras do
 * cabelo e do sapato são pontinhos soltos ou têm cor, e ficam.
 */
export function removerFundoNeutroInterno(
  quadro: Quadro,
  tolerancia: number,
  areaMinima: number,
): number {
  const { largura, altura, dados } = quadro;
  const [fr, fg, fb] = corDoFundo(quadro);
  const mascara = new Uint8Array(largura * altura);
  for (let indice = 0; indice < mascara.length; indice++) {
    if ((dados[indice * 4 + 3] ?? 0) === 0) continue;
    const r = dados[indice * 4] ?? 0;
    const g = dados[indice * 4 + 1] ?? 0;
    const b = dados[indice * 4 + 2] ?? 0;
    const neutro = Math.max(r, g, b) - Math.min(r, g, b) <= 6;
    if (neutro && Math.hypot(r - fr, g - fg, b - fb) <= tolerancia) mascara[indice] = 1;
  }
  const { rotulos, areas } = componentes(mascara, largura, altura);
  let removidos = 0;
  for (let indice = 0; indice < mascara.length; indice++) {
    const rotulo = rotulos[indice] ?? -1;
    if (rotulo < 0 || (areas[rotulo] ?? 0) < areaMinima) continue;
    dados[indice * 4 + 3] = 0;
    removidos += 1;
  }
  return removidos;
}

/** Apaga os pedaços opacos soltos com menos de `areaMinima` pixels: respingos do fundo que sobraram. */
export function removerManchasPequenas(quadro: Quadro, areaMinima: number): number {
  const { largura, altura, dados } = quadro;
  const mascara = new Uint8Array(largura * altura);
  for (let indice = 0; indice < mascara.length; indice++) {
    if ((dados[indice * 4 + 3] ?? 0) > 0) mascara[indice] = 1;
  }
  const { rotulos, areas } = componentes(mascara, largura, altura);
  let removidos = 0;
  for (let indice = 0; indice < mascara.length; indice++) {
    const rotulo = rotulos[indice] ?? -1;
    if (rotulo < 0 || (areas[rotulo] ?? 0) >= areaMinima) continue;
    dados[indice * 4 + 3] = 0;
    removidos += 1;
  }
  return removidos;
}

/**
 * Pinta de novo a borda do objeto com as cores de dentro. Na borda recortada de um fundo escuro, cada
 * pixel é uma mistura de objeto e fundo, e o resultado é um contorno escuro. Das `profundidade`
 * camadas mais externas, a mais interna copia a média dos vizinhos limpos logo abaixo dela, a seguinte
 * copia a anterior, e assim até a borda: a cor "escorre" de dentro para fora.
 */
export function descontaminarBorda(quadro: Quadro, profundidade: number): void {
  const { largura, altura, dados } = quadro;
  const camada = new Int16Array(largura * altura).fill(-1); // -1: ainda não alcançado
  let fronteira: number[] = [];
  const vizinhos = (indice: number): number[] => {
    const x = indice % largura;
    const y = Math.floor(indice / largura);
    const lista: number[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const vx = x + dx;
        const vy = y + dy;
        if (vx >= 0 && vy >= 0 && vx < largura && vy < altura) lista.push(vy * largura + vx);
      }
    }
    return lista;
  };
  const visivel = (indice: number) => (dados[indice * 4 + 3] ?? 0) > 0;
  // Camada 1: pixels visíveis que tocam um transparente (ou a borda do quadro).
  for (let indice = 0; indice < largura * altura; indice++) {
    if (!visivel(indice)) continue;
    const x = indice % largura;
    const y = Math.floor(indice / largura);
    const naBordaDoQuadro = x === 0 || y === 0 || x === largura - 1 || y === altura - 1;
    if (naBordaDoQuadro || vizinhos(indice).some((vizinho) => !visivel(vizinho))) {
      camada[indice] = 1;
      fronteira.push(indice);
    }
  }
  const camadas: number[][] = [fronteira];
  for (let profundidadeAtual = 2; profundidadeAtual <= profundidade + 1; profundidadeAtual++) {
    const proxima: number[] = [];
    for (const indice of fronteira) {
      for (const vizinho of vizinhos(indice)) {
        if (!visivel(vizinho) || camada[vizinho] !== -1) continue;
        camada[vizinho] = profundidadeAtual;
        proxima.push(vizinho);
      }
    }
    camadas.push(proxima);
    fronteira = proxima;
  }
  // Da camada mais interna do anel (profundidade) para fora: cada pixel copia a média dos vizinhos
  // da camada logo abaixo, que já estão limpos.
  for (let atual = profundidade; atual >= 1; atual--) {
    for (const indice of camadas[atual - 1] ?? []) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (const vizinho of vizinhos(indice)) {
        if (camada[vizinho] !== atual + 1) continue;
        r += dados[vizinho * 4] ?? 0;
        g += dados[vizinho * 4 + 1] ?? 0;
        b += dados[vizinho * 4 + 2] ?? 0;
        n += 1;
      }
      if (n === 0) continue;
      dados[indice * 4] = Math.round(r / n);
      dados[indice * 4 + 1] = Math.round(g / n);
      dados[indice * 4 + 2] = Math.round(b / n);
    }
  }
}

/** Ponta e comprimento de um objeto comprido depois de girado, em frações do quadro de origem. */
export interface PoseGirada {
  /** Comprimento (do ponto mais à esquerda ao mais à direita) em frações da largura do quadro. */
  readonly comprimento: number;
  /** Ponto mais à esquerda: x em frações da largura (pode ser negativo: sai do quadro) e y da altura. */
  readonly ponta: { readonly x: number; readonly y: number };
}

/**
 * Gira os pixels visíveis (`graus`, sentido horário, em torno do centro, como o `rotate()` da CSS) e
 * mede o objeto: o comprimento e a ponta (o ponto mais à esquerda, com o `y` médio dos pixels que
 * estão a 2% dela). Serve para a chave que entra na fechadura na horizontal: o que a cena precisa saber
 * é onde fica a ponta e quanto mede a chave depois de girada (`config.bau.chave`).
 */
export function medirPoseGirada(quadro: Quadro, graus: number, limiar = 128): PoseGirada {
  const { largura, altura, dados } = quadro;
  const radianos = (graus * Math.PI) / 180;
  const cos = Math.cos(radianos);
  const sen = Math.sin(radianos);
  const pontos: [number, number][] = [];
  let menorX = Number.POSITIVE_INFINITY;
  let maiorX = Number.NEGATIVE_INFINITY;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      if ((dados[(y * largura + x) * 4 + 3] ?? 0) < limiar) continue;
      const dx = x + 0.5 - largura / 2;
      const dy = y + 0.5 - altura / 2;
      const girado: [number, number] = [dx * cos - dy * sen, dx * sen + dy * cos];
      pontos.push(girado);
      menorX = Math.min(menorX, girado[0]);
      maiorX = Math.max(maiorX, girado[0]);
    }
  }
  if (pontos.length === 0) throw new RangeError('Sem pixels visíveis para medir');
  const margem = (maiorX - menorX) * 0.02;
  const proximos = pontos.filter(([x]) => x <= menorX + margem);
  const yMedio = proximos.reduce((soma, [, y]) => soma + y, 0) / proximos.length;
  return {
    comprimento: (maiorX - menorX) / largura,
    ponta: { x: (menorX + largura / 2) / largura, y: (yMedio + altura / 2) / altura },
  };
}

/**
 * Oclusão de ambiente na base de um objeto: onde ele toca o chão a luz não chega. As `fracao` mais
 * baixas da altura da caixa escurecem em curva suave, de nada no começo a `forca` (0 a 1) na base. Só
 * mexe nas cores dos pixels visíveis; o alfa fica como está.
 */
export function escurecerBase(quadro: Quadro, caixa: Caixa, fracao: number, forca: number): void {
  const { largura, dados } = quadro;
  const base = caixa.topo + caixa.altura;
  const inicio = base - caixa.altura * fracao;
  for (let y = Math.max(0, Math.floor(inicio)); y < Math.min(quadro.altura, base); y++) {
    const t = (y - inicio) / (base - inicio);
    const fator = 1 - forca * t * t;
    for (let x = 0; x < largura; x++) {
      const i = (y * largura + x) * 4;
      if ((dados[i + 3] ?? 0) === 0) continue;
      dados[i] = Math.round((dados[i] ?? 0) * fator);
      dados[i + 1] = Math.round((dados[i + 1] ?? 0) * fator);
      dados[i + 2] = Math.round((dados[i + 2] ?? 0) * fator);
    }
  }
}
