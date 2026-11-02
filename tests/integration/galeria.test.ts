import { beforeEach, describe, expect, it } from 'vitest';

import { content } from '@/config/content';
import type { FotoDaGaleria } from '@/domain/conteudo/conteudo-convite';
import { montarGaleria, repartirEmColunas } from '@/presentation/informacoes/galeria';

const foto = (nome: string, largura: number, altura: number): FotoDaGaleria => ({
  foto: `photos/${nome}.webp`,
  alt: nome,
  largura,
  altura,
});

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('repartirEmColunas', () => {
  it('põe cada foto na coluna mais baixa até ali, e as colunas terminam quase na mesma altura', () => {
    const fotos = [
      foto('a', 533, 800), // 1,50
      foto('b', 800, 600), // 0,75
      foto('c', 800, 450), // 0,56
      foto('d', 450, 800), // 1,78
      foto('e', 800, 600), // 0,75
      foto('f', 600, 800), // 1,33
    ];

    const colunas = repartirEmColunas(fotos, 2);

    expect(colunas.map((coluna) => coluna.map((f) => f.alt))).toEqual([
      ['a', 'e', 'f'],
      ['b', 'c', 'd'],
    ]);
    const altura = (coluna: FotoDaGaleria[]) =>
      coluna.reduce((soma, f) => soma + f.altura / f.largura, 0);
    expect(Math.abs(altura(colunas[0] ?? []) - altura(colunas[1] ?? []))).toBeLessThan(0.6);
  });

  it('mantém todas as fotos, sem repetir nem perder nenhuma', () => {
    const fotos = [foto('a', 1, 1), foto('b', 1, 2), foto('c', 2, 1)];

    expect(repartirEmColunas(fotos, 2).flat()).toHaveLength(3);
    expect(repartirEmColunas([], 2)).toEqual([[], []]);
  });
});

describe('a mini-galeria do casal (02/11/2026)', () => {
  const galeria = () => montarGaleria(content.galeria, content.rotulos.galeria);

  it('é um grupo nomeado, com duas colunas e uma imagem para cada foto do conteúdo', () => {
    const raiz = galeria();

    expect(raiz.getAttribute('role')).toBe('group');
    expect(raiz.getAttribute('aria-label')).toBe(content.rotulos.galeria);
    expect(raiz.querySelectorAll('.galeria__coluna')).toHaveLength(2);
    expect(raiz.querySelectorAll('img')).toHaveLength(content.galeria.length);
  });

  it('cada imagem leva o texto alternativo, o tamanho do arquivo e carrega só perto da tela', () => {
    const imagens = [...galeria().querySelectorAll('img')];

    for (const imagem of imagens) {
      const origem = content.galeria.find((f) => imagem.getAttribute('src') === f.foto);
      expect(origem).toBeDefined();
      expect(imagem.alt).toBe(origem?.alt);
      expect(imagem.alt.length).toBeGreaterThan(10);
      expect(imagem.width).toBe(origem?.largura);
      expect(imagem.height).toBe(origem?.altura);
      expect(imagem.getAttribute('loading')).toBe('lazy');
    }
  });

  it('o conteúdo tem as seis fotos, com tamanho e texto alternativo', () => {
    expect(content.galeria).toHaveLength(6);
    for (const f of content.galeria) {
      expect(f.largura).toBeGreaterThan(0);
      expect(f.altura).toBeGreaterThan(0);
      expect(f.foto).toMatch(/^photos\/galeria-\d\.webp$/);
    }
  });

  it('as fotos se alternam entre inclinar para um lado e para o outro, na ordem da galeria', () => {
    const lado = (origem: string) =>
      galeria()
        .querySelector(`img[src="${origem}"]`)
        ?.classList.contains('galeria__foto--esquerda');

    expect(lado('photos/galeria-1.webp')).toBe(true);
    expect(lado('photos/galeria-2.webp')).toBe(false);
    expect(lado('photos/galeria-3.webp')).toBe(true);
  });
});
