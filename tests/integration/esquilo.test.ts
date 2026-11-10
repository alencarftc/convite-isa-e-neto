import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/config/config';
import type { Aleatorio } from '@/domain/vida/sorteio';
import { criarEsquilo } from '@/presentation/vida/esquilo';

import { criarEstadoFalso } from './suporte/estado-falso';
import { fingirImagens } from './suporte/imagens-falsas';
import { criarRelogioManual } from './suporte/relogio-gsap';

function congruente(semente: number): Aleatorio {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

let relogio: ReturnType<typeof criarRelogioManual>;
let desfazerImagens: () => void;

function tela(largura: number, altura: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: largura });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: altura });
}

function montar(
  opcoes: {
    largura?: number;
    semente?: number;
    orientacao?: 'vertical' | 'horizontal';
    toque?: boolean;
  } = {},
) {
  tela(opcoes.largura ?? 390, 844);
  document.body.innerHTML = '';
  const raiz = document.createElement('div');
  // Na vertical o esquilo vive atrás do baú (vida--fundo); na horizontal, no chão (vida--chao).
  const fundo = document.createElement('div');
  fundo.className = 'vida vida--fundo';
  const chao = document.createElement('div');
  chao.className = 'vida vida--chao';
  raiz.append(fundo, chao);
  document.body.append(raiz);
  const { estado } = criarEstadoFalso({
    orientacao: opcoes.orientacao ?? 'horizontal',
    ...(opcoes.toque === undefined ? {} : { toque: opcoes.toque }),
  });
  const esquilo = criarEsquilo({
    raiz,
    config,
    estado,
    aleatorio: congruente(opcoes.semente ?? 7),
  });
  return { esquilo, raiz, chao, fundo, estado };
}

/** Avança em passos de 50 ms chamando `observar` a cada passo. */
function correr(segundos: number, observar: () => void = () => undefined): void {
  for (let t = 0; t < segundos; t += 0.05) {
    relogio.avancar(0.05, 0.05);
    observar();
  }
}

beforeEach(() => {
  desfazerImagens = fingirImagens(true);
  relogio = criarRelogioManual();
});
afterEach(() => {
  relogio.restaurar();
  desfazerImagens();
  vi.restoreAllMocks();
});

