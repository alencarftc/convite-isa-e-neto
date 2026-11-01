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

/** O baú ocupa de 120 a 270 px numa tela de 390 px (CT-21.1). */
const BAU = { esquerda: 120, direita: 270 };

function tela(largura: number, altura: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: largura });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: altura });
}

function montar(opcoes: { largura?: number; bau?: typeof BAU; semente?: number } = {}) {
  tela(opcoes.largura ?? 390, 844);
  document.body.innerHTML = '';
  const raiz = document.createElement('div');
  const chao = document.createElement('div');
  chao.className = 'vida vida--chao';
  const bau = document.createElement('div');
  bau.className = 'bau';
  const caixa = opcoes.bau ?? BAU;
  vi.spyOn(bau, 'getBoundingClientRect').mockReturnValue({
    left: caixa.esquerda,
    right: caixa.direita,
    width: caixa.direita - caixa.esquerda,
    top: 500,
    bottom: 640,
    height: 140,
    x: caixa.esquerda,
    y: 500,
    toJSON: () => ({}),
  });
  raiz.append(bau, chao);
  document.body.append(raiz);
  const { estado } = criarEstadoFalso();
  const esquilo = criarEsquilo({
    raiz,
    config,
    estado,
    aleatorio: congruente(opcoes.semente ?? 7),
  });
  return { esquilo, raiz, chao, estado };
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
    expect(trocas).toBeGreaterThanOrEqual(6); // pelo menos três pulos, cada um com impulso e pouso
    expect(bicho.isConnected).toBe(false);
    // Em nenhum instante as duas imagens ficam visíveis juntas.
    expect(
      Number(gsap.getProperty(esticado, 'opacity')) +
        Number(gsap.getProperty(encolhido, 'opacity')),
    ).toBeLessThanOrEqual(1);
  });

  it('a visita seguinte vem de 20 a 35 s depois do fim da anterior; nunca dois esquilos juntos (CT-21.3)', () => {
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
      expect(atual.visto - anterior.saiu).toBeGreaterThanOrEqual(19.9);
      expect(atual.visto - anterior.saiu).toBeLessThanOrEqual(35.3);
    }
  });

  it('em nenhum quadro da visita a caixa do esquilo cruza a do baú, nem a folga de 10% antes dele (CT-21.5, CA-13.4.2)', () => {
    const { esquilo, chao } = montar();
    esquilo.iniciar('completo');
    let amostras = 0;
    const larguraDoEsquilo = config.vida.esquilo.largura.vertical * 390;
    const folga = config.vida.esquilo.folgaDoBau * 390;

    correr(200, () => {
      const bicho = chao.querySelector<HTMLElement>('.esquilo');
      if (!bicho) return;
      amostras += 1;
      const esquerda = Number(gsap.getProperty(bicho, 'x'));
      const direita = esquerda + larguraDoEsquilo;
      const cruza = direita > BAU.esquerda - folga + 1e-6 && esquerda < BAU.direita + folga - 1e-6;
      expect(cruza, `x ${String(esquerda)} a ${String(direita)}`).toBe(false);
    });

    expect(amostras).toBeGreaterThan(100); // houve visitas de verdade
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

  it('quando o envelope pousa (fase carta) a visita em curso termina e nenhuma outra começa (CT-21.4, CA-13.4.3)', () => {
    const { esquilo, chao, estado } = montar();
    esquilo.iniciar('completo');
    correr(6.5);
    const bicho = chao.querySelector('.esquilo');
    expect(bicho).not.toBeNull();

    estado.definirFase('carta');
    const vistos = new Set<Element>();
    correr(120, () => {
      for (const outro of chao.querySelectorAll('.esquilo')) vistos.add(outro);
    });

    expect(bicho?.isConnected).toBe(false); // terminou normalmente
    expect([...vistos].filter((outro) => outro !== bicho)).toHaveLength(0);
  });

  it('numa tela estreita, sem espaço para dois pulos, a visita é cancelada e a vida segue sem erro (RF-21.2)', () => {
    const { esquilo, chao } = montar({ largura: 320, bau: { esquerda: 50, direita: 270 } });

    expect(() => {
      esquilo.iniciar('completo');
      correr(120);
    }).not.toThrow();

    expect(chao.querySelector('.esquilo')).toBeNull();
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

  it('o esquilo vive no espaço do chão e é decorativo: alt vazio, aria-hidden, sem foco (RF-21.1, RF-21.7)', () => {
    const { esquilo, chao } = montar();
    esquilo.iniciar('completo');
    correr(7);

    const bicho = chao.querySelector('.esquilo');

    expect(bicho?.parentElement).toBe(chao);
    expect(bicho?.querySelectorAll('img[alt=""]')).toHaveLength(2);
    expect(bicho?.querySelector('button, a, [tabindex]')).toBeNull();
  });

  it('o chão e a largura vêm da configuração, por orientação', () => {
    const { esquilo, chao } = montar();
    esquilo.iniciar('completo');
    correr(7);

    const bicho = chao.querySelector<HTMLElement>('.esquilo');

    expect(parseFloat(bicho?.style.width ?? '0')).toBeCloseTo(0.07 * 390);
    expect(parseFloat(bicho?.style.bottom ?? '0')).toBeCloseTo(
      config.vida.esquilo.chao.vertical * 844,
    );
  });
});
