import type { CartaDoConvite } from '@/domain/conteudo/conteudo-convite';

const NAMESPACE_SVG = 'http://www.w3.org/2000/svg';

function criar(tag: string, classe: string, texto?: string): HTMLElement {
  const elemento = document.createElement(tag);
  elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

/** Linha dourada fina com um pequeno ornamento central (blocos 3 e 10). */
function criarFilete(): SVGSVGElement {
  const svg = document.createElementNS(NAMESPACE_SVG, 'svg');
  svg.setAttribute('class', 'carta__bloco carta__filete');
  svg.setAttribute('viewBox', '0 0 240 12');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const [x1, x2] of [
    [0, 100],
    [140, 240],
  ] as const) {
    const linha = document.createElementNS(NAMESPACE_SVG, 'line');
    linha.setAttribute('x1', String(x1));
    linha.setAttribute('x2', String(x2));
    linha.setAttribute('y1', '6');
    linha.setAttribute('y2', '6');
    svg.append(linha);
  }
  const ornamento = document.createElementNS(NAMESPACE_SVG, 'path');
  ornamento.setAttribute('d', 'M120 0 L128 6 L120 12 L112 6 Z');
  svg.append(ornamento);
  return svg;
}

function criarColuna(nomes: readonly string[]): HTMLElement {
  const coluna = criar('ul', 'carta__coluna');
  for (const nome of nomes) coluna.append(criar('li', 'carta__pai', nome));
  return coluna;
}

/**
 * A carta (SPEC-06, "Layout da carta"): catorze blocos em HTML real, na ordem aprovada. Cada bloco
 * tem a classe `carta__bloco`, para a abertura os revelar um a um. O título é o `h2` com
 * `tabindex="-1"`, para onde o foco vai quando a carta termina de abrir (RF-06.10). A imagem do
 * papel (14) é o fundo; se faltar, vale o marfim da CSS (RNF-06.1).
 */
export function montarCarta(carta: CartaDoConvite, imagemDoPapel: string): HTMLElement {
  const artigo = criar('article', 'carta');
  artigo.setAttribute('aria-labelledby', 'carta-titulo');
  artigo.style.backgroundImage = `url('${imagemDoPapel}')`;

  const pais = criar('div', 'carta__bloco carta__pais');
  pais.append(
    criarColuna(carta.paisNoiva),
    criar('hr', 'carta__separador'),
    criarColuna(carta.paisNoivo),
  );

  const titulo = criar('h2', 'carta__bloco carta__nomes');
  titulo.id = 'carta-titulo';
  titulo.tabIndex = -1;
  titulo.append(
    document.createTextNode(`${carta.nomes.noiva} `),
    criar('span', 'carta__e', carta.nomes.e),
    document.createTextNode(` ${carta.nomes.noivo}`),
  );

  const local = criar('div', 'carta__bloco carta__local');
  local.append(
    criar('p', '', carta.cerimonia),
    criar('p', '', carta.local),
    criar('p', '', carta.endereco),
  );

  artigo.append(
    criar('p', 'carta__bloco carta__versiculo', carta.versiculo),
    criar('p', 'carta__bloco carta__rotulo', carta.referencia),
    criarFilete(),
    criar('p', 'carta__bloco carta__rotulo', carta.bencao),
    pais,
    titulo,
    criar('p', 'carta__bloco carta__convite', carta.convite),
    criar('p', 'carta__bloco carta__data', carta.data),
    local,
    criarFilete(),
    criar('p', 'carta__bloco carta__versiculo', carta.fecho),
    criar('p', 'carta__bloco carta__rotulo', carta.referenciaFecho),
    criar('p', 'carta__bloco carta__despedida', carta.despedida),
    criar('p', 'carta__bloco carta__assinatura', carta.assinatura),
  );
  return artigo;
}
