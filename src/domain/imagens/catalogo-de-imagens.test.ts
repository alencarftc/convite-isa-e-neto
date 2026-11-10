import { describe, expect, it } from 'vitest';

import {
  type ChaveDeImagem,
  CHAVES_CRITICAS,
  FILA_SECUNDARIA,
  urlDaImagem,
  urlsDaImagem,
} from './catalogo-de-imagens';

describe('catálogo de imagens', () => {
  it('as críticas são as seis da SPEC-02 (RF-02.3)', () => {
    expect(CHAVES_CRITICAS).toEqual([
      'ceu',
      'lago',
      'arvores',
      'primeiroPlano',
      'bauFechado',
      'chave',
    ]);
  });

  it('nenhuma imagem está ao mesmo tempo nas críticas e na fila secundária', () => {
    const secundarias: readonly ChaveDeImagem[] = FILA_SECUNDARIA.flat();

    expect(
      secundarias.filter((chave) => (CHAVES_CRITICAS as readonly string[]).includes(chave)),
    ).toEqual([]);
  });

  it('nenhuma imagem repete na fila secundária', () => {
    const todas = FILA_SECUNDARIA.flat();

    expect(new Set(todas).size).toBe(todas.length);
  });

  it('arte única vale para qualquer orientação', () => {
    expect(urlDaImagem('a.webp', 'vertical')).toBe('a.webp');
    expect(urlDaImagem('a.webp', 'horizontal')).toBe('a.webp');
    expect(urlsDaImagem('a.webp')).toEqual(['a.webp']);
  });

  it('arte por orientação escolhe o arquivo certo (CA-03.4.1)', () => {
    const arte = { vertical: 'a-9x16.webp', horizontal: 'a-16x9.webp' };

    expect(urlDaImagem(arte, 'vertical')).toBe('a-9x16.webp');
    expect(urlDaImagem(arte, 'horizontal')).toBe('a-16x9.webp');
    expect(urlsDaImagem(arte)).toEqual(['a-9x16.webp', 'a-16x9.webp']);
  });

  describe('variante do computador (09/11/2026)', () => {
    const arte = {
      vertical: 'a-9x16.webp',
      horizontal: 'a-16x9.webp',
      computador: 'a-mestre.webp',
    };

    it('quem usa mouse a escolhe em qualquer orientação (a janela estreita não vira o celular); o toque segue a orientação', () => {
      expect(urlDaImagem(arte, 'horizontal', true)).toBe('a-mestre.webp');
      expect(urlDaImagem(arte, 'vertical', true)).toBe('a-mestre.webp');
      expect(urlDaImagem(arte, 'horizontal', false)).toBe('a-16x9.webp');
      expect(urlDaImagem(arte, 'horizontal')).toBe('a-16x9.webp');
      expect(urlDaImagem(arte, 'vertical')).toBe('a-9x16.webp');
    });

    it('arte sem a variante usa a horizontal no computador, em qualquer orientação; a única ignora o pedido', () => {
      const semVariante = { vertical: 'v.webp', horizontal: 'h.webp' };

      expect(urlDaImagem(semVariante, 'horizontal', true)).toBe('h.webp');
      expect(urlDaImagem(semVariante, 'vertical', true)).toBe('h.webp');
      expect(urlDaImagem('a.webp', 'horizontal', true)).toBe('a.webp');
    });

    it('todos os arquivos da arte incluem o do computador, para o peso e a existência serem conferidos', () => {
      expect(urlsDaImagem(arte)).toEqual(['a-9x16.webp', 'a-16x9.webp', 'a-mestre.webp']);
    });
  });
});
