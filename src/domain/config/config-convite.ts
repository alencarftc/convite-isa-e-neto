import type { ParametrosDeLeitura } from '../carta/tempo-de-leitura';
import type { ArteDaImagem, ChaveDeImagem } from '../imagens/catalogo-de-imagens';
import type { ParametrosDoEsquilo } from '../vida/esquilo';
import type { ParametrosDeFolha } from '../vida/folhas';
import type { OndaDeOndulacao, ReflexosDaOndulacao } from '../vida/ondulacao';
import type { ParametrosDePassaros } from '../vida/passaros';
import type { ParametrosDasPetalas } from '../vida/petalas-do-convite';
import type { RegiaoDeOndulacao } from '../vida/regioes';

/** Formato de `src/config/config.ts` (SPEC-01, "Conteúdo e configuração"). Tempos em segundos. */
export interface ConfigConvite {
  /** ISO 8601 com fuso explícito. */
  readonly casamento: string;
  /** ISO 8601 com fuso explícito. */
  readonly prazoConfirmacao: string;
  /** Publicação e prévia do link (SPEC-10). Caminhos relativos a `public/`. */
  readonly publicacao: {
    /** Endereço final, com `https://` e barra no fim; define `og:url` e `og:image` (RF-10.1). */
    readonly url: string;
    /** JPEG de 1200 × 630 px, até 300 KB (RF-10.2). */
    readonly imagemDaPrevia: string;
    /** Ícones de 32 e 180 px com o selo e as iniciais (RF-10.3). */
    readonly icone32: string;
    readonly iconeApple: string;
  };
  readonly links: {
    readonly formulario: string;
    readonly mapa: string;
  };
  readonly duracoes: {
    readonly nevoa: number;
    readonly bau: number;
    readonly balao: number;
    readonly carta: number;
    readonly convite: number;
    readonly dicaChave: number;
    readonly reforcoDica: number;
    readonly limiteCritico: number;
    readonly limiteSeguranca: number;
    /** Sem o pacote iniciar até aqui, a página mostra o texto simples (SPEC-15, RF-15.6). */
    readonly limitePlanoB: number;
    /** Espera antes de tentar baixar de novo uma imagem que falhou (SPEC-02). */
    readonly novaTentativaDeImagem: number;
    /** Nomes do casal aparecem (SPEC-02, "Animações da entrada"). */
    readonly entradaNomes: number;
    /** Atraso dos nomes depois do primeiro quadro. */
    readonly entradaNomesAtraso: number;
    /** "Toque para entrar" aparece. */
    readonly entradaChamada: number;
    /** Os textos da entrada somem no toque. */
    readonly entradaSaida: number;
    /** Cada camada da névoa em repouso vai e volta nesse tempo. */
    readonly nevoaEmRepouso: number;
    /** Cada cartão das informações surge ao entrar na tela (SPEC-07). */
    readonly cartoes: number;
    /** Cena aparece por esmaecimento com animação reduzida (SPEC-03, RF-03.6). */
    readonly esmaecimentoReduzido: number;
    /** Depois do toque, tempo de espera antes de mostrar "Preparando o bosque…". */
    readonly avisoDeEspera: number;
  };
  /** O carrossel de fotos do casal, abaixo da mensagem (08/11/2026). */
  readonly carrossel: {
    /** Tempo de cada foto à vista, em segundos. */
    readonly intervalo: number;
    /** Duração da troca de uma foto pela outra. */
    readonly transicao: number;
    /** Quanto a foto desliza de lado ao trocar, em % da largura. */
    readonly deslocamento: number;
    /** O zoom lento da foto à vista termina nesta escala. */
    readonly zoom: number;
    /** Arrastar para o lado pelo menos isto, em pixels, passa a foto. */
    readonly limiteDoGesto: number;
  };
  /** As pétalas azuis do convite aberto: caem devagar e sem parar, em posições variadas (08/11/2026). */
  readonly petalasDoConvite: ParametrosDasPetalas;
  /** "Salvar na agenda" (SPEC-17): o evento do casamento no calendário do aparelho. */
  readonly agenda: {
    /** Duração do evento (a data e a hora de início vêm de `casamento`). */
    readonly duracaoEmHoras: number;
    /** O lembrete dispara tantos dias antes do início. */
    readonly lembreteEmDias: number;
    readonly nomeDoArquivo: string;
  };
  /** Selo da tela de entrada (SPEC-16): pulsa devagar enquanto o convidado decide tocar. */
  readonly entrada: {
    /** Tempo de um ciclo completo de pulsar, em segundos. */
    readonly seloPeriodo: number;
    readonly seloEscala: number;
    /**
     * O toque no selo (ADR-0012): ele cede, se solta inteiro (levanta, gira de leve e se desfaz) e solta um
     * clarão, os nomes se desfazem e a névoa se abre, e o bosque se aproxima. Tempos em segundos, contados do toque.
     */
    readonly saida: {
      readonly aperto: { readonly escala: number; readonly duracao: number };
      /** O selo se solta: giro em graus, subida em pixels e a escala que alcança antes de sumir. */
      readonly solta: {
        readonly giro: number;
        readonly subida: number;
        readonly escala: number;
        readonly duracao: number;
      };
      readonly brilho: {
        readonly escala: number;
        readonly duracao: number;
        readonly opacidade: number;
      };
      /** Os nomes sobem (px, negativo) e crescem um pouco enquanto somem. */
      readonly nomes: {
        readonly escala: number;
        readonly deslocamento: number;
        readonly duracao: number;
      };
      /** A névoa começa a abrir quando o selo estala. */
      readonly nevoaEm: number;
    };
  };
  /** Parâmetros de movimento do bosque (SPEC-03). Os tempos em segundos, as distâncias em pixels. */
  readonly movimento: {
    /** Quanto cada cartão sobe ao surgir, em pixels (SPEC-07). */
    readonly deslocamentoDosCartoes: number;
    /** A cena começa assim e se aproxima até 1 durante `duracoes.nevoa`. */
    readonly escalaInicialDoBosque: number;
    /** A névoa cresce até aqui enquanto se dissipa. */
    readonly escalaFinalDaNevoa: number;
    /** Cada camada da névoa se afasta do centro, em % da largura, para lados opostos, ao abrir. */
    readonly deslocamentoDaNevoa: number;
    /** Fração de `duracoes.nevoa` em que a névoa se dissipa (2,4 s de 3 s). */
    readonly fracaoDaNevoa: number;
    /** Quanto cada camada se move (0 a 1); a mais próxima se move mais (SPEC-03, "Camadas"). */
    readonly profundidadeDasCamadas: {
      readonly ceu: number;
      readonly lago: number;
      readonly arvores: number;
      readonly frente: number;
      /**
       * O chão em que o baú e o casal pisam, por orientação: eles se movem junto dele, e não por conta própria, para
       * não flutuarem sobre a cena. Na vertical o chão é a pintura (a camada do lago); na horizontal, o primeiro plano.
       */
      readonly solo: { readonly vertical: number; readonly horizontal: number };
    };
    readonly profundidade: {
      /** Deslocamento máximo com o mouse (computador), antes de multiplicar pela profundidade. */
      readonly mouseX: number;
      readonly mouseY: number;
      /** Deriva automática no celular. */
      readonly deriva: number;
      readonly periodoDaDeriva: number;
      /** Atraso entre uma camada e a seguinte na deriva, para não andarem juntas. */
      readonly defasagemDaDeriva: number;
      /** Tempo que a camada leva para alcançar o ponteiro, e para voltar ao centro. */
      readonly suavizacao: number;
    };
  };
  /**
   * Envelope (SPEC-06, `tlCarta`, 3 s): pousa a 1/3 da altura da tela, de baixo para cima, e espera o toque no selo. Instantes
   * contados do início da etapa.
   */
  readonly carta: {
    readonly pouso: number;
    /** Onde o envelope pousa, como fração da altura da tela contada do alto: 2/3 é a 1/3 de baixo para cima (02/11/2026). */
    readonly alturaDoPouso: number;
    /** O baú some, esmaecendo, quando o envelope aparece (antes do toque no selo); o envelope pousa onde ele estava. */
    readonly bauSome: number;
    /** O envelope nasce da luz das estrelas com esta escala e cresce até 1 (ADR-0026). */
    readonly escalaDeNascimento: number;
    readonly sombraEm: number;
    readonly sombra: number;
    readonly opacidadeDaSombra: number;
    /** `carta:pousou`: o envelope pousou e espera o toque (não abre sozinho). */
    readonly pousouEm: number;
    readonly dicaEm: number;
    readonly dicaAparece: number;
    readonly pulsoDoSelo: { readonly escala: number; readonly periodo: number };
    /**
     * O papel da carta em três partes (topo, miolo, base) para caber em qualquer altura de texto sem cortar a
     * moldura nem as rosas: o topo e a base são as pontas da arte, e o miolo é um ladrilho da faixa do meio
     * (`imagens.papelMiolo`), repetido na vertical. A proporção (altura / largura) e a faixa do meio, em frações
     * da altura, são medidas na arte; o `pnpm arte` imprime a proporção.
     */
    readonly papel: {
      readonly proporcao: number;
      readonly corte: { readonly de: number; readonly ate: number };
    };
    /** Gesto de deslizar o selo para abrir o envelope (SPEC-16). Distâncias em pixels. */
    readonly gesto: {
      /** Até onde o selo acompanha o dedo. */
      readonly limite: number;
      /** Soltar além disto, com o dedo, abre o envelope. */
      readonly limiar: number;
      /** Andar menos que isto ainda é um toque, não um arrasto. */
      readonly folga: number;
      /** Tempo que o selo leva para voltar ao lugar, em segundos. */
      readonly retorno: number;
    };
  };
  /**
   * Abertura do envelope e carta (SPEC-06, `tlConvite`, 7 s). Instantes contados do rompimento do
   * selo.
   */
  readonly convite: {
    readonly dicaSome: number;
    readonly seloCresce: { readonly escala: number; readonly duracao: number };
    /** Clarão que sai de trás do selo ao se soltar: escala final, duração e opacidade. */
    readonly seloBrilho: {
      readonly escala: number;
      readonly duracao: number;
      readonly opacidade: number;
    };
    /** O selo do envelope se solta inteiro: giro em graus, subida em pixels, escala final e duração. */
    readonly seloSolta: {
      readonly duracao: number;
      readonly giro: number;
      readonly subida: number;
      readonly escala: number;
    };
    readonly abaEm: number;
    readonly aba: number;
    readonly abaEscala: number;
    readonly envelopeDesceEm: number;
    readonly envelopeDesce: number;
    readonly cenaSobeEm: number;
    readonly cenaSobe: number;
    /** A cena inteira sobe esta fração da altura da tela. */
    readonly cenaSobeFracao: number;
    readonly casalEm: number;
    readonly casalAparece: number;
    readonly casalDeslocamento: number;
    readonly desdobraEm: number;
    readonly desdobra: number;
    /** Escala vertical da carta ainda dobrada. */
    readonly escalaDobrada: number;
    /** A carta está aberta: a rolagem é liberada e os blocos começam a aparecer, um a um (ADR-0012). */
    readonly blocosEm: number;
    /** Cada bloco aparece nesse tempo, subindo `blocosDeslocamento` pixels. */
    readonly blocosAparecem: number;
    readonly blocosDeslocamento: number;
    /** O próximo bloco só aparece depois do tempo de leitura do anterior (cresce com o texto). */
    readonly leitura: ParametrosDeLeitura;
    /** Parte da altura da tela, na base, que um bloco precisa respeitar para aparecer: abaixo dela ele espera a rolagem. */
    readonly folgaDaDobra: number;
    /**
     * "Role para ler" é o primeiro texto a aparecer na carta aberta e fica à vista, animado (a seta desce e sobe),
     * sem sumir (SPEC-14, ADR-0012; 08/11/2026).
     */
    readonly rolar: {
      readonly aparece: number;
      readonly periodo: number;
      /** Quanto a seta desce, em pixels. */
      readonly deslocamento: number;
    };
  };
  /**
   * História em memórias de luz (SPEC-05, ADR-0026). As memórias se apresentam uma depois da outra, cada uma por
   * `duracoes.balao` (5 s), com os instantes contados do início dela; depois as estrelas se juntam em `convergencia`. A
   * história inteira dura memórias × `duracoes.balao` + `convergencia` (26,1 s).
   */
  readonly historia: {
    /** A centelha sobe da boca do baú até o lugar do cartão. */
    readonly centelhaSobe: number;
    /** O cartão começa a se abrir (a centelha chega), e leva `cartaoAparece`. */
    readonly cartaoEm: number;
    readonly cartaoAparece: number;
    /** A frase aparece dentro do cartão. */
    readonly fraseEm: number;
    readonly fraseAparece: number;
    /** O cartão respira (cresce e volta) enquanto é lido: duas metades de `duracao`, até `cartaoSomeEm`. */
    readonly respiro: { readonly escala: number; readonly duracao: number };
    /** O cartão começa a se desfazer em poeira e a estrela da memória sai dele; tudo termina nos 5 s da memória. */
    readonly cartaoSomeEm: number;
    readonly poeira: {
      readonly quantidade: number;
      /** Quanto cada grão cai, entre o mínimo e o máximo, em pixels. */
      readonly queda: readonly [number, number];
      /** Deriva lateral máxima, em pixels, para cada lado. */
      readonly deriva: number;
      readonly aparece: number;
      readonly duracao: number;
      /** Diâmetro do grão, entre o mínimo e o máximo, em pixels. */
      readonly tamanho: readonly [number, number];
    };
    readonly estrela: {
      /** A estrela voa do cartão ao seu lugar no arco. */
      readonly sobe: number;
      readonly atraso: number;
      readonly tamanho: number;
    };
    /** O arco de estrelas sobre o baú: raio (fração da largura, até `maximo` px), achatamento e folga acima da boca. */
    readonly arco: {
      readonly raio: number;
      readonly maximo: number;
      readonly achatamento: number;
      readonly folga: number;
    };
    /** As cinco estrelas descem juntas ao ponto onde o envelope pousa, e é da luz delas que ele nasce. */
    readonly convergencia: number;
    /** Altura do centro do cartão, como fração da tela contada do alto; na horizontal a tela é baixa. */
    readonly alturaDoCartao: number;
    readonly alturaDoCartaoNaHorizontal: number;
    /** Espaço mínimo entre o cartão e o alto da tela, em pixels (a linha dos botões do alto). */
    readonly margemSuperior: number;
    /** Desvio horizontal de cada cartão, em fração da largura da tela, a partir do centro. */
    readonly desvios: readonly number[];
    /** Inclinação de cada cartão, em graus. */
    readonly inclinacoes: readonly number[];
  };
  /**
   * Baú e chave (SPEC-04). A abertura (`tlBau`) soma `duracoes.bau` = 2 s; os instantes são
   * contados do toque, como na tabela "Abertura" da spec. A chave espera no inventário, no pé da tela,
   * e é usada no toque no baú (ADR-0012).
   */
  readonly bau: {
    readonly dicaSome: number;
    /** A dica "Toque no baú" se repete: `visivel` s à vista, `oculta` s fora, e de novo; `some` é o esmaecimento de saída. */
    readonly dica: { readonly visivel: number; readonly oculta: number; readonly some: number };
    /** A chave sai do inventário e voa até ficar diante da fechadura. */
    readonly chaveVoa: number;
    /** A chave entra na fechadura, deslizando na horizontal. */
    readonly chaveEncaixa: number;
    readonly giroDaChave: number;
    /** Quanto a chave gira em torno do próprio eixo (rotationX), em graus. */
    readonly grausDoGiro: number;
    /** Distância da perspectiva do giro, em pixels: menor, mais forte. */
    readonly perspectivaDoGiro: number;
    /** Curva do giro (`back.out(1.4)`). */
    readonly curvaDoGiro: string;
    readonly instanteDoSalto: number;
    readonly duracaoDoSalto: number;
    readonly alturaDoSalto: number;
    readonly escalaDoSalto: number;
    /** A tampa abre (baú aberto surge sobre o fechado). */
    readonly instanteDaTampa: number;
    readonly duracaoDaTampa: number;
    readonly instanteDaLuz: number;
    readonly luzSobe: number;
    readonly luzAssenta: number;
    readonly opacidadeFinalDaLuz: number;
    readonly instanteDaChaveSome: number;
    readonly chaveSome: number;
    /** A aura dourada atrás do baú acende e apaga (e aparece mais forte ao passar o mouse). */
    readonly auraAparece: number;
    /** A aura respira o tempo todo enquanto o baú espera. */
    readonly aura: {
      readonly minimo: number;
      readonly maximo: number;
      readonly escala: number;
      readonly periodo: number;
    };
    /** O inventário sobe até a tela quando o baú passa a aceitar o toque, e some depois de usada a chave. */
    readonly inventarioAparece: number;
    readonly inventarioSome: number;
    /**
     * A chave. As medidas vêm da arte e são impressas pelo `pnpm arte`: com a arte girada em
     * `giroDaArte` graus (a chave na horizontal, ponta à esquerda), o comprimento e a ponta são frações
     * da caixa da imagem (a ponta pode ficar fora dela: x negativo).
     */
    readonly chave: {
      readonly giroDaArte: number;
      readonly comprimento: number;
      readonly ponta: { readonly x: number; readonly y: number };
      /** Inclinação da chave guardada no inventário, em graus. */
      readonly inclinacaoNoInventario: number;
      /** Comprimento da chave junto à fechadura, em fração da largura do baú. */
      readonly comprimentoNoBau: number;
      /** Onde a ponta para antes de entrar: recuo (fração do comprimento) e altura acima da fechadura. */
      readonly aproximacao: { readonly recuo: number; readonly elevacao: number };
    };
    /** A chave balança de leve no inventário e brilha. */
    readonly balancoNoInventario: { readonly rotacao: number; readonly duracao: number };
    readonly brilhoDaChave: {
      readonly minimo: number;
      readonly maximo: number;
      readonly duracao: number;
    };
    /** Pulso da chave quando o convidado toca fora do baú. */
    readonly pulso: { readonly escala: number; readonly duracao: number };
    /** Reforço depois de `duracoes.reforcoDica` sem interação (US-04.4). */
    readonly reforco: {
      readonly escala: number;
      readonly pulsos: number;
      readonly duracao: number;
      readonly maximo: number;
    };
    /** Pétalas que sobem da boca do baú quando a tampa abre (RF-04.9). */
    readonly petalas: {
      readonly minimo: number;
      readonly maximo: number;
      /** Altura que sobem, em pixels, e quanto se desviam para os lados. */
      readonly subida: number;
      readonly deriva: number;
      readonly duracao: number;
      /** Largura de cada pétala em relação ao contêiner. */
      readonly largura: string;
    };
  };
  /**
   * Cena viva (épico 13, SPEC-18): pequenos movimentos de ambiente sobre as camadas pintadas. Tempos em
   * segundos; cada intervalo `[mínimo, máximo]` é sorteado a cada vez. As specs 19 a 22 acrescentam o bloco
   * de cada elemento (água, folhas, pássaros, esquilo, casal).
   */
  readonly vida: {
    /** Abaixo desta fração da altura da tela, a cena visível acima da carta é pouca e a vida pausa. */
    readonly pausaAbaixoDe: number;
    /** A carta só esconde a cena se cobre esta fração da largura da janela (nas telas largas o lago aparece dos lados). */
    readonly larguraParaCobrir: number;
    /** Medição de quadros logo depois que a vida começa: com muitos quadros lentos, o nível desce para leve. */
    readonly desempenho: {
      readonly janelaDeMedicao: number;
      /** Um quadro mais demorado que isto, em segundos, é lento. */
      readonly quadroLento: number;
      readonly fracaoDeQuadrosLentos: number;
    };
    readonly leve: {
      /** A água é redesenhada a esta taxa (quadros por segundo). */
      readonly quadrosDaAgua: number;
      /** Teto da densidade do canvas da água, em múltiplos da densidade da tela. */
      readonly resolucaoDaAgua: number;
      readonly maximoDeFolhas: number;
    };
    readonly completo: {
      readonly resolucaoDaAgua: number;
      readonly maximoDeFolhas: number;
    };
    /** Água viva (SPEC-19): a superfície do lago ondula e reflete a luz do pôr do sol. */
    readonly agua: {
      /** A água começa tantos segundos depois do início da vida. */
      readonly primeiroEm: number;
      /** O canvas aparece por esmaecimento nesse tempo, para qualquer diferença com a imagem não saltar aos olhos. */
      readonly aparece: number;
      /** Onde a água começa na camada do lago (a mata ao fundo não se mexe), uma região por orientação. */
      readonly regiao: {
        readonly vertical: RegiaoDeOndulacao;
        readonly horizontal: RegiaoDeOndulacao;
      };
      readonly onda: OndaDeOndulacao;
      /** Os reflexos crescem do brilho mínimo ao máximo com a opacidade do céu do pôr do sol. */
      readonly reflexos: Omit<ReflexosDaOndulacao, 'cor'> & {
        readonly brilhoMinimo: number;
        readonly brilhoMaximo: number;
      };
    };
    /** Folhas que se soltam da copa e caem balançando (SPEC-20). */
    readonly folhas: ParametrosDeFolha & {
      /** A primeira folha cai tantos segundos depois do início da vida. */
      readonly primeiroEm: number;
    };
    /** Bandos de pássaros que cruzam o céu (SPEC-20). */
    readonly passaros: ParametrosDePassaros & {
      readonly primeiroEm: number;
    };
    /** O esquilo que corre na grama de tempos em tempos (SPEC-21). */
    readonly esquilo: ParametrosDoEsquilo;
  };
  /** Arquivo de cada imagem do convite (SPEC-02, SPEC-03); caminhos relativos à página. */
  readonly imagens: Readonly<Record<ChaveDeImagem, ArteDaImagem>>;
  readonly curvas: {
    /** Mola curta com que o selo volta ao lugar se o gesto não chegou ao limiar (SPEC-16). */
    readonly mola: string;
    /** Sem aceleração (`none`): a travessia dos pássaros. */
    readonly linear: string;
    readonly suave: string;
    /** Subida do pulo do esquilo (`sine.out` já existe como `senoSaida`); a descida usa a entrada de seno. */
    readonly senoEntrada: string;
    readonly saida: string;
    readonly pouso: string;
    /** Entrada de movimento (`power2.in`), na volta do salto do baú. */
    readonly entrada: string;
    /** Vai e vem suave nas duas pontas (`power2.inOut`). */
    readonly viaDupla: string;
    /** Saída leve (`power1.out`): tampa e chave do baú. */
    readonly leve: string;
    /** Saída de seno (`sine.out`): a luz que assenta. */
    readonly senoSaida: string;
    /** Vai e vem forte (`power3.inOut`): a carta que se desdobra. */
    readonly viaDuplaForte: string;
    /** Entrada leve (`power1.in`): o balão sobe rápido e some pelo alto. */
    readonly entradaLeve: string;
  };
  readonly volumes: {
    readonly ambiente: number;
    readonly ambienteSobMusica: number;
    readonly efeitos: number;
    /** A poeira de fada em loop: um fundo bem baixo, que mal se percebe, sob o ambiente e as músicas. */
    readonly fada: number;
    readonly musica: number;
  };
  /** Transições de volume do áudio, em segundos (SPEC-08, tabela "Comportamento"). */
  readonly transicoesDeAudio: {
    /** Ambiente sobe de 0 ao volume normal no toque de entrada. */
    readonly entradaDoAmbiente: number;
    /** A poeira de fada sobe ao volume de fundo quando o baú abre e esmaece quando ele sai de cena. */
    readonly entradaDaFada: number;
    readonly saidaDaFada: number;
    /** Ambiente baixa quando uma música entra. */
    readonly ambienteSobMusica: number;
    /** Música entra (de 0 ao volume) ou sai (ao 0). */
    readonly musica: number;
    /** A música 1 entra devagar, de 0 ao volume, quando o convidado toca no baú. */
    readonly entradaDaMusica1: number;
    /** Ambiente volta ao volume normal quando a música 2 termina. */
    readonly retornoDoAmbiente: number;
  };
  /** Trecho inicial de cada música, em segundos (SPEC-08). */
  readonly musicas: {
    readonly inicio1: number;
    readonly inicio2: number;
  };
}
