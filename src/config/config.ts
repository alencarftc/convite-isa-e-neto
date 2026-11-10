import type { ConfigConvite } from '@/domain/config/config-convite';

/** Datas, links e tempos do convite (SPEC-01). Tempos em segundos. */
export const config: ConfigConvite = {
  casamento: '2027-01-22T17:00:00-03:00',
  prazoConfirmacao: '2026-12-12T23:59:59-03:00',
  publicacao: {
    // O endereço do convite é o domínio próprio do casal (09/11/2026); o WhatsApp guarda a prévia, então ele não deve mudar
    // depois do envio. No GitHub Pages: domínio personalizado nas configurações do repositório e o arquivo public/CNAME.
    url: 'https://isabellaeneto.com.br/',
    imagemDaPrevia: 'og-image-v2.jpg',
    icone32: 'favicon/favicon-32.png',
    iconeApple: 'favicon/apple-touch-icon.png',
    indexavel: true,
  },
  links: {
    formulario: 'https://forms.gle/yviZrELgrH2zrRGc7',
    mapa: 'https://www.google.com/maps/search/?api=1&query=R.+Na%C3%A7%C3%B5es+Unidas%2C+407+-+Benevides%2C+PA%2C+68795-000',
  },
  duracoes: {
    nevoa: 3,
    bau: 2,
    balao: 5,
    carta: 3,
    convite: 7,
    dicaChave: 1.5,
    reforcoDica: 8,
    limiteCritico: 8,
    limiteSeguranca: 20,
    limitePlanoB: 10,
    novaTentativaDeImagem: 1,
    entradaNomes: 0.6,
    entradaNomesAtraso: 0.2,
    entradaChamada: 0.4,
    entradaSaida: 0.3,
    nevoaEmRepouso: 12,
    avisoDeEspera: 0.3,
    esmaecimentoReduzido: 0.4,
    cartoes: 0.5,
  },
  // Duração a confirmar com o casal (SPEC-17): o convite não diz quando a festa termina.
  // As pétalas azuis do convite aberto (08/11/2026): caem devagar e sem parar, como as folhas, em posições variadas.
  petalasDoConvite: {
    primeiroEm: 1.8,
    primeiroEmAoPular: 0.6,
    // Mais pétalas (09/11/2026): o intervalo era [1, 2.2] e o limite, 12 e 6. No computador a tela é bem maior, então o
    // tempo entre elas cai pela metade e o limite sobe (`noComputador`).
    intervalo: [0.8, 1.7],
    duracao: [11, 18],
    balanco: [18, 46],
    trocasDeLado: [2, 4],
    giro: 220,
    largura: [14, 26],
    opacidade: 0.85,
    esmaecer: 0.1,
    virar: [1.6, 2.8],
    maximo: { completo: 16, leve: 8 },
    noComputador: { fatorDoIntervalo: 0.5, fatorDoMaximo: 1.8 },
  },
  // O carrossel de fotos do casal (08/11/2026): troca sozinho a cada `intervalo` s, com uma troca suave de `transicao` s
  // (a foto desliza `deslocamento`% de lado enquanto muda), um zoom lento sobre a foto à vista e um arrastar de pelo menos
  // `limiteDoGesto` px para passar à mão.
  carrossel: { intervalo: 4, transicao: 0.9, deslocamento: 8, zoom: 1.06, limiteDoGesto: 40 },
  agenda: { duracaoEmHoras: 6, lembreteEmDias: 1, nomeDoArquivo: 'casamento-isabella-e-david.ics' },
  entrada: {
    seloPeriodo: 3.2,
    seloEscala: 1.05,
    saida: {
      aperto: { escala: 0.9, duracao: 0.14 },
      solta: { giro: 4, subida: 16, escala: 1.16, duracao: 0.9 },
      brilho: { escala: 3.4, duracao: 1.1, opacidade: 0.95 },
      nomes: { escala: 1.1, deslocamento: -18, duracao: 0.8 },
      nevoaEm: 0.28,
    },
  },
  movimento: {
    deslocamentoDosCartoes: 16,
    escalaInicialDoBosque: 1.12,
    escalaFinalDaNevoa: 1.15,
    deslocamentoDaNevoa: 14,
    fracaoDaNevoa: 0.8,
    profundidadeDasCamadas: {
      ceu: 0.15,
      lago: 0.3,
      arvores: 0.6,
      frente: 1,
      solo: { vertical: 0.3, horizontal: 1 },
    },
    profundidade: {
      mouseX: 24,
      mouseY: 12,
      deriva: 6,
      periodoDaDeriva: 8,
      defasagemDaDeriva: 1.3,
      suavizacao: 0.8,
    },
  },
  carta: {
    pouso: 1.2,
    // O envelope pousa com o centro a 58% da altura da tela, contada do alto (a 42% de baixo para cima): um pouco acima do
    // que era (08/11/2026, antes a 2/3 do alto).
    alturaDoPouso: 0.58,
    bauSome: 0.8,
    // O envelope nasce da luz das estrelas, no ponto onde elas se juntam, e cresce desta escala até 1.
    escalaDeNascimento: 0.82,
    sombraEm: 0.6,
    sombra: 0.6,
    opacidadeDaSombra: 0.35,
    pousouEm: 1.2,
    dicaEm: 1.7,
    dicaAparece: 0.3,
    pulsoDoSelo: { escala: 1.06, periodo: 1 },
    // Medidas do papel (`pnpm arte` imprime a proporção): a faixa do meio, sem rosas, vira o ladrilho que se repete
    // sob o texto (`CORTE_DO_PAPEL`, em scripts/arte/otimizar-arte.ts, tem de bater com estes números).
    papel: { proporcao: 1.483, corte: { de: 0.43, ate: 0.56 } },
    gesto: { limite: 120, limiar: 60, folga: 10, retorno: 0.5 },
  },
  convite: {
    dicaSome: 0.2,
    seloCresce: { escala: 1.12, duracao: 0.15 },
    seloBrilho: { escala: 2.4, duracao: 0.7, opacidade: 0.9 },
    seloSolta: { duracao: 0.7, giro: 3, subida: 12, escala: 1.14 },
    abaEm: 0.4,
    aba: 0.3,
    abaEscala: 1.02,
    envelopeDesceEm: 1,
    envelopeDesce: 0.8,
    cenaSobeEm: 1,
    cenaSobe: 1.5,
    cenaSobeFracao: 0.22,
    casalEm: 1.3,
    casalAparece: 1.5,
    casalDeslocamento: 8,
    desdobraEm: 1.5,
    desdobra: 1.2,
    escalaDobrada: 0.35,
    blocosEm: 2.7,
    blocosAparecem: 0.9,
    blocosDeslocamento: 12,
    intervaloDosBlocos: 1.3,
    folgaDaDobra: 0.05,
    rolar: { aparece: 0.5, periodo: 1.2, deslocamento: 9 },
  },
  historia: {
    // Cada memória dura `duracoes.balao` = 5 s, uma depois da outra (ADR-0026): a centelha sobe da boca do baú em 1,1 s,
    // se abre no cartão (0,55 s), a frase fica legível por uns 3 s, e a 4,4 s o cartão se desfaz em poeira dourada e deixa a
    // estrela no arco sobre o baú. Com as cinco acesas, as estrelas se juntam em 1,1 s no ponto onde o envelope nasce.
    centelhaSobe: 1.1,
    cartaoEm: 0.85,
    cartaoAparece: 0.55,
    fraseEm: 1.1,
    fraseAparece: 0.3,
    respiro: { escala: 1.025, duracao: 1.5 },
    cartaoSomeEm: 4.4,
    poeira: {
      quantidade: 14,
      queda: [40, 90],
      deriva: 30,
      aparece: 0.1,
      duracao: 0.5,
      tamanho: [4, 9],
    },
    estrela: { sobe: 0.5, atraso: 0.1, tamanho: 26 },
    arco: { raio: 0.34, maximo: 150, achatamento: 0.5, folga: 100 },
    convergencia: 1.1,
    // O centro do cartão fica a esta fração da altura da tela, do alto; `margemSuperior` o afasta dos botões do alto.
    alturaDoCartao: 0.34,
    alturaDoCartaoNaHorizontal: 0.3,
    margemSuperior: 64,
    // Cada cartão se desvia um pouco do centro e se inclina, como cartas deixadas sobre uma mesa.
    desvios: [-0.06, 0.06, -0.04, 0.05, 0],
    inclinacoes: [-2, 1.5, -1, 2, -1.5],
  },
  bau: {
    dicaSome: 0.2,
    // A dica do baú: 3 s à vista (com os esmaecimentos), 5 s oculta, e de novo, até o baú ser tocado.
    dica: { visivel: 3, oculta: 5, some: 0.4 },
    chaveVoa: 0.45,
    chaveEncaixa: 0.25,
    giroDaChave: 0.3,
    grausDoGiro: 48,
    perspectivaDoGiro: 500,
    curvaDoGiro: 'back.out(1.4)',
    instanteDoSalto: 1,
    duracaoDoSalto: 0.2,
    alturaDoSalto: 6,
    escalaDoSalto: 1.03,
    instanteDaTampa: 1,
    duracaoDaTampa: 0.3,
    instanteDaLuz: 1.1,
    luzSobe: 0.6,
    luzAssenta: 0.3,
    opacidadeFinalDaLuz: 0.6,
    instanteDaChaveSome: 1.3,
    chaveSome: 0.3,
    auraAparece: 0.3,
    aura: { minimo: 0.5, maximo: 0.85, escala: 1.05, periodo: 3.2 },
    inventarioAparece: 0.5,
    inventarioSome: 0.4,
    // Medidas da arte da chave (`pnpm arte` as imprime): ponta e comprimento com a arte girada em 45°.
    chave: {
      giroDaArte: 45,
      comprimento: 1.193,
      ponta: { x: -0.127, y: 0.453 },
      inclinacaoNoInventario: -45,
      comprimentoNoBau: 0.42,
      aproximacao: { recuo: 0.5, elevacao: 0.18 },
    },
    balancoNoInventario: { rotacao: 5, duracao: 1.8 },
    brilhoDaChave: { minimo: 0.4, maximo: 0.9, duracao: 1.2 },
    pulso: { escala: 1.15, duracao: 0.6 },
    reforco: { escala: 1.15, pulsos: 3, duracao: 0.9, maximo: 3 },
    petalas: { minimo: 4, maximo: 6, subida: 220, deriva: 70, duracao: 1.8, largura: '12%' },
  },
  vida: {
    pausaAbaixoDe: 0.15,
    larguraParaCobrir: 0.8,
    desempenho: { janelaDeMedicao: 2, quadroLento: 0.025, fracaoDeQuadrosLentos: 0.5 },
    leve: { quadrosDaAgua: 30, resolucaoDaAgua: 1, maximoDeFolhas: 4 },
    completo: { resolucaoDaAgua: 1.5, maximoDeFolhas: 8 },
    agua: {
      primeiroEm: 0,
      aparece: 0.8,
      // A água começa logo abaixo da margem da arte 04: a mata, a ilha e as pedras da margem (até 55% da
      // altura) ficam paradas.
      regiao: {
        // Na vertical o lago é uma elipse sobre a água da cena mestre (de 44% a 56% da altura): a mata, a ilha, o
        // muro e o gramado ficam parados. Frações da caixa da camada, que na vertical é a tela inteira.
        vertical: {
          tipo: 'elipse',
          centro: [0.68, 0.5],
          raio: [0.32, 0.05],
          borda: 0.6,
          intensidade: 1,
        },
        horizontal: { tipo: 'faixa', inicio: 0.53, borda: 0.05 },
        // No computador o lago é o da pintura mestre 16:9 (de 48% a 65% da altura, da ilha à direita): a mata, a ilha, o
        // muro de pedra e o gramado ficam parados. Frações da caixa da camada, que é a tela inteira.
        computador: {
          tipo: 'elipse',
          centro: [0.6, 0.565],
          raio: [0.33, 0.07],
          borda: 0.6,
          intensidade: 1,
        },
      },
      onda: {
        amplitude: 2.5,
        frequencia: 9,
        velocidade: 0.12,
        direcao: 'horizontal',
        perspectiva: 1,
      },
      reflexos: {
        densidade: 0.02,
        colunaDoSol: 0.78,
        larguraDaColuna: 0.35,
        brilhoMinimo: 0.25,
        brilhoMaximo: 0.9,
      },
    },
    folhas: {
      primeiroEm: 1,
      intervalo: [1.6, 3.2],
      duracao: [7, 11],
      balanco: [20, 60],
      trocasDeLado: [2, 3],
      giro: 540,
      // Larguras da imagem da folha como fração da tela; as folhas têm de 100 a 256 px de lado e a menor tem piso.
      largura: { fundo: [0.03, 0.05], frente: [0.05, 0.07] },
      // No computador a folha é medida pela altura da tela (09/11/2026): 5% de 1920 px eram 96 px e as folhas ficavam
      // imensas. Por altura, 0,02 a 0,03 de 1080 px dão de 22 a 32 px (e de 32 a 49 px na frente).
      larguraNoComputador: { fundo: [0.02, 0.03], frente: [0.03, 0.045] },
      fracaoNaFrente: 0.2,
      aceleracaoNaFrente: 1.3,
      // A folhagem da árvore da direita na arte 05 (a copa densa vai do topo a 40% da altura, de 72% da
      // largura para a direita na vertical); é de lá que as folhas se soltam.
      copa: {
        vertical: { x: [0.72, 0.98], y: [0.03, 0.3] },
        horizontal: { x: [0.7, 0.97], y: [0.04, 0.4] },
      },
      chao: [0.72, 0.86],
      esmaecerNoFim: 0.2,
      aparece: 0.5,
      inclinacao: 25,
      esmaecerAoAbrir: 1.2,
      larguraMinima: 10,
    },
    passaros: {
      primeiroEm: 3,
      intervalo: [12, 25],
      tamanhoDoBando: [2, 5],
      desvio: { x: 40, y: 24 },
      faixa: [0.08, 0.3],
      travessia: [9, 14],
      ondulacao: { amplitude: 10, ciclos: [2, 3] },
      asas: { periodo: [0.35, 0.5], escalaMinima: -0.55 },
      planar: { chance: 0.3, duracao: 1.2, escala: 0.6 },
      largura: [10, 18],
    },
    esquilo: {
      primeiroEm: 6,
      intervalo: [12, 28],
      // A largura é a do quadro das duas poses (a imagem inteira, de 384 × 198): o esquilo sentado ocupa metade dele.
      largura: { vertical: 0.17, horizontal: 0.043, computador: 0.06 },
      // Na vertical a linha das patas é o gramado, a 20% da base (a 80% do alto da pintura): o casal pisa a 23% e, com
      // a cena erguida, ela fica logo acima da carta. Na horizontal é a mesma altura do chão do baú.
      chao: { vertical: 0.2, horizontal: 0.16, computador: 0.175 },
      // Cada visita é diferente: de 1 a 3 paradas ao centro da tela (o centro do corpo entre 30% e 70% da largura),
      // pulinhos ou disparos, olhadas e sacudidas sorteadas, e saída por qualquer lado.
      paradas: [1, 3],
      centro: [0.3, 0.7],
      pulo: {
        distancia: [0.06, 0.09],
        altura: [12, 18],
        voo: 0.28,
        pouso: 0.08,
        achatamento: 0.92,
        respiro: [0.05, 0.25],
      },
      corrida: { distancia: [0.1, 0.15], altura: [6, 10], voo: 0.18, respiro: [0, 0.04] },
      // No computador (09/11/2026) cada pulo cobre 70% da distância e dura 70% a mais: de 1920 px, um pulinho de 0,075 da
      // tela (144 px em 0,28 s, mais de 500 px/s) passa a uns 100 px em 0,48 s, uns 210 px/s, e a corrida, de uns 1300 px/s
      // para uns 550. Com 45% e 50% (antes) os pulos ficaram curtos demais e ele "pulava muito" para cruzar a tela.
      noComputador: { distancia: 0.7, voo: 1.7 },
      chanceDeCorrida: 0.35,
      chanceDeEspiar: 0.15,
      chanceDeSairPeloOutroLado: 0.4,
      parada: [1, 2.8],
      sacudidasDoRabo: [0, 3],
      olhadas: [0, 2],
      inclinacaoDaSacudida: 3,
    },
  },
  // Arte gerada (docs/decisions/0011), preparada por `pnpm arte` a partir de `arte/originais/`.
  // Cada camada tem um arquivo por orientação. Na vertical a chave `lago` leva a cena mestre 9:16 inteira, sem o
  // céu (ADR-0015), o primeiro plano leva só os arbustos de rosas dos cantos de baixo (uma cópia exata dos pixels da
  // cena, para taparem o baú e o esquilo; ADR-0019) e as árvores apontam para uma imagem vazia de 1 × 1.
  imagens: {
    ceu: {
      vertical: 'assets/scene/02-ceu-baunilha-9x16.webp',
      horizontal: 'assets/scene/02-ceu-baunilha-16x9.webp',
    },
    ceuPorDoSol: {
      vertical: 'assets/scene/03-ceu-por-do-sol-9x16.webp',
      horizontal: 'assets/scene/03-ceu-por-do-sol-16x9.webp',
    },
    // No computador (mouse, tela horizontal) a cena é a pintura mestre 16:9 inteira, sem o céu (09/11/2026), como a
    // vertical é a 9:16: o muro de pedra, o gramado do baú e os arbustos de rosas nos cantos. O primeiro plano é a cópia
    // dos arbustos de baixo, e as árvores já estão na pintura (imagem vazia). A `horizontal` continua para o celular
    // deitado e o tablet.
    lago: {
      vertical: 'assets/scene/01-cena-9x16.webp',
      horizontal: 'assets/scene/04-lago.webp',
      computador: 'assets/scene/01-cena-16x9.webp',
    },
    arvores: {
      vertical: 'assets/scene/vazio.webp',
      horizontal: 'assets/scene/05-arvores-16x9.webp',
      computador: 'assets/scene/vazio.webp',
    },
    primeiroPlano: {
      vertical: 'assets/scene/01-cena-9x16-frente.webp',
      horizontal: 'assets/scene/06-primeiro-plano.webp',
      computador: 'assets/scene/01-cena-16x9-frente.webp',
    },
    // No computador a base que a carta deixa à mostra é uma faixa de gramado da própria pintura (09/11/2026), e não um verde
    // chapado: um retalho do gramado ladrilhado, que continua a borda de baixo da pintura.
    chao: {
      vertical: 'assets/scene/06-chao-9x16.webp',
      horizontal: 'assets/scene/06-chao-16x9.webp',
      computador: 'assets/scene/06-chao-computador.webp',
    },
    bauFechado: 'assets/objects/08-bau-fechado.webp',
    bauAberto: 'assets/objects/09-bau-aberto.webp',
    chave: 'assets/objects/10-chave.webp',
    petalaA: 'assets/objects/16-petala-a.webp',
    petalaB: 'assets/objects/16-petala-b.webp',
    petalaC: 'assets/objects/16-petala-c.webp',
    envelopeFechado: 'assets/objects/12-envelope-fechado.webp',
    envelopeAberto: 'assets/objects/13-envelope-aberto.webp',
    selo: 'assets/objects/15-selo.webp',
    papelCarta: 'assets/objects/14-papel-carta.webp',
    papelMiolo: 'assets/objects/14-papel-miolo.webp',
    // Cena viva (épico 13): as imagens 20a–c (folhas) e 21a–b (esquilo), repartidas pelo `pnpm arte`.
    folhaA: 'assets/objects/20-folha-a.webp',
    folhaB: 'assets/objects/20-folha-b.webp',
    folhaC: 'assets/objects/20-folha-c.webp',
    esquiloEncolhido: 'assets/objects/21-esquilo-encolhido.webp',
    esquiloEsticado: 'assets/objects/21-esquilo-esticado.webp',
    casal: 'assets/couple/17-casal-costas.webp',
  },
  curvas: {
    mola: 'elastic.out(1, 0.5)',
    linear: 'none',
    suave: 'sine.inOut',
    senoEntrada: 'sine.in',
    saida: 'power2.out',
    pouso: 'power3.out',
    entrada: 'power2.in',
    viaDupla: 'power2.inOut',
    leve: 'power1.out',
    senoSaida: 'sine.out',
    entradaLeve: 'power1.in',
    viaDuplaForte: 'power3.inOut',
  },
  volumes: { ambiente: 0.35, ambienteSobMusica: 0.15, efeitos: 0.8, fada: 0.12, musica: 0.6 },
  transicoesDeAudio: {
    entradaDoAmbiente: 2,
    entradaDaFada: 1.5,
    // A fada se esvai durante o último balão (5 s) e termina um pouco antes do fim da história.
    saidaDaFada: 4.5,
    ambienteSobMusica: 2,
    musica: 2,
    entradaDaMusica1: 6,
    retornoDoAmbiente: 3,
  },
  musicas: { inicio1: 0, inicio2: 0 },
};
