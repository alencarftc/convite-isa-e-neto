import gsap from 'gsap';
import { beforeEach, describe, expect, it } from 'vitest';

import { soltarPetalas } from '@/presentation/petalas/soltar-petalas';

function imagemPronta(pronta: boolean): HTMLImageElement {
  const imagem = document.createElement('img');
  imagem.src = 'petala.svg';
  Object.defineProperty(imagem, 'complete', { value: pronta });
  Object.defineProperty(imagem, 'naturalWidth', { value: pronta ? 96 : 0 });
  return imagem;
}

const base = {
  origem: { x: '50%', y: '30%' },
  largura: '12%',
  subida: 220,
  deriva: 70,
  duracao: 0.05,
  curva: 'power2.out',
};

let conteiner: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '<div id="caixa"></div>';
  const caixa = document.querySelector<HTMLElement>('#caixa');
  if (!caixa) throw new Error('sem caixa');
  conteiner = caixa;
});

describe('soltarPetalas (SPEC-04 RF-04.9, reaproveitada na SPEC-06)', () => {
  it('cria a quantidade pedida de pétalas na origem, decorativas, a partir das variações prontas', () => {
    soltarPetalas({
      ...base,
      conteiner,
      imagens: [imagemPronta(true), imagemPronta(true), imagemPronta(true)],
      quantidade: 5,
    });

    const petalas = conteiner.querySelectorAll<HTMLElement>('.petala');
    expect(petalas).toHaveLength(5);
    for (const petala of petalas) {
      expect(petala.getAttribute('aria-hidden')).toBe('true');
      expect(petala.style.left).toBe('50%');
      expect(petala.style.top).toBe('30%');
      expect(petala.style.width).toBe('12%');
    }
  });

  it('as pétalas sobem e se removem sozinhas no fim', async () => {
    const linha = soltarPetalas({
      ...base,
      conteiner,
      imagens: [imagemPronta(true)],
      quantidade: 4,
    });

    await linha.then();

    expect(conteiner.querySelectorAll('.petala')).toHaveLength(0);
  });

  it('só usa as variações que terminaram de carregar', () => {
    soltarPetalas({
      ...base,
      conteiner,
      imagens: [imagemPronta(false), imagemPronta(true)],
      quantidade: 4,
    });

    expect(conteiner.querySelectorAll('.petala')).toHaveLength(4);
  });

  it('se nenhuma carregou, segue sem pétalas e devolve uma linha do tempo vazia', () => {
    const linha = soltarPetalas({
      ...base,
      conteiner,
      imagens: [imagemPronta(false), imagemPronta(false)],
      quantidade: 5,
    });

    expect(conteiner.querySelectorAll('.petala')).toHaveLength(0);
    expect(linha.duration()).toBe(0);
    expect(gsap.getTweensOf('.petala')).toHaveLength(0);
  });
});
