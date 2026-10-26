import { beforeEach, describe, expect, it } from 'vitest';

import { criarObterInformacoes } from '@/application/use-cases/obter-informacoes';
import { config } from '@/config/config';
import { content } from '@/config/content';
import { criarRelogio } from '@/infrastructure/relogio/relogio';
import { criarFotoEmCirculo } from '@/presentation/historia/foto-em-circulo';
import { montarHistoriaEstatica } from '@/presentation/informacoes/cartoes-da-historia';
import { criarCenaInformacoes } from '@/presentation/informacoes/cena-informacoes';

beforeEach(() => {
  document.body.innerHTML = '';
});

function montar() {
  const raiz = document.createElement('div');
  document.body.append(raiz);
  const montada = montarHistoriaEstatica({ raiz, conteudo: content });
  return { raiz, montada };
}

/** A cena final como o main.ts a monta: dentro de um `.conteudo` que já tem a carta. */
function montarCenaFinal() {
  const raiz = document.createElement('div');
  const conteudo = document.createElement('div');
  conteudo.className = 'conteudo';
  const carta = document.createElement('article');
  carta.className = 'carta';
  conteudo.append(carta);
  raiz.append(conteudo);
  document.body.append(raiz);
  const relogio = criarRelogio({ desenvolvimento: true, busca: '?data=2026-11-15T10:00' });
  const cena = criarCenaInformacoes(
    {
      raiz,
      conteudo: content,
      config,
      relogio,
      obterInformacoes: criarObterInformacoes({ relogio, config, conteudo: content }),
    },
    () => conteudo,
  );
  const filhos = () => [...conteudo.children].map((filho) => filho.className);
  return { cena, conteudo, filhos };
}

describe('história estática (SPEC-13)', () => {
  it('um cartão por balão, na ordem de content.baloes, com a frase e a foto (CT-13.1, RF-13.1)', () => {
    const { raiz } = montar();

    const cartoes = [...raiz.querySelectorAll('.historia-estatica__cartao')];
    expect(cartoes).toHaveLength(content.baloes.length);
    cartoes.forEach((cartao, indice) => {
      const balao = content.baloes[indice];
      expect(cartao.querySelector('.historia-estatica__frase')?.textContent).toBe(balao?.frase);
      const foto = cartao.querySelector<HTMLImageElement>('.historia-estatica__foto img');
      expect(foto?.getAttribute('alt')).toBe(balao?.alt);
      expect(foto?.getAttribute('src')).toBe(balao?.foto);
      expect(foto?.style.objectPosition).toBe(balao?.foco);
    });
  });

  it('os cartões são os mesmos da cena de informações: classe cartao, sem título visível novo (RF-13.7)', () => {
    const { raiz } = montar();

    expect(raiz.querySelectorAll('.cartao.historia-estatica__cartao')).toHaveLength(5);
    expect(raiz.querySelector('h1, h2, h3, h4')).toBeNull();
  });

  it('é uma região nomeada, e cada cartão é uma figura: o leitor lê a foto e depois a frase (CT-13.7)', () => {
    const { raiz } = montar();

    const regiao = raiz.querySelector('section.historia-estatica');
    expect(regiao?.getAttribute('aria-label')).toBe(content.rotulos.historia);
    const primeiro = regiao?.querySelector('figure');
    expect([...(primeiro?.children ?? [])].map((filho) => filho.tagName)).toEqual([
      'SPAN',
      'FIGCAPTION',
    ]);
  });

  it('as fotos abaixo da dobra carregam sob demanda e decodificam sem travar (RF-13.5)', () => {
    const { raiz } = montar();

    for (const foto of raiz.querySelectorAll<HTMLImageElement>('.historia-estatica__foto img')) {
      expect(foto.loading).toBe('lazy');
      expect(foto.decoding).toBe('async');
    }
  });

  it('as fotos dos balões continuam sem carregamento tardio: já foram pré-carregadas (RF-13.5)', () => {
    const balao = content.baloes[0]!;

    const imagem = criarFotoEmCirculo(balao, { classe: 'balao__foto' })?.querySelector('img');

    expect(imagem?.getAttribute('loading')).toBeNull();
    expect(imagem?.getAttribute('decoding')).toBeNull();
  });

  it('foto com erro: o cartão perde o círculo e fica só com a frase, sem espaço vazio (CT-13.4, RF-13.3)', () => {
    const { raiz } = montar();
    const primeiro = raiz.querySelector('.historia-estatica__cartao');

    primeiro?.querySelector('img')?.dispatchEvent(new Event('error'));

    expect(primeiro?.querySelector('.historia-estatica__foto')).toBeNull();
    expect([...(primeiro?.children ?? [])].map((filho) => filho.tagName)).toEqual(['FIGCAPTION']);
    // os outros cartões não são afetados
    expect(raiz.querySelectorAll('.historia-estatica__foto')).toHaveLength(4);
  });

  it('sem foto no conteúdo, o cartão nasce só com a frase', () => {
    expect(criarFotoEmCirculo({ ...content.baloes[0]!, foto: '' }, { classe: 'x' })).toBeNull();
  });

  it('as fotos têm o mesmo tratamento fixo dos balões: a classe foto-em-circulo (RF-13.4)', () => {
    const { raiz } = montar();

    for (const quadro of raiz.querySelectorAll('.historia-estatica__foto')) {
      expect(quadro.classList.contains('foto-em-circulo')).toBe(true);
    }
  });

  it('destruir remove a seção', () => {
    const { raiz, montada } = montar();

    montada.destruir();

    expect(raiz.querySelector('.historia-estatica')).toBeNull();
  });
});

describe('cena final e a história estática (SPEC-13, RF-13.2)', () => {
  it('skip(): a história entra entre a carta e as informações (CT-13.1, CT-13.2)', () => {
    const { cena, filhos } = montarCenaFinal();

    cena.skip();

    expect(filhos()).toEqual(['carta', 'historia-estatica', 'informacoes']);
  });

  it('run(), o caminho completo: a história não é repetida (CT-13.3)', async () => {
    const { cena, filhos } = montarCenaFinal();

    await cena.run();

    expect(filhos()).toEqual(['carta', 'informacoes']);
  });

  it('skip() duas vezes (o orquestrador tenta o final de novo) não duplica nada', () => {
    const { cena, conteudo } = montarCenaFinal();

    cena.skip();
    cena.skip();

    expect(conteudo.querySelectorAll('.historia-estatica')).toHaveLength(1);
    expect(conteudo.querySelectorAll('.informacoes')).toHaveLength(1);
  });

  it('destruir remove a história e as informações', () => {
    const { cena, filhos } = montarCenaFinal();
    cena.skip();

    cena.destroy();

    expect(filhos()).toEqual(['carta']);
  });
});
