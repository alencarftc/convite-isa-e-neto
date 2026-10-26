import { beforeEach, describe, expect, it } from 'vitest';

import {
  adiarImagem,
  carregarImagemTardia,
  carregarImagensTardias,
} from '@/presentation/imagens/imagens-tardias';

beforeEach(() => {
  document.body.innerHTML = '<div id="etapa"></div><div id="outra"></div>';
});

const caixa = (id: string) => {
  const elemento = document.querySelector<HTMLElement>(`#${id}`);
  if (!elemento) throw new Error(`sem #${id}`);
  return elemento;
};

describe('imagens tardias (SPEC-02, RF-02.7)', () => {
  it('adiarImagem guarda o endereço em data-src e não pede nada: a imagem fica sem src', () => {
    const imagem = adiarImagem(document.createElement('img'), 'assets/foto.svg');

    expect(imagem.getAttribute('data-src')).toBe('assets/foto.svg');
    expect(imagem.hasAttribute('src')).toBe(false);
  });

  it('carregarImagemTardia dá o src e limpa a marca; chamar de novo não muda nada', () => {
    const imagem = adiarImagem(document.createElement('img'), 'assets/foto.svg');

    carregarImagemTardia(imagem);
    carregarImagemTardia(imagem);

    expect(imagem.getAttribute('src')).toBe('assets/foto.svg');
    expect(imagem.hasAttribute('data-src')).toBe(false);
  });

  it('uma imagem que nunca foi adiada fica como está', () => {
    const imagem = document.createElement('img');
    imagem.src = 'assets/outra.svg';

    carregarImagemTardia(imagem);

    expect(imagem.getAttribute('src')).toBe('assets/outra.svg');
  });

  it('carregarImagensTardias pede só as imagens de dentro do contêiner da etapa', () => {
    const daEtapa = adiarImagem(document.createElement('img'), 'a.svg');
    const deOutraEtapa = adiarImagem(document.createElement('img'), 'b.svg');
    caixa('etapa').append(daEtapa);
    caixa('outra').append(deOutraEtapa);

    carregarImagensTardias(caixa('etapa'));

    expect(daEtapa.getAttribute('src')).toBe('a.svg');
    expect(deOutraEtapa.hasAttribute('src')).toBe(false);
  });
});
