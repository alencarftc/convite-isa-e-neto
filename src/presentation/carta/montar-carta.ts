import type { CartaDoConvite } from '@/domain/conteudo/conteudo-convite';

import { criar } from '../dom';

const NAMESPACE_SVG = 'http://www.w3.org/2000/svg';

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

/** O papel da carta (imagem 14): a arte e as medidas com que a CSS o monta em três partes. */
export interface PapelDaCarta {
  readonly url: string;
  /** O ladrilho do miolo: a faixa do meio da arte e o espelho dela, repetidos na vertical sob o texto. */
  readonly urlDoMiolo: string;
  /** Altura / largura da arte. */
  readonly proporcao: number;
  /** Faixa do meio, sem rosas, em frações da altura da arte: é o que o ladrilho repete quando o texto é longo. */
  readonly corte: { readonly de: number; readonly ate: number };
}

/**
 * A URL que vai para uma variável CSS (`--papel`) é resolvida em relação ao ARQUIVO DE ESTILOS que usa a variável, e não
 * ao documento (09/11/2026). Com o CSS ligado de `/src/styles/index.css` (servidor de desenvolvimento), `assets/objects/…`
 * virava `/src/styles/assets/objects/…`, que não existe, e o papel da carta sumia no celular e no computador. Completa
 * contra a base do documento, a URL vale onde quer que o CSS esteja (embutido, em outra pasta ou em outro arquivo).
 */
function urlCompleta(url: string): string {
  try {
    return new URL(url, document.baseURI).href;
  } catch {
    return url; // sem base válida (um ambiente sem navegador): fica como veio
  }
}

/**
 * A carta (SPEC-06, "Layout da carta"): catorze blocos em HTML real, na ordem aprovada. Cada bloco
 * tem a classe `carta__bloco`, para a abertura os revelar um a um. O título é o `h2` com
 * `tabindex="-1"`, para onde o foco vai quando a carta termina de abrir (RF-06.10). O papel (14) é o
 * fundo, em três partes (topo, miolo ladrilhado, base), e a CSS lê a arte e as medidas de variáveis
 * (`--papel`, `--papel-miolo`, `--papel-proporcao`, `--papel-corte-de`, `--papel-corte-ate`); o miolo é
 * um elemento decorativo à parte, atrás do texto. Se a imagem faltar, vale o marfim da CSS (RNF-06.1).
 */
export function montarCarta(carta: CartaDoConvite, papel: PapelDaCarta): HTMLElement {
  const artigo = criar('article', 'carta');
  artigo.setAttribute('aria-labelledby', 'carta-titulo');
  artigo.style.setProperty('--papel', `url('${urlCompleta(papel.url)}')`);
  artigo.style.setProperty('--papel-miolo', `url('${urlCompleta(papel.urlDoMiolo)}')`);
  artigo.style.setProperty('--papel-proporcao', String(papel.proporcao));
  artigo.style.setProperty('--papel-corte-de', String(papel.corte.de));
  artigo.style.setProperty('--papel-corte-ate', String(papel.corte.ate));

  const miolo = criar('span', 'carta__miolo');
  miolo.setAttribute('aria-hidden', 'true');

  const pais = criar('div', 'carta__bloco carta__pais');
  pais.append(
    criarColuna(carta.paisNoiva),
    criar('hr', 'carta__separador'),
    criarColuna(carta.paisNoivo),
  );

  // O "&" é dourado e fica fora da mistura que dá a tinta ao texto (ADR-0016), e a mistura só vale no mesmo elemento da
  // opacidade da revelação: por isso o título é um contêiner e cada nome e o "&" são blocos próprios.
  const titulo = criar('h2', 'carta__nomes');
  titulo.id = 'carta-titulo';
  titulo.tabIndex = -1;
  titulo.append(
    criar('span', 'carta__bloco carta__nome', carta.nomes.noiva),
    document.createTextNode(' '),
    criar('span', 'carta__bloco carta__e', carta.nomes.e),
    document.createTextNode(' '),
    criar('span', 'carta__bloco carta__nome', carta.nomes.noivo),
  );

  // A data é o que os convidados mais procuram, os idosos sobretudo (10/11/2026): o dia e a hora são linhas próprias e a
  // hora vem em destaque. O texto segue o de `content` ("DIA · DATA · HORA": o último " · " fica oculto na CSS).
  const data = criar('p', 'carta__bloco carta__data');
  const corte = carta.data.lastIndexOf(' · ');
  if (corte === -1) {
    data.textContent = carta.data;
  } else {
    const hora = criar('span', 'carta__hora');
    hora.append(criar('span', 'carta__ponto', ' · '), carta.data.slice(corte + 3));
    data.append(criar('span', 'carta__dia', carta.data.slice(0, corte)), hora);
  }

  const local = criar('div', 'carta__bloco carta__local');
  local.append(
    criar('p', '', carta.cerimonia),
    criar('p', '', carta.local),
    criar('p', '', carta.endereco),
  );

  artigo.append(
    miolo,
    criar('p', 'carta__bloco carta__versiculo', carta.versiculo),
    criar('p', 'carta__bloco carta__rotulo', carta.referencia),
    criarFilete(),
    criar('p', 'carta__bloco carta__rotulo', carta.bencao),
    pais,
    titulo,
    criar('p', 'carta__bloco carta__convite', carta.convite),
    data,
    local,
    criarFilete(),
    criar('p', 'carta__bloco carta__versiculo', carta.fecho),
    criar('p', 'carta__bloco carta__rotulo', carta.referenciaFecho),
    criar('p', 'carta__bloco carta__despedida', carta.despedida),
    criar('p', 'carta__bloco carta__assinatura', carta.assinatura),
  );
  return artigo;
}
