import type { UnidadesDeTempo } from '../contagem/contagem-regressiva';

/**
 * Formato de `src/config/content.ts`. Todo texto visível ao convidado mora aqui
 * (SPEC-01, RNF-01.2). Este tipo cresce a cada spec implementada; a estrutura
 * completa prevista está em docs/documentacao.md, seção "Conteúdo".
 */
/** Um balão da história (SPEC-05, RF-05.1): a frase e a foto que a acompanha. */
export interface BalaoDoConvite {
  readonly frase: string;
  /** Caminho da foto, relativo à página. */
  readonly foto: string;
  /** Texto alternativo da foto (RF-05.8); entre colchetes enquanto a foto não chega. */
  readonly alt: string;
  /** Ponto de foco do recorte circular, como `50% 35%`. */
  readonly foco: string;
}

/** A carta, bloco a bloco (SPEC-06, "Layout da carta"). Textos aprovados em docs/requisitos.md. */
export interface CartaDoConvite {
  readonly versiculo: string;
  readonly referencia: string;
  readonly bencao: string;
  /** Um nome por linha. */
  readonly paisNoiva: readonly string[];
  readonly paisNoivo: readonly string[];
  /** O "e" fica separado porque é dourado no título da carta. */
  readonly nomes: { readonly noiva: string; readonly e: string; readonly noivo: string };
  readonly convite: string;
  readonly data: string;
  readonly cerimonia: string;
  readonly local: string;
  readonly endereco: string;
  readonly fecho: string;
  readonly referenciaFecho: string;
  readonly despedida: string;
  readonly assinatura: string;
}

export interface ConteudoConvite {
  readonly rotulos: {
    /** Rótulo acessível da seção de informações. */
    readonly informacoes: string;
    /** Nome acessível do botão que cobre o baú e a chave (SPEC-04, RF-04.4). */
    readonly abrirBau: string;
    /** Nome acessível da região que reúne os balões. */
    readonly historia: string;
    /** Nome acessível do botão transparente que acelera a história. */
    readonly avancarHistoria: string;
    /** Nome acessível do botão que cobre o envelope (SPEC-06, RF-06.3). */
    readonly abrirEnvelope: string;
    /** Títulos dos cartões das informações (SPEC-07); a spec deixa em aberto se ficam visíveis. */
    readonly mensagem: string;
    readonly traje: string;
  };
  readonly envelope: {
    /** Escrito no envelope, acima do selo. */
    readonly para: string;
    /** Iniciais no selo; são texto, não imagem (RF-06.2). */
    readonly iniciais: string;
  };
  readonly entrada: {
    readonly nomes: string;
    readonly tocar: string;
    readonly volume: string;
    readonly aguarde: string;
  };
  readonly dicas: {
    /** Nome acessível do botão de som (o estado vai em `aria-pressed`). */
    readonly som: string;
    readonly somLigado: string;
    readonly somDesligado: string;
    readonly pular: string;
    /** Atalho para leitor de tela e teclado: visível só com foco (SPEC-09, RF-09.4). */
    readonly atalho: string;
    readonly chaveComputador: string;
    readonly chaveCelular: string;
    readonly avancar: string;
    readonly selo: string;
    readonly rolar: string;
  };
  readonly carta: CartaDoConvite;
  /** Mensagem do casal, abaixo da contagem (SPEC-07, RF-07.7). */
  readonly mensagem: {
    readonly paragrafos: readonly string[];
    /** Verso do louvor, em itálico, com o nome da música; pendência do casal (entre colchetes). */
    readonly versoLouvor: string;
    readonly assinatura: string;
  };
  /** Traje (dress code). */
  readonly dressCode: string;
  /** Os balões da história, na ordem em que aparecem (SPEC-05). */
  readonly baloes: readonly BalaoDoConvite[];
  readonly contagem: {
    /** Modelo com `{dias}`, `{horas}` e `{minutos}`. */
    readonly antes: string;
    readonly noDia: string;
    readonly depois: string;
    readonly unidades: UnidadesDeTempo;
  };
  readonly botoes: {
    readonly confirmar: string;
    readonly prazo: string;
    readonly comoChegar: string;
    readonly encerrado: string;
  };
}
