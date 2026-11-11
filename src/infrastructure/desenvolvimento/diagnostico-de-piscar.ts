/**
 * Chave de diagnóstico do piscar (10/11/2026), só em desenvolvimento: o convite piscava, imagem por imagem, no Motorola Edge 70
 * Fusion+ (144 Hz, Android 16) e não no Galaxy A54, e o defeito não se reproduz no computador. Para achar a peça culpada sem
 * mexer na produção, `?sem=agua,deriva` liga o convite com essas peças desligadas e `?fps=60` limita o relógio das animações.
 * Abra o endereço da rede (`pnpm dev:rede`) no celular e vá desligando peças até o piscar parar.
 */

/** Peças de JavaScript: deixam de ser criadas ou são paradas. */
const PECAS_DE_SCRIPT = [
  'agua',
  'passaros',
  'folhas',
  'esquilo',
  'petalas',
  'deriva',
  'aura',
  // A pulsação do selo do envelope (o selo piscava quando o envelope aparecia, 11/11/2026).
  'pulso',
] as const;

/** Peças de CSS: um efeito que cada uma desliga em toda a página. */
const PECAS_DE_ESTILO = {
  mascaras:
    '*, *::before, *::after { -webkit-mask-image: none !important; mask-image: none !important; }',
  filtros: '* { filter: none !important; }',
  willchange: '* { will-change: auto !important; }',
  // Sem efeito desde a ADR-0047 (a cena não tem mais `clip-path`); fica para os endereços antigos.
  clip: '.cena { clip-path: none !important; }',
  // O glow dourado atrás do envelope que flutua (11/11/2026): sombras difusas de até 110 px de desfoque animadas por CSS.
  glow: '.envelope__aura { display: none !important; }',
  // A carta: a sombra projetada (`drop-shadow`) do papel inteiro, que é um filtro sobre um elemento altíssimo.
  sombradacarta: '.carta { filter: none !important; }',
  // O carrossel de fotos, onde o piscar aparecia mais: o fundo desfocado, os cantos arredondados e a sombra do quadro.
  fundo: '.carrossel__fundo { display: none !important; }',
  cantos: '.carrossel__quadro { border-radius: 0 !important; }',
  sombra: '.carrossel__quadro { box-shadow: none !important; }',
  mistura:
    '.carta__bloco, .carta > .convite__rolar { mix-blend-mode: normal !important; color: var(--cor-texto) !important; } ' +
    '.foto-em-circulo::after, .camada--luz { mix-blend-mode: normal !important; }',
} as const;

export type PecaDeScript = (typeof PECAS_DE_SCRIPT)[number];
export type PecaDeEstilo = keyof typeof PECAS_DE_ESTILO;
export type PecaDoDiagnostico = PecaDeScript | PecaDeEstilo;

const TODAS: readonly PecaDoDiagnostico[] = [
  ...PECAS_DE_SCRIPT,
  ...Object.keys(PECAS_DE_ESTILO),
] as PecaDoDiagnostico[];

/** Atalhos de `?sem=`: cada um desliga várias peças de uma vez, para achar o culpado por divisão (metade, metade). */
const GRUPOS: Readonly<Record<string, readonly PecaDoDiagnostico[]>> = {
  tudo: TODAS,
  js: PECAS_DE_SCRIPT,
  css: Object.keys(PECAS_DE_ESTILO) as PecaDeEstilo[],
  vida: ['agua', 'passaros', 'folhas', 'esquilo'],
};

export interface OpcoesDoDiagnostico {
  /** `import.meta.env.DEV`: o diagnóstico só existe em desenvolvimento. */
  readonly desenvolvimento: boolean;
  /** `location.search`. */
  readonly busca: string;
}

/** As peças pedidas em `?sem=` (`tudo` desliga todas); vazio em produção ou sem o parâmetro. */
export function lerPecasDesligadas({
  desenvolvimento,
  busca,
}: OpcoesDoDiagnostico): ReadonlySet<PecaDoDiagnostico> {
  if (!desenvolvimento) return new Set();
  const pedido = new URLSearchParams(busca).get('sem');
  if (pedido === null) return new Set();
  const nomes = pedido.split(',').map((nome) => nome.trim());
  // Os grupos (`tudo`, `js`, `css`, `vida`) valem pelas peças que reúnem; o resto, pelo próprio nome.
  const pedidas = nomes.flatMap((nome): readonly string[] => GRUPOS[nome] ?? [nome]);
  return new Set(TODAS.filter((peca) => pedidas.includes(peca)));
}

/**
 * `?com=carta,cena`: dá camada própria de GPU (`will-change`) a estas peças desde o começo, para ver se o piscar é falta dela; `?com=dvh`
 * volta a cena e o chão ao jeito de antes da ADR-0046, para comparar.
 */
