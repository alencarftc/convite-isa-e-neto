/**
 * Painel de diagnóstico do piscar (11/11/2026), só em desenvolvimento e só com `?painel`: um botão pequeno no canto da tela que abre
 * uma lista de peças. Cada botão esconde uma peça da página NA HORA, sem recarregar, e outro toque a devolve. O defeito só aparece
 * no Motorola Edge 70 Fusion+ (144 Hz) e depende do estado da página (envelope esperando o toque, convite aberto, rolando); com
 * este painel quem está com o aparelho na mão desliga peça por peça enquanto o piscar acontece e vê qual o faz parar, sem as
 * rodadas de "recarregar com outro parâmetro" que mudavam o estado.
 */

export interface PecaDoPainel {
  readonly rotulo: string;
  /** A CSS que esconde a peça (aplicada com `!important`); vazia para peças de JavaScript. */
  readonly css: string;
}

const ESCONDER = 'visibility: hidden !important';

/** As peças da página, das maiores às menores, agrupadas pelo que o piscar poderia ser. */
export const GRUPOS_DO_PAINEL: readonly {
  readonly titulo: string;
  readonly pecas: readonly PecaDoPainel[];
}[] = [
  {
    titulo: 'Grandes',
    pecas: [
      { rotulo: 'cena inteira', css: `.cena { ${ESCONDER}; }` },
      { rotulo: 'chão da carta', css: `.convite__chao { ${ESCONDER}; }` },
      { rotulo: 'envelope', css: `.envelope { ${ESCONDER}; }` },
      { rotulo: 'carta e fotos', css: `.conteudo { ${ESCONDER}; }` },
      { rotulo: 'pétalas', css: `.petalas-do-convite { ${ESCONDER}; }` },
      { rotulo: 'botões', css: `.botao-som, .botao-pular, .botao-movimento { ${ESCONDER}; }` },
    ],
  },
  {
    titulo: 'Dentro da cena',
    pecas: [
      { rotulo: 'céu', css: `.camada--ceu { ${ESCONDER}; }` },
      { rotulo: 'céu do sol', css: `.camada--ceu-sol { ${ESCONDER}; }` },
      { rotulo: 'lago', css: `.camada--lago { ${ESCONDER}; }` },
      { rotulo: 'árvores', css: `.camada--arvores { ${ESCONDER}; }` },
      { rotulo: 'primeiro plano', css: `.camada--frente { ${ESCONDER}; }` },
      { rotulo: 'luz do pôr do sol', css: `.camada--luz { ${ESCONDER}; }` },
      { rotulo: 'vida (folhas, pássaros)', css: `.vida { ${ESCONDER}; }` },
      { rotulo: 'água (canvas)', css: `.ondulacao { display: none !important; }` },
      { rotulo: 'baú', css: `.bau { ${ESCONDER}; }` },
      { rotulo: 'casal', css: `.casal { ${ESCONDER}; }` },
    ],
  },
  {
    // Ao contrário dos outros: estes LIGAM uma camada de GPU em vez de esconder algo. Sem `will-change`, uma peça que o JavaScript escala
    // a cada quadro (o selo que pulsa, o envelope que nasce, as pétalas) pode ser rasterizada de novo a cada quadro; com ele, não.
    titulo: 'Dar camada de GPU (will-change)',
    pecas: [
      {
        rotulo: 'wc: envelope e selo',
        css: `.envelope, .selo { will-change: transform, opacity !important; }`,
      },
      {
        rotulo: 'wc: pétalas, folhas, esquilo',
        css: `.petala-do-convite, .folha, .esquilo { will-change: transform, opacity !important; }`,
      },
      { rotulo: 'wc: cena', css: `.cena { will-change: transform !important; }` },
      { rotulo: 'wc: carta', css: `.carta { will-change: transform, opacity !important; }` },
    ],
  },
  {
    titulo: 'Efeitos de CSS',
    pecas: [
      { rotulo: 'glow do envelope', css: `.envelope__aura { display: none !important; }` },
      { rotulo: 'filtros', css: `* { filter: none !important; }` },
      {
        rotulo: 'máscaras',
        css: `*, *::before, *::after { -webkit-mask-image: none !important; mask-image: none !important; }`,
      },
      {
        // O texto da carta (cinza claro por diferença ao papel, ADR-0016): com a mistura desligada o texto fica claro; só a cor volta ao normal.
        rotulo: 'mistura do texto (difference)',
        css: `.carta__bloco, .carta > .convite__rolar { mix-blend-mode: normal !important; color: var(--cor-texto) !important; }`,
      },
      {
        rotulo: 'todas as misturas',
        css:
          `* { mix-blend-mode: normal !important; } ` +
          `.carta__bloco, .carta > .convite__rolar { color: var(--cor-texto) !important; }`,
      },
      {
        rotulo: 'sombras',
        css: `* { box-shadow: none !important; text-shadow: none !important; }`,
      },
      { rotulo: 'todas as imagens', css: `img, picture, canvas { ${ESCONDER}; }` },
    ],
  },
];

