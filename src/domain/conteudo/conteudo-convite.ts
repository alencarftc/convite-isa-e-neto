import type { UnidadesDeTempo } from '../contagem/contagem-regressiva';

/**
 * Formato de `src/config/content.ts`. Todo texto visível ao convidado mora aqui
 * (SPEC-01, RNF-01.2). Este tipo cresce a cada spec implementada; a estrutura
 * completa prevista está em docs/documentacao.md, seção "Conteúdo".
 */
export interface ConteudoConvite {
  readonly rotulos: {
    /** Rótulo acessível da seção de informações. */
    readonly informacoes: string;
    /** Nome acessível do botão que cobre o baú e a chave (SPEC-04, RF-04.4). */
    readonly abrirBau: string;
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
  };
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
