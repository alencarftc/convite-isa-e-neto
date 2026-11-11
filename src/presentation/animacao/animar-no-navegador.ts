/**
 * Uma animação do navegador (`Element.animate`) com o aviso de cancelamento já tratado: cancelar uma animação rejeita a promessa
 * `finished` com um `AbortError`, e sem ninguém ouvindo isso vira um `unhandledrejection`, que alguns navegadores registram como
 * erro. Aqui o cancelamento é normal (a cena troca de etapa), então a rejeição é engolida.
 */
export function animarNoNavegador(
  elemento: HTMLElement,
  quadros: Keyframe[],
  opcoes: KeyframeAnimationOptions,
): Animation {
  const animacao = elemento.animate(quadros, opcoes);
  void Promise.resolve(animacao.finished).catch(() => undefined);
  return animacao;
}