const PROMOCOES = {
  carta: '.carta { will-change: transform, opacity !important; }',
  cena: '.cena { will-change: transform !important; }',
  chao: '.convite__chao { will-change: transform, opacity !important; }',
  casal: '.casal__imagem { will-change: transform, opacity !important; }',
  conteudo: '.conteudo { will-change: transform !important; }',
  // O jeito de antes da ADR-0046: a cena com 100dvh, ancorada em cima, e o chão com top: 100% (acompanham a barra de endereço do navegador).
  dvh:
    '.cena { inset: 0 !important; height: 100dvh !important; } ' +
    '.convite__chao { top: calc(100% + var(--sobra-da-cena) - 6vh) !important; bottom: auto !important; }',
  // O jeito de antes da ADR-0045: as camadas de tela cheia da cena e os espaços da vida com camada de GPU permanente.
  camadas: '.camada, .vida { will-change: transform !important; }',
} as const;

/** A CSS das promoções pedidas em `?com=` ('' em produção ou sem o parâmetro). */
export function estiloDasPromocoes({ desenvolvimento, busca }: OpcoesDoDiagnostico): string {
  if (!desenvolvimento) return '';
  const nomes = (new URLSearchParams(busca).get('com') ?? '').split(',').map((nome) => nome.trim());
  return (Object.keys(PROMOCOES) as (keyof typeof PROMOCOES)[])
    .filter((nome) => nomes.includes(nome))
    .map((nome) => PROMOCOES[nome])
    .join('\n');
}

/** O teto de quadros por segundo pedido em `?fps=`, ou `null`. */
export function lerTetoDeQuadros({ desenvolvimento, busca }: OpcoesDoDiagnostico): number | null {
  if (!desenvolvimento) return null;
  const teto = Number(new URLSearchParams(busca).get('fps'));
  return Number.isInteger(teto) && teto >= 10 && teto <= 240 ? teto : null;
}

/** As camadas permanentes que o carrossel tinha antes do ajuste de 10/11/2026 (`?velho=carrossel`), para comparar no aparelho. */
const CARROSSEL_ANTIGO =
  '.carrossel__slide { will-change: transform, opacity !important; visibility: visible !important; } ' +
  '.carrossel__foto { will-change: transform !important; }';

/** `?velho=carrossel` devolve o carrossel ao jeito antigo (camadas permanentes, fotos escondidas só por opacidade). */
export function estiloDoCarrosselAntigo({ desenvolvimento, busca }: OpcoesDoDiagnostico): string {
  if (!desenvolvimento) return '';
  return new URLSearchParams(busca).get('velho') === 'carrossel' ? CARROSSEL_ANTIGO : '';
}

/** `?ocultar=carta,cena`: esconde uma região da tela (`visibility: hidden`) para ver se é ela que pisca. */
const REGIOES = {
  cena: '.cena, .convite__chao { visibility: hidden !important; }',
  carta: '.carta { visibility: hidden !important; }',
  cartoes: '.conteudo > :not(.carta) { visibility: hidden !important; }',
  carrossel: '.carrossel { visibility: hidden !important; }',
  seta: '.convite__rolar { visibility: hidden !important; }',
  botoes: '.botao-som, .botao-pular, .botao-movimento { visibility: hidden !important; }',
  petalas: '.petalas-do-convite { visibility: hidden !important; }',
} as const;

/** A CSS das regiões pedidas em `?ocultar=` ('' em produção ou sem o parâmetro). */
export function estiloDasRegioesOcultas({ desenvolvimento, busca }: OpcoesDoDiagnostico): string {
  if (!desenvolvimento) return '';
  const nomes = (new URLSearchParams(busca).get('ocultar') ?? '')
    .split(',')
    .map((nome) => nome.trim());
  return (Object.keys(REGIOES) as (keyof typeof REGIOES)[])
    .filter((nome) => nomes.includes(nome))
    .map((nome) => REGIOES[nome])
    .join('\n');
}

/** A CSS que desliga as peças de estilo pedidas ('' se não há nenhuma). */
export function estiloDoDiagnostico(pecas: ReadonlySet<PecaDoDiagnostico>): string {
  return (Object.keys(PECAS_DE_ESTILO) as PecaDeEstilo[])
    .filter((peca) => pecas.has(peca))
    .map((peca) => PECAS_DE_ESTILO[peca])
    .concat(
      // O baú à espera: a aura que respira, o brilho da chave, a dica e o inventário (param no toque do baú).
      pecas.has('aura')
        ? ['.bau__aura, .bau__brilho, .bau__dica, .inventario { display: none !important; }']
        : [],
    )
    .join('\n');
}
