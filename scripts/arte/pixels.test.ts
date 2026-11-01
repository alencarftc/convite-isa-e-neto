import { describe, expect, it } from 'vitest';

import {
  caixaDoObjeto,
  comFolga,
  corDoFundo,
  criarQuadro,
  descontaminarBorda,
  ehResiduoDeRecorte,
  erodirAlfa,
  escurecerBase,
  limparRecorte,
  medirPoseGirada,
  normalizarAlfa,
  paraHsv,
  pontuacaoDeCeu,
  type Quadro,
  removerCeu,
  removerFundoLiso,
  removerFundoNeutroInterno,
  removerManchasPequenas,
  removerResiduosDeRecorte,
  suavizarAlfa,
  unirCaixas,
} from './pixels';

/** Quadro de `largura` × `altura` com o pixel `(x, y)` definido pela função, em RGBA. */
function quadroDe(
  largura: number,
  altura: number,
  cor: (x: number, y: number) => [number, number, number, number],
): Quadro {
  const quadro = criarQuadro(largura, altura);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      quadro.dados.set(cor(x, y), (y * largura + x) * 4);
    }
  }
  return quadro;
}

const alfaEm = (quadro: Quadro, x: number, y: number) =>
  quadro.dados[(y * quadro.largura + x) * 4 + 3];

describe('paraHsv', () => {
  it('lê o matiz, a saturação e o valor das cores primárias e do cinza', () => {
    expect(paraHsv(255, 0, 0)).toEqual([0, 1, 1]);
    expect(paraHsv(255, 255, 0)).toEqual([60, 1, 1]);
    expect(paraHsv(0, 0, 255)).toEqual([240, 1, 1]);
    expect(paraHsv(128, 128, 128)[1]).toBe(0);
    expect(paraHsv(0, 0, 0)).toEqual([0, 0, 0]);
  });
});

describe('ehResiduoDeRecorte', () => {
  it('pega o amarelo e o vermelho puros da cor-chave', () => {
    expect(ehResiduoDeRecorte(255, 255, 0)).toBe(true);
    expect(ehResiduoDeRecorte(250, 20, 10)).toBe(true);
    expect(ehResiduoDeRecorte(255, 215, 0)).toBe(true); // amarelo-ouro saturadíssimo
  });

  it('não pega as cores da arte: dourado do baú, creme do papel, azul das pétalas, marrom da madeira', () => {
    expect(ehResiduoDeRecorte(177, 142, 74)).toBe(false); // dourado do projeto
    expect(ehResiduoDeRecorte(234, 191, 121)).toBe(false); // dourado claro do baú
    expect(ehResiduoDeRecorte(248, 237, 217)).toBe(false); // papel
    expect(ehResiduoDeRecorte(145, 168, 208)).toBe(false); // azul
    expect(ehResiduoDeRecorte(138, 90, 59)).toBe(false); // madeira
    expect(ehResiduoDeRecorte(0, 0, 0)).toBe(false);
  });
});

describe('normalizarAlfa', () => {
  it('quase opaco vira opaco, quase transparente vira transparente e o meio fica', () => {
    const quadro = quadroDe(4, 1, (x) => [0, 0, 0, [252, 5, 128, 235][x] ?? 0]);

    normalizarAlfa(quadro);

    expect([0, 1, 2, 3].map((x) => alfaEm(quadro, x, 0))).toEqual([255, 0, 128, 255]);
  });
});

describe('removerResiduosDeRecorte', () => {
  it('apaga só os pixels de resíduo e diz quantos foram', () => {
    const quadro = quadroDe(3, 1, (x) => (x === 1 ? [255, 255, 0, 255] : [177, 142, 74, 255]));

    expect(removerResiduosDeRecorte(quadro)).toBe(1);
    expect([0, 1, 2].map((x) => alfaEm(quadro, x, 0))).toEqual([255, 0, 255]);
  });

  it('ignora o que já é transparente', () => {
    const quadro = quadroDe(2, 1, () => [255, 255, 0, 0]);

    expect(removerResiduosDeRecorte(quadro)).toBe(0);
  });
});