export interface OpcoesDoPainel {
  /** `import.meta.env.DEV`: o painel só existe em desenvolvimento. */
  readonly desenvolvimento: boolean;
  /** `location.search`: o painel só abre com `?painel`. */
  readonly busca: string;
  readonly documento: Document;
  /** Congela (`true`) ou devolve (`false`) todas as animações do GSAP. */
  readonly congelarJs: (congelar: boolean) => void;
  /** Põe (`true`) ou tira (`false`) o relógio do GSAP para dormir: nada que ande por quadro no JavaScript (a água, as folhas) se move. */
  readonly pararRelogio: (parar: boolean) => void;
}

export interface PainelDeDiagnostico {
  /** As peças escondidas agora (pelo rótulo). */
  escondidas(): readonly string[];
  remover(): void;
}

const COR_FUNDO = 'rgba(20, 20, 24, 0.88)';
const COR_LIGADO = '#c0392b';
const COR_BOTAO = '#3a3a44';

function botao(documento: Document, texto: string): HTMLButtonElement {
  const elemento = documento.createElement('button');
  elemento.type = 'button';
  elemento.textContent = texto;
  elemento.style.cssText =
    `margin: 2px; padding: 6px 8px; min-height: 32px; border: 0; border-radius: 6px; color: #fff; background: ${COR_BOTAO};` +
    'font: 12px/1.1 system-ui, sans-serif; touch-action: manipulation;';
  return elemento;
}

/** Monta o painel (ou devolve `null` fora do desenvolvimento ou sem `?painel`). */
export function criarPainelDeDiagnostico({
  desenvolvimento,
  busca,
  documento,
  congelarJs,
  pararRelogio,
}: OpcoesDoPainel): PainelDeDiagnostico | null {
  if (!desenvolvimento || !new URLSearchParams(busca).has('painel')) return null;

  const ligadas = new Map<string, string>();
  const folha = documento.createElement('style');
  folha.dataset['painel'] = 'diagnostico';
  documento.head.append(folha);
  const atualizarFolha = (): void => {
    folha.textContent = [...ligadas.values()].join('\n');
  };

  const caixa = documento.createElement('div');
  caixa.dataset['painel'] = 'caixa';
  caixa.style.cssText =
    'position: fixed; top: 0; left: 0; z-index: 2147483647; max-width: 100vw; max-height: 70vh; overflow-y: auto;' +
    `padding: 4px; background: ${COR_FUNDO}; border-bottom-right-radius: 10px; color: #fff; font: 12px/1.2 system-ui, sans-serif;`;

  const abrir = botao(documento, 'D');
  const conteudo = documento.createElement('div');
  conteudo.hidden = true;
  abrir.addEventListener('click', () => {
    conteudo.hidden = !conteudo.hidden;
    abrir.textContent = conteudo.hidden ? 'D' : 'fechar';
  });
  caixa.append(abrir, conteudo);

  const alternar = (peca: PecaDoPainel, elemento: HTMLButtonElement): void => {
    if (ligadas.has(peca.rotulo)) {
      ligadas.delete(peca.rotulo);
      elemento.style.background = COR_BOTAO;
      elemento.textContent = peca.rotulo;
    } else {
      ligadas.set(peca.rotulo, peca.css);
      elemento.style.background = COR_LIGADO;
      elemento.textContent = `✕ ${peca.rotulo}`;
    }
    atualizarFolha();
  };

  for (const grupo of GRUPOS_DO_PAINEL) {
    const titulo = documento.createElement('div');
    titulo.textContent = grupo.titulo;
    titulo.style.cssText = 'margin: 6px 2px 0; opacity: 0.7;';
    conteudo.append(titulo);
    for (const peca of grupo.pecas) {
      const elemento = botao(documento, peca.rotulo);
      elemento.addEventListener('click', () => {
        alternar(peca, elemento);
      });
      conteudo.append(elemento);
    }
  }

  const titulo = documento.createElement('div');
  titulo.textContent = 'JavaScript e animações';
  titulo.style.cssText = 'margin: 6px 2px 0; opacity: 0.7;';
  const gsap = botao(documento, 'congelar GSAP');
  let congelado = false;
  gsap.addEventListener('click', () => {
    congelado = !congelado;
    congelarJs(congelado);
    gsap.style.background = congelado ? COR_LIGADO : COR_BOTAO;
    gsap.textContent = congelado ? '✕ GSAP congelado' : 'congelar GSAP';
  });
  const relogio = botao(documento, 'parar relógio (água, folhas)');
  let parado = false;
  relogio.addEventListener('click', () => {
    parado = !parado;
    pararRelogio(parado);
    relogio.style.background = parado ? COR_LIGADO : COR_BOTAO;
    relogio.textContent = parado ? '✕ relógio parado' : 'parar relógio (água, folhas)';
  });
  const cancelar = botao(documento, 'cancelar animações do navegador');
  cancelar.addEventListener('click', () => {
    for (const animacao of documento.getAnimations()) animacao.cancel();
  });
  conteudo.append(titulo, gsap, relogio, cancelar);

  documento.body.append(caixa);

  return {
    escondidas: () => [...ligadas.keys()],
    remover() {
      caixa.remove();
      folha.remove();
      ligadas.clear();
    },
  };
}
