import type { FotoDaGaleria } from '@/domain/conteudo/conteudo-convite';

import { criar } from '../dom';

/**
 * Reparte as fotos em colunas, cada uma na coluna que está mais baixa até ali (pela proporção do arquivo): as colunas
 * terminam quase na mesma altura, mesmo com fotos em pé e deitadas, e a ordem da galeria se mantém de cima para baixo.
 */
export function repartirEmColunas(
  fotos: readonly FotoDaGaleria[],
  quantidadeDeColunas: number,
): FotoDaGaleria[][] {
  const colunas = Array.from({ length: quantidadeDeColunas }, () => ({
    altura: 0,
    fotos: [] as FotoDaGaleria[],
  }));
  for (const foto of fotos) {
    const maisBaixa = colunas.reduce((menor, coluna) =>
      coluna.altura < menor.altura ? coluna : menor,
    );
    maisBaixa.fotos.push(foto);
    maisBaixa.altura += foto.altura / foto.largura;
  }
  return colunas.map((coluna) => coluna.fotos);
}

const COLUNAS = 2;

/**
 * A mini-galeria do casal (02/11/2026): duas colunas de fotos inteiras. Cada imagem leva o texto alternativo, o tamanho do
 * arquivo (o lugar é reservado antes de ela chegar) e `loading="lazy"`: só baixa quando o convidado rola até perto dela.
 */
export function montarGaleria(fotos: readonly FotoDaGaleria[], rotulo: string): HTMLElement {
  const galeria = criar('div', 'galeria');
  galeria.setAttribute('role', 'group');
  galeria.setAttribute('aria-label', rotulo);

  const ordem = new Map(fotos.map((foto, indice) => [foto, indice]));
  for (const fotosDaColuna of repartirEmColunas(fotos, COLUNAS)) {
    const coluna = criar('div', 'galeria__coluna');
    for (const foto of fotosDaColuna) {
      const imagem = document.createElement('img');
      const inclinacao = (ordem.get(foto) ?? 0) % 2 === 0 ? 'esquerda' : 'direita';
      imagem.className = `galeria__foto galeria__foto--${inclinacao}`;
      imagem.src = foto.foto;
      imagem.alt = foto.alt;
      imagem.width = foto.largura;
      imagem.height = foto.altura;
      imagem.loading = 'lazy';
      imagem.decoding = 'async';
      imagem.draggable = false;
      coluna.append(imagem);
    }
    galeria.append(coluna);
  }
  return galeria;
}