describe('erodirAlfa', () => {
  it('come a borda do objeto na medida do raio', () => {
    const quadro = quadroDe(9, 9, (x, y) => [
      0,
      0,
      0,
      x >= 2 && x <= 6 && y >= 2 && y <= 6 ? 255 : 0,
    ]);

    erodirAlfa(quadro, 1);

    expect(alfaEm(quadro, 2, 2)).toBe(0);
    expect(alfaEm(quadro, 3, 3)).toBe(255);
    expect(alfaEm(quadro, 5, 5)).toBe(255);
    expect(alfaEm(quadro, 6, 6)).toBe(0);
  });

  it('a borda do quadro também conta como borda: o objeto encostado nela encolhe', () => {
    const quadro = quadroDe(4, 4, () => [0, 0, 0, 255]);

    erodirAlfa(quadro, 1);

    expect(alfaEm(quadro, 0, 0)).toBe(0);
    expect(alfaEm(quadro, 1, 1)).toBe(255);
  });

  it('com a borda aberta, o objeto que sai do quadro continua até a borda (troncos da moldura)', () => {
    // Objeto que ocupa a coluna da esquerda e sai pela borda esquerda e pelas de cima e de baixo.
    const quadro = quadroDe(6, 6, (x) => [0, 0, 0, x <= 2 ? 255 : 0]);

    erodirAlfa(quadro, 1, { bordaAberta: true });

    expect(alfaEm(quadro, 0, 0)).toBe(255);
    expect(alfaEm(quadro, 0, 5)).toBe(255);
    expect(alfaEm(quadro, 1, 3)).toBe(255);
    // a borda real do objeto (com transparência do lado) continua sendo comida
    expect(alfaEm(quadro, 2, 3)).toBe(0);
  });

  it('raio zero não mexe em nada', () => {
    const quadro = quadroDe(3, 3, () => [0, 0, 0, 255]);

    erodirAlfa(quadro, 0);

    expect(alfaEm(quadro, 0, 0)).toBe(255);
  });
});

describe('suavizarAlfa', () => {
  it('faz a borda dura virar um degrau intermediário', () => {
    const quadro = quadroDe(5, 1, (x) => [0, 0, 0, x < 2 ? 255 : 0]);

    suavizarAlfa(quadro);

    expect(alfaEm(quadro, 1, 0)).toBeGreaterThan(0);
    expect(alfaEm(quadro, 1, 0)).toBeLessThan(255);
    expect(alfaEm(quadro, 4, 0)).toBe(0);
  });
});

describe('limparRecorte', () => {
  it('tira o resíduo amarelo da borda do objeto e deixa o centro', () => {
    const quadro = quadroDe(12, 12, (x, y) => {
      const dentro = x >= 2 && x <= 9 && y >= 2 && y <= 9;
      const borda = dentro && (x === 2 || x === 9 || y === 2 || y === 9);
      if (!dentro) return [0, 0, 0, 0];
      return borda ? [255, 255, 0, 252] : [177, 142, 74, 252];
    });

    const { removidos } = limparRecorte(quadro, 1);

    expect(removidos).toBeGreaterThan(0);
    expect(alfaEm(quadro, 2, 2)).toBe(0);
    expect(alfaEm(quadro, 5, 5)).toBeGreaterThan(200);
  });
});

describe('caixaDoObjeto, unirCaixas e comFolga', () => {
  const quadro = quadroDe(10, 8, (x, y) => [
    0,
    0,
    0,
    x >= 3 && x <= 5 && y >= 2 && y <= 6 ? 255 : 0,
  ]);

  it('acha a menor caixa que contém o objeto', () => {
    expect(caixaDoObjeto(quadro)).toEqual({ esquerda: 3, topo: 2, largura: 3, altura: 5 });
  });

  it('quadro vazio não tem caixa', () => {
    expect(caixaDoObjeto(criarQuadro(4, 4))).toBeUndefined();
  });

  it('une caixas (o recorte de um par de imagens é o mesmo)', () => {
    expect(
      unirCaixas([
        { esquerda: 3, topo: 2, largura: 3, altura: 5 },
        { esquerda: 1, topo: 4, largura: 2, altura: 4 },
      ]),
    ).toEqual({ esquerda: 1, topo: 2, largura: 5, altura: 6 });
    expect(() => unirCaixas([])).toThrow(RangeError);
  });

  it('põe folga em volta sem passar dos limites do quadro', () => {
    expect(comFolga({ esquerda: 3, topo: 2, largura: 3, altura: 5 }, 2, quadro)).toEqual({
      esquerda: 1,
      topo: 0,
      largura: 7,
      altura: 8,
    });
  });
});

