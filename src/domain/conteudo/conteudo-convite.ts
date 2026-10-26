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
    readonly chaveComputador: string;
    readonly chaveCelular: string;
    readonly avancar: string;
  };
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
