import { describe, expect, it } from 'vitest';

import { criarCarregadorDeImagens, type ImagemDecodificavel } from './carregador-de-imagens';

function imagemFalsa(decodificar: () => Promise<void>): ImagemDecodificavel {
  return { src: '', fetchPriority: 'auto', decode: decodificar };
}

describe('criarCarregadorDeImagens', () => {
  it('aponta a imagem para a url, decodifica e devolve true', async () => {
    const criadas: ImagemDecodificavel[] = [];
    const carregador = criarCarregadorDeImagens(() => {
      const imagem = imagemFalsa(() => Promise.resolve());
      criadas.push(imagem);
      return imagem;
    });

    await expect(carregador.baixar('assets/ceu.webp', 'alta')).resolves.toBe(true);

    expect(criadas).toHaveLength(1);
    expect(criadas[0]?.src).toBe('assets/ceu.webp');
  });

  it('prioridade alta pede fetchpriority high; baixa pede low (RNF-02.3)', async () => {
    const criadas: ImagemDecodificavel[] = [];
    const carregador = criarCarregadorDeImagens(() => {
      const imagem = imagemFalsa(() => Promise.resolve());
      criadas.push(imagem);
      return imagem;
    });

    await carregador.baixar('a', 'alta');
    await carregador.baixar('b', 'baixa');

    expect(criadas.map((i) => i.fetchPriority)).toEqual(['high', 'low']);
  });

  it('arquivo inexistente ou corrompido devolve false e nunca rejeita (404)', async () => {
    const carregador = criarCarregadorDeImagens(() =>
      imagemFalsa(() => Promise.reject(new Error('EncodingError'))),
    );

    await expect(carregador.baixar('nao-existe.webp', 'alta')).resolves.toBe(false);
  });

  it('se criar a imagem lançar, também devolve false', async () => {
    const carregador = criarCarregadorDeImagens(() => {
      throw new Error('sem Image');
    });

    await expect(carregador.baixar('a', 'baixa')).resolves.toBe(false);
  });
});