describe('removerFundoLiso', () => {
  /** Fundo cinza 40, um objeto de cor viva e um "cabelo" escuro, de cor próxima à do fundo. */
  const cena = () =>
    quadroDe(14, 14, (x, y) => {
      if (x >= 4 && x <= 9 && y >= 4 && y <= 9) return [100, 150, 220, 255]; // objeto
      if (x >= 6 && x <= 7 && y >= 2 && y <= 3) return [39, 28, 27, 255]; // cabelo, tom escuro
      return [40, 40, 40, 255];
    });

  it('a cor do fundo vem dos quatro cantos', () => {
    expect(corDoFundo(cena())).toEqual([40, 40, 40]);
  });

  it('tira o fundo ligado à borda e preserva o objeto e o tom escuro que o toca', () => {
    const quadro = cena();

    const removidos = removerFundoLiso(quadro, 5);

    expect(alfaEm(quadro, 0, 0)).toBe(0);
    expect(alfaEm(quadro, 13, 13)).toBe(0);
    expect(alfaEm(quadro, 5, 5)).toBe(255); // objeto
    expect(alfaEm(quadro, 6, 2)).toBe(255); // cabelo, a 12 de distância do fundo: fora da tolerância
    expect(removidos).toBe(14 * 14 - 36 - 4);
  });

  it('fundo parecido DENTRO do objeto (sem ligação com a borda) não sai', () => {
    const quadro = quadroDe(9, 9, (x, y) => {
      if (x === 4 && y === 4) return [40, 40, 40, 255]; // furo com a cor do fundo
      if (x >= 2 && x <= 6 && y >= 2 && y <= 6) return [200, 200, 200, 255];
      return [40, 40, 40, 255];
    });

    removerFundoLiso(quadro, 5);

    expect(alfaEm(quadro, 4, 4)).toBe(255);
    expect(alfaEm(quadro, 0, 0)).toBe(0);
  });
});

describe('removerFundoNeutroInterno', () => {
  /** Faixa de 12 × 3 com colunas de fundo (40) nas pontas e, no meio, 8 pixels do tom `cor` ligados entre si. */
  const faixaCom = (cor: [number, number, number]) =>
    quadroDe(12, 3, (x, y) => {
      if (x === 0 || x === 11) return [40, 40, 40, 255];
      if (y === 1 && x >= 2 && x <= 9) return [...cor, 255];
      return [200, 200, 200, 255];
    });

  it('tira uma região contínua do cinza do fundo presa dentro do objeto', () => {
    const quadro = faixaCom([41, 41, 41]);

    const removidos = removerFundoNeutroInterno(quadro, 8, 6);

    expect(alfaEm(quadro, 5, 1)).toBe(0);
    expect(removidos).toBeGreaterThanOrEqual(8);
  });

  it('não leva o cabelo escuro: o tom tem cor, mesmo próximo ao do fundo', () => {
    const quadro = faixaCom([39, 28, 27]);

    removerFundoNeutroInterno(quadro, 14, 6);

    expect(alfaEm(quadro, 5, 1)).toBe(255);
  });

  it('um pontinho solto da cor do fundo (sombra do cabelo) fica: a região é pequena demais', () => {
    const quadro = quadroDe(12, 3, (x, y) => {
      const canto = (x === 0 || x === 11) && (y === 0 || y === 2);
      return canto || (x === 6 && y === 1) ? [40, 40, 40, 255] : [200, 200, 200, 255];
    });

    removerFundoNeutroInterno(quadro, 8, 6);

    expect(alfaEm(quadro, 6, 1)).toBe(255);
  });
});

describe('removerManchasPequenas', () => {
  it('apaga os pedaços soltos menores que a área mínima e preserva o objeto', () => {
    const quadro = quadroDe(14, 8, (x, y) => {
      if (x >= 1 && x <= 6 && y >= 1 && y <= 6) return [200, 200, 200, 255];
      if (x === 10 && y === 3) return [60, 60, 60, 255];
      if (x >= 12 && x <= 13 && y >= 5 && y <= 6) return [60, 60, 60, 255];
      return [0, 0, 0, 0];
    });

    const removidos = removerManchasPequenas(quadro, 10);

    expect(removidos).toBe(5);
    expect(alfaEm(quadro, 3, 3)).toBe(255);
    expect(alfaEm(quadro, 10, 3)).toBe(0);
    expect(alfaEm(quadro, 12, 5)).toBe(0);
  });
});

