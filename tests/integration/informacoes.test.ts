import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarObterInformacoes } from '@/application/use-cases/obter-informacoes';
import { config } from '@/config/config';
import { content } from '@/config/content';
import { criarRelogio } from '@/infrastructure/relogio/relogio';
import { montarInformacoes } from '@/presentation/informacoes/informacoes';

/** Camadas reais (config, caso de uso, relógio, DOM), com a data simulada por `?data=`. */
function montarEm(dataSimulada: string) {
  const raiz = document.createElement('div');
  document.body.append(raiz);
  const relogio = criarRelogio({ desenvolvimento: true, busca: `?data=${dataSimulada}` });
  const montadas = montarInformacoes({
    raiz,
    conteudo: content,
    config,
    relogio,
    obterInformacoes: criarObterInformacoes({ relogio, config, conteudo: content }),
  });
  return { raiz, montadas };
}

const visivel = (raiz: HTMLElement, seletor: string): boolean => {
  const elemento = raiz.querySelector<HTMLElement>(seletor);
  if (!elemento) throw new Error(`Elemento não encontrado: ${seletor}`);
  return !elemento.hidden;
};

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('bloco de informações (SPEC-07)', () => {
  it('antes do prazo: mostra a contagem, o botão de confirmar e o aviso do prazo', () => {
    const { raiz } = montarEm('2026-11-15T10:00');

    expect(raiz.querySelector('.cartao--contagem')?.textContent).toBe(
      'Faltam 68 dias, 7 horas e 0 minutos para o nosso sim',
    );
    expect(visivel(raiz, '.botao--principal')).toBe(true);
    expect(visivel(raiz, '.acoes__prazo')).toBe(true);
    expect(visivel(raiz, '.acoes__encerrado')).toBe(false);
    expect(visivel(raiz, '.botao--secundario')).toBe(true);
  });

  it('os botões abrem o formulário e o mapa em outra aba, sem expor window.opener', () => {
    const { raiz } = montarEm('2026-11-15T10:00');

    const confirmar = raiz.querySelector<HTMLAnchorElement>('.botao--principal');
    const comoChegar = raiz.querySelector<HTMLAnchorElement>('.botao--secundario');

    expect(confirmar?.href).toBe(config.links.formulario);
    expect(comoChegar?.href).toBe(config.links.mapa);
    for (const link of [confirmar, comoChegar]) {
      expect(link?.target).toBe('_blank');
      expect(link?.rel).toBe('noopener');
    }
  });

  it('a contagem não é anunciada a cada minuto ao leitor de tela', () => {
    const { raiz } = montarEm('2026-11-15T10:00');
    expect(raiz.querySelector('.cartao--contagem p')?.getAttribute('aria-live')).toBe('off');
  });

  it('depois do prazo: troca o botão pelo aviso de encerramento', () => {
    const { raiz } = montarEm('2027-01-01T00:00');

    expect(visivel(raiz, '.botao--principal')).toBe(false);
    expect(visivel(raiz, '.acoes__prazo')).toBe(false);
    expect(raiz.querySelector('.acoes__encerrado')?.textContent).toBe(
      'As confirmações foram encerradas em 31 de dezembro de 2026.',
    );
    expect(visivel(raiz, '.acoes__encerrado')).toBe(true);
  });

  it('no dia: "É hoje!" no lugar da contagem', () => {
    const { raiz } = montarEm('2027-01-22T20:00');
    expect(raiz.querySelector('.cartao--contagem')?.textContent).toBe('É hoje! Nos vemos às 17h.');
  });

  it('depois do casamento: só o agradecimento, sem contagem nem ações', () => {
    const { raiz } = montarEm('2027-01-23T00:00');

    expect(visivel(raiz, '.cartao--contagem')).toBe(false);
    expect(raiz.querySelector('.cartao--agradecimento')?.textContent).toBe(
      'Obrigado por fazer parte da nossa história. Com amor, Isabella & David',
    );
    expect(visivel(raiz, '.cartao--agradecimento')).toBe(true);
    expect(visivel(raiz, '.cartao--acoes')).toBe(false);
  });

  it('destruir remove o bloco do DOM', () => {
    const { raiz, montadas } = montarEm('2026-11-15T10:00');

    montadas.destruir();

    expect(raiz.querySelector('.informacoes')).toBeNull();
  });
});

describe('atualização do bloco (SPEC-07, RF-07.3)', () => {
  function montarComRelogioMutavel(inicio: string) {
    let agora = Date.parse(inicio);
    const relogio = { agora: () => agora };
    const raiz = document.createElement('div');
    document.body.append(raiz);
    montarInformacoes({
      raiz,
      conteudo: content,
      config,
      relogio,
      obterInformacoes: criarObterInformacoes({ relogio, config, conteudo: content }),
    });
    return {
      raiz,
      avancarPara(iso: string) {
        agora = Date.parse(iso);
      },
    };
  }

  it('recalcula na virada de cada minuto, sem recarregar', () => {
    vi.useFakeTimers();
    const { raiz, avancarPara } = montarComRelogioMutavel('2026-11-15T10:00:00-03:00');
    expect(raiz.querySelector('.cartao--contagem')?.textContent).toContain(
      '68 dias, 7 horas e 0 minutos',
    );

    avancarPara('2026-11-15T10:01:00-03:00');
    vi.advanceTimersByTime(60_000);

    expect(raiz.querySelector('.cartao--contagem')?.textContent).toContain(
      '68 dias, 6 horas e 59 minutos',
    );
  });

  it('troca o botão pelo aviso quando o prazo vira com o convite aberto', () => {
    vi.useFakeTimers();
    const { raiz, avancarPara } = montarComRelogioMutavel('2026-12-31T23:59:30-03:00');
    expect(visivel(raiz, '.botao--principal')).toBe(true);

    avancarPara('2027-01-01T00:00:00-03:00');
    vi.advanceTimersByTime(30_000);

    expect(visivel(raiz, '.botao--principal')).toBe(false);
    expect(visivel(raiz, '.acoes__encerrado')).toBe(true);
  });

  it('recalcula quando o convidado volta ao aplicativo', () => {
    const { raiz, avancarPara } = montarComRelogioMutavel('2026-12-31T23:59:00-03:00');
    expect(visivel(raiz, '.botao--principal')).toBe(true);

    avancarPara('2027-01-05T09:00:00-03:00');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(visivel(raiz, '.botao--principal')).toBe(false);
  });
});
