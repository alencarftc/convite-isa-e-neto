import type { ArteDaImagem, ChaveDeImagem } from '../imagens/catalogo-de-imagens';

/** Formato de `src/config/config.ts` (SPEC-01, "Conteúdo e configuração"). Tempos em segundos. */
export interface ConfigConvite {
  /** ISO 8601 com fuso explícito. */
  readonly casamento: string;
  /** ISO 8601 com fuso explícito. */
  readonly prazoConfirmacao: string;
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
    readonly esperaSelo: number;
    readonly dicaChave: number;
    readonly reforcoDica: number;
    readonly limiteCritico: number;
    readonly limiteSeguranca: number;
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
    /** Cena aparece por esmaecimento com animação reduzida (SPEC-03, RF-03.6). */
    readonly esmaecimentoReduzido: number;
    /** Depois do toque, tempo de espera antes de mostrar "Preparando o bosque…". */
    readonly avisoDeEspera: number;
  };
  /** Parâmetros de movimento do bosque (SPEC-03). Os tempos em segundos, as distâncias em pixels. */
  readonly movimento: {
    /** A cena começa assim e se aproxima até 1 durante `duracoes.nevoa`. */
    readonly escalaInicialDoBosque: number;
    /** A névoa cresce até aqui enquanto se dissipa. */
    readonly escalaFinalDaNevoa: number;
    /** Fração de `duracoes.nevoa` em que a névoa se dissipa (2,4 s de 3 s). */
    readonly fracaoDaNevoa: number;
    /** Quanto cada camada se move (0 a 1); a mais próxima se move mais (SPEC-03, "Camadas"). */
    readonly profundidadeDasCamadas: {
      readonly ceu: number;
      readonly lago: number;
      readonly arvores: number;
      readonly bau: number;
      readonly frente: number;
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
   * Baú e chave (SPEC-04). A abertura (`tlBau`) soma `duracoes.bau` = 2 s; os instantes são
   * contados do toque, como na tabela "Abertura" da spec.
   */
  readonly bau: {
    readonly dicaSome: number;
    readonly chaveVaiAteAFechadura: number;
    readonly giroDaChave: number;
    readonly grausDoGiro: number;
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
    /** A aura dourada atrás do baú aparece quando o cursor passa por cima (computador). */
    readonly auraAparece: number;
    /** Chave flutuante no celular. */
    readonly flutuacao: {
      readonly amplitude: number;
      readonly rotacao: number;
      readonly duracao: number;
    };
    readonly brilhoDaChave: {
      readonly minimo: number;
      readonly maximo: number;
      readonly duracao: number;
    };
    /** Pulso único da chave quando o convidado toca fora do baú. */
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
    readonly chaveAparece: number;
  };
  /** Arquivo de cada imagem do convite (SPEC-02, SPEC-03); caminhos relativos à página. */
  readonly imagens: Readonly<Record<ChaveDeImagem, ArteDaImagem>>;
  readonly curvas: {
    readonly suave: string;
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
  };
  readonly volumes: {
    readonly ambiente: number;
    readonly ambienteSobMusica: number;
    readonly efeitos: number;
    readonly musica: number;
  };
  /** Transições de volume do áudio, em segundos (SPEC-08, tabela "Comportamento"). */
  readonly transicoesDeAudio: {
    /** Ambiente sobe de 0 ao volume normal no toque de entrada. */
    readonly entradaDoAmbiente: number;
    /** Ambiente baixa quando uma música entra. */
    readonly ambienteSobMusica: number;
    /** Música entra (de 0 ao volume) ou sai (ao 0). */
    readonly musica: number;
    /** Ambiente volta ao volume normal quando a música 2 termina. */
    readonly retornoDoAmbiente: number;
  };
  /** Trecho inicial de cada música, em segundos (SPEC-08). */
  readonly musicas: {
    readonly inicio1: number;
    readonly inicio2: number;
  };
}