describe('descontaminarBorda', () => {
  it('a borda escura herda a cor do objeto: o contorno de fundo some', () => {
    // objeto claro (200) de 8 × 8 num quadro 12 × 12, com o anel externo escurecido (40) pelo fundo
    const quadro = quadroDe(12, 12, (x, y) => {
      const dentro = x >= 2 && x <= 9 && y >= 2 && y <= 9;
      if (!dentro) return [0, 0, 0, 0];
      const anel = x === 2 || x === 9 || y === 2 || y === 9;
      return anel ? [40, 40, 40, 255] : [200, 200, 200, 255];
    });

    descontaminarBorda(quadro, 2);

    const cor = (x: number, y: number) => quadro.dados[(y * 12 + x) * 4];
    expect(cor(2, 2)).toBeGreaterThan(190);
    expect(cor(2, 5)).toBeGreaterThan(190);
    expect(cor(5, 5)).toBe(200);
    expect(alfaEm(quadro, 2, 2)).toBe(255); // só a cor muda, não o formato
  });

  it('um quadro todo opaco conta a borda do quadro como borda do objeto, sem estourar', () => {
    const quadro = quadroDe(5, 5, () => [10, 20, 30, 255]);

    expect(() => {
      descontaminarBorda(quadro, 2);
    }).not.toThrow();
  });

  it('pixel isolado, sem vizinho limpo por baixo, fica como está', () => {
    const quadro = quadroDe(3, 3, (x, y) => (x === 1 && y === 1 ? [9, 8, 7, 255] : [0, 0, 0, 0]));

    descontaminarBorda(quadro, 1);

    expect([...quadro.dados.slice(16, 19)]).toEqual([9, 8, 7]);
  });
});

describe('medirPoseGirada', () => {
  /** Uma haste de 1 px de espessura da base à esquerda ao topo à direita (45°), num quadro quadrado. */
  function hasteDiagonal(lado: number): Quadro {
    return quadroDe(lado, lado, (x, y) =>
      x === lado - 1 - y ? [200, 160, 40, 255] : [0, 0, 0, 0],
    );
  }

  it('gira 45° no sentido horário e acha a haste na horizontal, sobre o centro', () => {
    const pose = medirPoseGirada(hasteDiagonal(200), 45);

    expect(pose.ponta.y).toBeCloseTo(0.5, 1);
    expect(pose.comprimento).toBeCloseTo(Math.SQRT2, 1); // a diagonal inteira, em larguras do quadro
  });

  it('a ponta é o ponto mais à esquerda e pode ficar fora do quadro de origem', () => {
    const pose = medirPoseGirada(hasteDiagonal(200), 45);

    expect(pose.ponta.x).toBeCloseTo(0.5 - Math.SQRT2 / 2, 1); // -0,21
  });

  it('sem girar, a ponta é o canto esquerdo do desenho', () => {
    const quadro = quadroDe(100, 50, (x, y) =>
      y === 20 && x >= 10 ? [1, 1, 1, 255] : [0, 0, 0, 0],
    );

    const pose = medirPoseGirada(quadro, 0);

    expect(pose.ponta.x).toBeCloseTo(0.1, 1);
    expect(pose.ponta.y).toBeCloseTo(0.41, 1);
    expect(pose.comprimento).toBeCloseTo(0.9, 1);
  });

  it('quadro sem pixel visível falha com mensagem clara', () => {
    expect(() => medirPoseGirada(criarQuadro(10, 10), 45)).toThrow('Sem pixels visíveis');
  });
});

describe('escurecerBase', () => {
  const opaco = (): [number, number, number, number] => [200, 200, 200, 255];

  it('escurece só a base: nada no topo, o máximo na última linha, em curva crescente', () => {
    const quadro = quadroDe(4, 10, opaco);

    escurecerBase(quadro, { esquerda: 0, topo: 0, largura: 4, altura: 10 }, 0.4, 0.5);

    const vermelho = (y: number) => quadro.dados[y * 4 * 4] ?? 0;
    expect(vermelho(0)).toBe(200);
    expect(vermelho(5)).toBe(200);
    expect(vermelho(6)).toBeGreaterThan(vermelho(8));
    expect(vermelho(9)).toBeLessThan(vermelho(8));
    expect(vermelho(9)).toBeGreaterThan(200 * 0.5); // 1 - forca é o piso, nunca atingido por inteiro
  });

  it('não mexe no alfa nem nos pixels transparentes', () => {
    const quadro = quadroDe(2, 4, (x) => (x === 0 ? [200, 200, 200, 255] : [90, 90, 90, 0]));

    escurecerBase(quadro, { esquerda: 0, topo: 0, largura: 2, altura: 4 }, 1, 0.8);

    expect(alfaEm(quadro, 0, 3)).toBe(255);
    expect(quadro.dados[(3 * 2 + 1) * 4]).toBe(90); // transparente: cor intacta
  });
});

