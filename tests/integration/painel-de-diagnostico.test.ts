import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  criarPainelDeDiagnostico,
  GRUPOS_DO_PAINEL,
} from '@/infrastructure/desenvolvimento/painel-de-diagnostico';

function botoes(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>('[data-painel="caixa"] button')];
}

function botaoDe(texto: string): HTMLButtonElement {
  const achado = botoes().find((botao) => botao.textContent.includes(texto));
  if (!achado) throw new Error(`botão "${texto}" não existe`);
  return achado;
}

const folha = () => document.querySelector('style[data-painel="diagnostico"]')?.textContent ?? '';

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('painel de diagnóstico do piscar (só em desenvolvimento, só com ?painel)', () => {
  const congelarJs = vi.fn();
  const pararRelogio = vi.fn();

  it('em produção não cria nada, mesmo com ?painel', () => {
    const painel = criarPainelDeDiagnostico({
      desenvolvimento: false,
      busca: '?painel',
      documento: document,
      congelarJs,
      pararRelogio,
    });

    expect(painel).toBeNull();
    expect(document.body.children).toHaveLength(0);
    expect(document.head.children).toHaveLength(0);
  });

  it('em desenvolvimento, sem ?painel, também não cria nada', () => {
    const painel = criarPainelDeDiagnostico({
      desenvolvimento: true,
      busca: '?sem=css',
      documento: document,
      congelarJs,
      pararRelogio,
    });

    expect(painel).toBeNull();
    expect(document.body.children).toHaveLength(0);
  });

  it('com ?painel mostra um botão pequeno que abre a lista de peças', () => {
    criarPainelDeDiagnostico({
      desenvolvimento: true,
      busca: '?painel',
      documento: document,
      congelarJs,
      pararRelogio,
    });

    const lista = document.querySelector<HTMLElement>('[data-painel="caixa"] > div');
    expect(lista?.hidden).toBe(true);

    botaoDe('D').click();

    expect(lista?.hidden).toBe(false);
    for (const grupo of GRUPOS_DO_PAINEL) {
      for (const peca of grupo.pecas) expect(botaoDe(peca.rotulo)).toBeTruthy();
    }
  });

  it('cada botão esconde a peça na hora e outro toque a devolve', () => {
    const painel = criarPainelDeDiagnostico({
      desenvolvimento: true,
      busca: '?painel',
      documento: document,
      congelarJs,
      pararRelogio,
    });

    botaoDe('cena inteira').click();
    botaoDe('pétalas').click();

    expect(painel?.escondidas()).toEqual(['cena inteira', 'pétalas']);
    expect(folha()).toContain('.cena { visibility: hidden !important; }');
    expect(folha()).toContain('.petalas-do-convite');

    botaoDe('cena inteira').click();

    expect(painel?.escondidas()).toEqual(['pétalas']);
    expect(folha()).not.toContain('.cena {');
  });

  it('congelar o GSAP liga e desliga o congelamento, e o botão mostra o estado', () => {
    criarPainelDeDiagnostico({
      desenvolvimento: true,
      busca: '?painel',
      documento: document,
      congelarJs,
      pararRelogio,
    });

    botaoDe('congelar GSAP').click();
    expect(congelarJs).toHaveBeenLastCalledWith(true);
    expect(botaoDe('GSAP congelado')).toBeTruthy();

    botaoDe('GSAP congelado').click();
    expect(congelarJs).toHaveBeenLastCalledWith(false);
  });

  it('parar o relógio põe o ticker do GSAP para dormir e o devolve no segundo toque', () => {
    criarPainelDeDiagnostico({
      desenvolvimento: true,
      busca: '?painel',
      documento: document,
      congelarJs,
      pararRelogio,
    });

    botaoDe('parar relógio').click();
    expect(pararRelogio).toHaveBeenLastCalledWith(true);

    botaoDe('relógio parado').click();
    expect(pararRelogio).toHaveBeenLastCalledWith(false);
  });

  it('as peças de will-change LIGAM uma camada, em vez de esconder', () => {
    criarPainelDeDiagnostico({
      desenvolvimento: true,
      busca: '?painel',
      documento: document,
      congelarJs,
      pararRelogio,
    });

    botaoDe('wc: envelope e selo').click();

    expect(folha()).toContain('.envelope, .selo { will-change: transform, opacity !important; }');
  });

  it('remover tira o painel e a folha de estilo', () => {
    const painel = criarPainelDeDiagnostico({
      desenvolvimento: true,
      busca: '?painel',
      documento: document,
      congelarJs,
      pararRelogio,
    });
    botaoDe('envelope').click();

    painel?.remover();

    expect(document.querySelector('[data-painel]')).toBeNull();
    expect(painel?.escondidas()).toEqual([]);
  });
});