// Simular centenas de segundos de vida passo a passo leva alguns segundos com a máquina ocupada.
describe('esquilo (SPEC-21)', { timeout: 30_000 }, () => {
  it('a primeira visita começa aos 6 s: entra, troca de imagem a cada pulo, para e sai do DOM no fim (CT-21.3, CA-13.4.1)', () => {
    const { esquilo, chao } = montar();
    esquilo.iniciar('completo');

    correr(5.9);
    expect(chao.querySelector('.esquilo')).toBeNull();

    correr(0.3);
    const bicho = chao.querySelector<HTMLElement>('.esquilo');
    expect(bicho).not.toBeNull();
    expect(bicho?.getAttribute('aria-hidden')).toBe('true');
    const esticado = bicho?.querySelector('.esquilo__pose--esticado');
    const encolhido = bicho?.querySelector('.esquilo__pose--encolhido');
    if (!bicho || !esticado || !encolhido) throw new Error('faltam as duas poses');

    // A cada pulo as duas imagens se alternam: o esticado acende e apaga várias vezes.
    let trocas = 0;
    let anterior = Number(gsap.getProperty(esticado, 'opacity'));
    correr(20, () => {
      const agora = Number(gsap.getProperty(esticado, 'opacity'));
      if (agora !== anterior) trocas += 1;
      anterior = agora;
    });
    expect(trocas).toBeGreaterThanOrEqual(4); // pelo menos dois pulos, cada um com impulso e pouso
    expect(bicho.isConnected).toBe(false);
    // Em nenhum instante as duas imagens ficam visíveis juntas.
    expect(
      Number(gsap.getProperty(esticado, 'opacity')) +
        Number(gsap.getProperty(encolhido, 'opacity')),
    ).toBeLessThanOrEqual(1);
  });

  it('a visita seguinte vem do intervalo da configuração depois do fim da anterior; nunca dois esquilos juntos (CT-21.3)', () => {
    const { esquilo, chao } = montar();
    esquilo.iniciar('completo');
    const vistos: { visto: number; saiu?: number }[] = [];
    const registrados = new Map<Element, { visto: number; saiu?: number }>();
    let agora = 0;
    let simultaneos = 0;

    correr(120, () => {
      agora += 0.05;
      const noAr = chao.querySelectorAll('.esquilo');
      simultaneos = Math.max(simultaneos, noAr.length);
      for (const bicho of noAr) {
        if (!registrados.has(bicho)) {
          const registro = { visto: agora };
          registrados.set(bicho, registro);
          vistos.push(registro);
        }
      }
      for (const [bicho, registro] of registrados) {
        if (!bicho.isConnected && registro.saiu === undefined) registro.saiu = agora;
      }
    });

    expect(simultaneos).toBe(1);
    expect(vistos.length).toBeGreaterThanOrEqual(3);
    expect(vistos[0]?.visto).toBeGreaterThan(5.9);
    expect(vistos[0]?.visto).toBeLessThan(6.5);
    for (let i = 1; i < vistos.length; i += 1) {
      const anterior = vistos[i - 1];
      const atual = vistos[i];
      if (anterior?.saiu === undefined || !atual) continue;
      expect(atual.visto - anterior.saiu).toBeGreaterThanOrEqual(
        config.vida.esquilo.intervalo[0] - 0.1,
      );
      expect(atual.visto - anterior.saiu).toBeLessThanOrEqual(
        config.vida.esquilo.intervalo[1] + 0.3,
      );
    }
  });

  it('ele chega ao centro da tela, passando por trás do baú, e entra e sai de fora da tela (01/11/2026)', () => {
    const { esquilo, chao } = montar();
    esquilo.iniciar('completo');
    const larguraDoEsquilo = config.vida.esquilo.largura.horizontal * 390;
    let noCentro = 0;
    let amostras = 0;
    let menor = Number.POSITIVE_INFINITY;
    let maior = Number.NEGATIVE_INFINITY;

    correr(300, () => {
      const bicho = chao.querySelector<HTMLElement>('.esquilo');
      if (!bicho) return;
      amostras += 1;
      const centro = Number(gsap.getProperty(bicho, 'x')) + larguraDoEsquilo / 2;
      menor = Math.min(menor, centro);
      maior = Math.max(maior, centro);
      if (centro > 0.3 * 390 && centro < 0.7 * 390) noCentro += 1;
    });

    expect(amostras).toBeGreaterThan(100); // houve visitas de verdade
    expect(noCentro).toBeGreaterThan(amostras / 5); // passa boa parte do tempo ao centro
    expect(menor).toBeLessThan(0); // entra de fora da tela
    expect(maior).toBeGreaterThan(390); // e sai para fora dela
  });

  it('as duas imagens ficam viradas para a direita no arquivo: o esquilo que entra pela direita é espelhado (RF-21.4)', () => {
    const { esquilo, chao } = montar({ semente: 3 });
    esquilo.iniciar('completo');
    const lados = new Set<number>();

    correr(300, () => {
      const bicho = chao.querySelector<HTMLElement>('.esquilo');
      if (bicho) lados.add(Math.sign(Number(gsap.getProperty(bicho, 'scaleX'))));
    });

    expect(lados).toEqual(new Set([-1, 1]));
  });

  it('continua aparecendo depois que o convite é exibido, em todas as fases (01/11/2026)', () => {
    for (const fase of ['carta', 'aguardando-selo', 'convite', 'informacoes'] as const) {
      const { esquilo, chao, estado } = montar({ semente: 11 });
      estado.definirFase(fase);
      esquilo.iniciar('completo');
      const vistos = new Set<Element>();

      correr(120, () => {
        for (const bicho of chao.querySelectorAll('.esquilo')) vistos.add(bicho);
      });

      expect(vistos.size, fase).toBeGreaterThanOrEqual(3);
      esquilo.parar();
    }
  });

  it('as visitas são diferentes entre si: muda o tempo que cada uma leva no ar', () => {
    const { esquilo, chao } = montar({ semente: 5 });
    esquilo.iniciar('completo');
    const duracoes: number[] = [];
    let entrou: number | undefined;
    let agora = 0;

    correr(300, () => {
      agora += 0.05;
      const presente = chao.querySelector('.esquilo') !== null;
      if (presente && entrou === undefined) entrou = agora;
      if (!presente && entrou !== undefined) {
        duracoes.push(Math.round((agora - entrou) * 10) / 10);
        entrou = undefined;
      }
    });

    expect(duracoes.length).toBeGreaterThanOrEqual(6);
    expect(new Set(duracoes).size).toBeGreaterThan(duracoes.length / 2);
  });

  it('sem as duas imagens prontas a visita da vez é pulada; quando chegam, elas começam (RF-21.5, RF-18.7)', () => {
    desfazerImagens();
    desfazerImagens = fingirImagens(false);
    const { esquilo, chao } = montar();
    esquilo.iniciar('completo');
    correr(60);
    expect(chao.querySelector('.esquilo')).toBeNull();

    desfazerImagens();
    desfazerImagens = fingirImagens(true);
    let apareceu = false;
    correr(80, () => {
      if (chao.querySelector('.esquilo')) apareceu = true;
    });

    expect(apareceu).toBe(true);
  });

  it('pausar congela o esquilo no meio do pulo e retomar o leva até o fim (RF-21.6)', () => {
    const { esquilo, chao } = montar();
    esquilo.iniciar('completo');
    correr(7);
    const bicho = chao.querySelector<HTMLElement>('.esquilo');
    if (!bicho) throw new Error('nenhuma visita em curso');

    esquilo.pausar();
    const parado = Number(gsap.getProperty(bicho, 'x'));
    correr(10);
    expect(Number(gsap.getProperty(bicho, 'x'))).toBe(parado);
    expect(bicho.isConnected).toBe(true);

    esquilo.retomar();
    correr(25);

    expect(bicho.isConnected).toBe(false);
  });

  it('parar tira o esquilo do DOM e nenhuma visita nasce depois (RF-21.6)', () => {
    const { esquilo, chao } = montar();
    esquilo.iniciar('completo');
    correr(7);
    expect(chao.querySelector('.esquilo')).not.toBeNull();

    esquilo.parar();
    correr(120);

    expect(chao.querySelector('.esquilo')).toBeNull();
  });

  it('o esquilo vive no espaço do chão (horizontal) ou do fundo, atrás do baú (vertical), e é decorativo: alt vazio, aria-hidden, sem foco (RF-21.1, RF-21.7)', () => {
    const horizontal = montar();
    horizontal.esquilo.iniciar('completo');
    correr(7);
    const bicho = horizontal.chao.querySelector('.esquilo');
    const vertical = montar({ orientacao: 'vertical' });
    vertical.esquilo.iniciar('completo');
    correr(7);
    const atras = vertical.fundo.querySelector('.esquilo');

    expect(bicho?.parentElement?.className).toBe('esquilo__passagem'); // a faixa que esmaece as laterais
    expect(bicho?.closest('.vida--chao')).toBe(horizontal.chao);
    expect(atras?.closest('.vida--fundo')).toBe(vertical.fundo);
    expect(vertical.chao.querySelector('.esquilo')).toBeNull();
    expect(bicho?.querySelectorAll('img[alt=""]')).toHaveLength(2);
    expect(bicho?.querySelector('button, a, [tabindex]')).toBeNull();
  });

  it('no computador (mouse, tela horizontal) o esquilo vive atrás do baú, como na vertical, e não no chão (09/11/2026)', () => {
    const computador = montar({ orientacao: 'horizontal', toque: false });
    computador.esquilo.iniciar('completo');
    correr(7);
    const celularDeitado = montar({ orientacao: 'horizontal', toque: true });
    celularDeitado.esquilo.iniciar('completo');
    correr(7);

    expect(computador.fundo.querySelector('.esquilo')).not.toBeNull();
    expect(computador.chao.querySelector('.esquilo')).toBeNull();
    // O celular deitado e o tablet seguem no espaço do chão.
    expect(celularDeitado.chao.querySelector('.esquilo')).not.toBeNull();
    expect(celularDeitado.fundo.querySelector('.esquilo')).toBeNull();
  });

  it('no computador as patas ficam a uma fração da altura da PINTURA (em CSS), e no toque em pixels da tela (09/11/2026)', () => {
    const computador = montar({ orientacao: 'horizontal', toque: false });
    computador.esquilo.iniciar('completo');
    correr(7);
    const toque = montar({ orientacao: 'horizontal', toque: true });
    toque.esquilo.iniciar('completo');
    correr(7);

    const patasDoComputador = computador.fundo.querySelector<HTMLElement>('.esquilo')?.style.bottom;
    const patasDoToque = toque.chao.querySelector<HTMLElement>('.esquilo')?.style.bottom;
    expect(patasDoComputador).toBe(
      `calc(var(--altura-da-cena) * ${String(config.vida.esquilo.chao.computador)} - var(--sobra-da-cena))`,
    );
    expect(patasDoToque?.endsWith('px')).toBe(true);
  });

  it('o chão e a largura vêm da configuração, por orientação', () => {
    const { esquilo, chao } = montar();
    esquilo.iniciar('completo');
    correr(7);

    const bicho = chao.querySelector<HTMLElement>('.esquilo');

    expect(parseFloat(bicho?.style.width ?? '0')).toBeCloseTo(
      config.vida.esquilo.largura.horizontal * 390,
    );
    expect(parseFloat(bicho?.style.bottom ?? '0')).toBeCloseTo(
      config.vida.esquilo.chao.horizontal * 844,
    );
  });
});