describe('pontuacaoDeCeu', () => {
  it('o céu quente e claro pontua alto; folha, água, colina e nuvem branca pontuam zero', () => {
    expect(pontuacaoDeCeu(248, 224, 185)).toBe(1);
    expect(pontuacaoDeCeu(110, 130, 70)).toBe(0); // folha
    expect(pontuacaoDeCeu(200, 210, 150)).toBe(0); // folha clara: verde acima do vermelho
    expect(pontuacaoDeCeu(167, 167, 183)).toBe(0); // colina
    expect(pontuacaoDeCeu(190, 200, 215)).toBe(0); // água
    expect(pontuacaoDeCeu(240, 238, 232)).toBe(0); // nuvem branca: pouco vermelho sobre o azul
    expect(pontuacaoDeCeu(150, 100, 60)).toBe(0); // escuro demais
  });
});

describe('removerCeu', () => {
  type Cor = [number, number, number, number];
  const CEU: Cor = [248, 224, 185, 255];
  const FOLHA: Cor = [90, 110, 60, 255];
  const COLINA: Cor = [167, 167, 183, 255];
  const NUVEM: Cor = [240, 238, 232, 255];

  /** 40 × 30: folhas nos lados e no alto, céu de 8 a 31 de largura e de 3 a 23 de altura, colinas de 24 para baixo. */
  function cena(extra: (x: number, y: number) => Cor | undefined = () => undefined) {
    return quadroDe(40, 30, (x, y) => {
      const especial = extra(x, y);
      if (especial) return especial;
      if (y >= 24) return COLINA;
      if (x < 8 || x >= 32 || y < 3) return FOLHA;
      return CEU;
    });
  }
  const opcoes = { semente: [20, 10] as const, limiteDeY: 24, areaDoBolsao: 20 };

  it('tira a região do céu que contém a semente e deixa folhas e colinas', () => {
    const quadro = cena();

    const removidos = removerCeu(quadro, opcoes);

    expect(removidos).toBe(24 * 21);
    expect(alfaEm(quadro, 20, 10)).toBe(0);
    expect(alfaEm(quadro, 2, 10)).toBe(255); // folha
    expect(alfaEm(quadro, 20, 27)).toBe(255); // colina, abaixo do horizonte
  });

  it('um bolsão de céu entre as folhas, solto da região principal, sai se for grande e fica se for pequeno', () => {
    const grande = (x: number, y: number) =>
      x >= 1 && x < 6 && y >= 5 && y < 11 ? CEU : undefined;
    const pequeno = (x: number, y: number) =>
      x >= 1 && x < 3 && y >= 5 && y < 7 ? CEU : undefined;

    const comGrande = cena(grande);
    const comPequeno = cena(pequeno);
    removerCeu(comGrande, opcoes);
    removerCeu(comPequeno, opcoes);

    expect(alfaEm(comGrande, 3, 8)).toBe(0); // 30 px²: sai
    expect(alfaEm(comPequeno, 1, 5)).toBe(255); // 4 px²: é uma folha clara, fica
  });

  it('a nuvem branca solta dentro do céu sai só com a opção "furo"', () => {
    const nuvem = (x: number, y: number) =>
      x >= 15 && x < 20 && y >= 8 && y < 12 ? NUVEM : undefined;
    const sem = cena(nuvem);
    const com = cena(nuvem);

    removerCeu(sem, opcoes);
    const removidos = removerCeu(com, { ...opcoes, furo: { area: 100, luma: 185 } });

    expect(alfaEm(sem, 17, 10)).toBe(255);
    expect(alfaEm(com, 17, 10)).toBe(0);
    expect(removidos).toBe(24 * 21);
  });

  it('o furo escuro ou grande demais continua: é uma folha ou um galho, não uma nuvem', () => {
    const galho: Cor = [60, 70, 40, 255];
    const escuro = (x: number, y: number) =>
      x >= 15 && x < 20 && y >= 8 && y < 12 ? galho : undefined;
    const grande = (x: number, y: number) =>
      x >= 10 && x < 30 && y >= 5 && y < 20 ? NUVEM : undefined;
    const comEscuro = cena(escuro);
    const comGrande = cena(grande);
    const furo = { area: 100, luma: 185 };

    removerCeu(comEscuro, { ...opcoes, furo });
    removerCeu(comGrande, { ...opcoes, furo });

    expect(alfaEm(comEscuro, 17, 10)).toBe(255);
    expect(alfaEm(comGrande, 20, 10)).toBe(255); // 300 px² passa do máximo de 100
  });

  it('um pedaço que toca a borda do quadro não é furo, mesmo claro e pequeno', () => {
    const naBorda = (x: number, y: number) => (x < 3 && y >= 8 && y < 10 ? NUVEM : undefined);
    const quadro = cena(naBorda);

    removerCeu(quadro, { ...opcoes, furo: { area: 100, luma: 185 } });

    expect(alfaEm(quadro, 1, 8)).toBe(255);
  });
});
