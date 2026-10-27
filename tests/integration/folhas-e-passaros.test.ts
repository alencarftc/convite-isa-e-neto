import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { config as configReal } from '@/config/config';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { Aleatorio } from '@/domain/vida/sorteio';
import { criarFolhas } from '@/presentation/vida/folhas';
import { criarPassaros } from '@/presentation/vida/passaros';

import { criarEstadoFalso } from './suporte/estado-falso';
import { fingirImagens } from './suporte/imagens-falsas';
import { criarRelogioManual } from './suporte/relogio-gsap';

/** Gerador determinístico, para o teste repetir sempre os mesmos sorteios. */
function congruente(semente: number): Aleatorio {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
}

let relogio: ReturnType<typeof criarRelogioManual>;
let desfazerImagens: () => void;

function montar(
  opcoes: { config?: ConfigConvite; semente?: number; orientacao?: 'vertical' | 'horizontal' } = {},
) {
  document.body.innerHTML = '';
  const raiz = document.createElement('div');
  const espacos = Object.fromEntries(
    ['ceu', 'fundo', 'chao'].map((nome) => {
      const espaco = document.createElement('div');
      espaco.className = `vida vida--${nome}`;
      raiz.append(espaco);
      return [nome, espaco];
    }),
  ) as unknown as Record<'ceu' | 'fundo' | 'chao', HTMLElement>;
  document.body.append(raiz);
  const { estado } = criarEstadoFalso({ orientacao: opcoes.orientacao ?? 'vertical' });
  const configuracao = opcoes.config ?? configReal;
  const aleatorio = congruente(opcoes.semente ?? 42);
  return {
    raiz,
    espacos,
    estado,
    config: configuracao,
    folhas: criarFolhas({ raiz, config: configuracao, estado, aleatorio }),
    passaros: criarPassaros({ raiz, config: configuracao, aleatorio }),
  };
}

/** Avança o relógio em passos de 50 ms, chamando `observar` a cada passo. */
function correr(segundos: number, observar: () => void = () => undefined): void {
  for (let t = 0; t < segundos; t += 0.05) {
    relogio.avancar(0.05, 0.05);
    observar();
  }
}

function comIntervalo(intervalo: readonly [number, number]): ConfigConvite {
  return {
    ...configReal,
    vida: { ...configReal.vida, folhas: { ...configReal.vida.folhas, intervalo } },
  };
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

// Simular 60 a 120 s de vida passo a passo leva alguns segundos com a máquina ocupada.
const PRAZO_DAS_SIMULACOES = 30_000;

describe('folhas (SPEC-20, "Folhas")', { timeout: PRAZO_DAS_SIMULACOES }, () => {
  it('em 60 s nunca há mais de 8 folhas no ar, e cada uma sai do DOM no fim da queda (CT-20.3, CA-13.3.2)', () => {
    const { folhas, raiz } = montar();
    folhas.iniciar('completo');
    let maximo = 0;
    let primeira: Element | undefined;

    correr(60, () => {
      const noAr = raiz.querySelectorAll('.folha');
      maximo = Math.max(maximo, noAr.length);
      primeira ??= noAr[0];
    });

    expect(maximo).toBeGreaterThanOrEqual(2);
    expect(maximo).toBeLessThanOrEqual(8);
    expect(primeira?.isConnected).toBe(false);
  });

  it('a primeira folha só cai depois de config.vida.folhas.primeiroEm (1 s)', () => {
    const { folhas, raiz } = montar();
    folhas.iniciar('completo');

    correr(0.9);
    expect(raiz.querySelectorAll('.folha')).toHaveLength(0);

    correr(0.3);
    expect(raiz.querySelectorAll('.folha').length).toBeGreaterThan(0);
  });

  it('a maioria passa atrás do baú e algumas pela frente, menores ou maiores conforme a profundidade (CA-13.3.1)', () => {
    const { folhas, espacos } = montar({ config: comIntervalo([0.3, 0.3]) });
    folhas.iniciar('completo');
    const larguras = { fundo: new Set<string>(), chao: new Set<string>() };
    let nasceramNoFundo = 0;
    let nasceramNoChao = 0;
    const vistas = new Set<Element>();

    correr(120, () => {
      for (const nome of ['fundo', 'chao'] as const) {
        for (const folha of espacos[nome].querySelectorAll<HTMLElement>('.folha')) {
          if (vistas.has(folha)) continue;
          vistas.add(folha);
          larguras[nome].add(folha.style.width);
          if (nome === 'fundo') nasceramNoFundo += 1;
          else nasceramNoChao += 1;
        }
      }
    });

    expect(nasceramNoChao).toBeGreaterThan(0);
    expect(nasceramNoFundo).toBeGreaterThan(nasceramNoChao * 2);
    const maiorDoFundo = Math.max(...[...larguras.fundo].map(parseFloat));
    const menorDaFrente = Math.min(...[...larguras.chao].map(parseFloat));
    expect(maiorDoFundo).toBeLessThanOrEqual(0.024 * window.innerWidth + 1e-6);
    expect(menorDaFrente).toBeGreaterThanOrEqual(0.026 * window.innerWidth - 1e-6);
  });

  it('é decorativa: imagem clonada, alt vazio, aria-hidden e sem foco', () => {
    const { folhas, raiz } = montar();
    folhas.iniciar('completo');
    correr(3);

    const folha = raiz.querySelector('img.folha');

    expect(folha?.getAttribute('alt')).toBe('');
    expect(folha?.getAttribute('aria-hidden')).toBe('true');
    expect(raiz.querySelector('.folha[tabindex], button.folha, a.folha')).toBeNull();
  });

  it('em telas estreitas a folha nunca é menor que o piso de largura', () => {
    Object.assign(window, { innerWidth: 200, innerHeight: 400 });
    const { folhas, raiz } = montar();
    folhas.iniciar('completo');
    correr(20);

    const larguras = [...raiz.querySelectorAll<HTMLElement>('.folha')].map((f) =>
      parseFloat(f.style.width),
    );

    expect(larguras.length).toBeGreaterThan(0);
    expect(Math.min(...larguras)).toBeGreaterThanOrEqual(configReal.vida.folhas.larguraMinima);
  });

  it('descer para leve com 8 folhas no ar: nenhuma nova até haver menos de 4 (CT-20.4, RF-20.2)', () => {
    const { folhas, raiz } = montar({ config: comIntervalo([0.2, 0.2]) });
    folhas.iniciar('completo');
    correr(1.2 + 8 * 0.2);
    while (raiz.querySelectorAll('.folha').length < 8) correr(0.2);
    expect(raiz.querySelectorAll('.folha')).toHaveLength(8);

    folhas.aoMudarNivel('leve');
    let anterior = 8;
    let cresceu = false;
    correr(14, () => {
      const agora = raiz.querySelectorAll('.folha').length;
      // Enquanto há 4 ou mais no ar, nenhuma folha nova pode entrar.
      if (agora > anterior && anterior >= 4) cresceu = true;
      anterior = agora;
    });

    expect(cresceu).toBe(false);
  });

  it('sem imagem pronta a folha da vez é pulada, sem erro; quando a imagem chega elas começam (RF-20.1, RF-18.7)', () => {
    desfazerImagens();
    desfazerImagens = fingirImagens(false);
    const { folhas, raiz } = montar();
    expect(() => {
      folhas.iniciar('completo');
      correr(20);
    }).not.toThrow();
    expect(raiz.querySelectorAll('.folha')).toHaveLength(0);

    desfazerImagens();
    desfazerImagens = fingirImagens(true);
    correr(10);

    expect(raiz.querySelectorAll('.folha').length).toBeGreaterThan(0);
  });

  it('pausar congela as folhas no lugar e retomar termina a queda (RF-20.4)', () => {
    const { folhas, raiz } = montar();
    folhas.iniciar('completo');
    correr(4);
    const folha = raiz.querySelector<HTMLElement>('.folha');
    if (!folha) throw new Error('nenhuma folha nasceu');

    folhas.pausar();
    const congelada = Number(gsap.getProperty(folha, 'y'));
    correr(5);
    expect(Number(gsap.getProperty(folha, 'y'))).toBe(congelada);
    expect(folha.isConnected).toBe(true);

    folhas.retomar();
    correr(12);

    expect(folha.isConnected).toBe(false);
  });

  it('parar tira todas as folhas do DOM e nenhuma nasce depois (CT-20.6)', () => {
    const { folhas, raiz } = montar();
    folhas.iniciar('completo');
    correr(6);
    expect(raiz.querySelectorAll('.folha').length).toBeGreaterThan(0);

    folhas.parar();
    correr(30);

    expect(raiz.querySelectorAll('.folha')).toHaveLength(0);
  });
});

describe('pássaros (SPEC-20, "Pássaros")', { timeout: PRAZO_DAS_SIMULACOES }, () => {
  it('em 60 s pelo menos um bando nasce e sai do DOM, e nunca há dois ao mesmo tempo (CT-20.5, CA-13.3.3)', () => {
    const { passaros, raiz } = montar();
    passaros.iniciar('completo');
    let nasceu = false;
    let simultaneos = 0;
    let primeiro: Element | undefined;

    correr(60, () => {
      const bandos = raiz.querySelectorAll('.bando');
      simultaneos = Math.max(simultaneos, bandos.length);
      if (bandos.length > 0) nasceu = true;
      primeiro ??= bandos[0];
    });

    expect(nasceu).toBe(true);
    expect(simultaneos).toBe(1);
    expect(primeiro?.isConnected).toBe(false);
  });

  it('o primeiro bando só aparece depois de 3 s e fica no espaço do céu, decorativo', () => {
    const { passaros, raiz, espacos } = montar();
    passaros.iniciar('completo');

    correr(2.9);
    expect(raiz.querySelectorAll('.bando')).toHaveLength(0);

    correr(0.3);
    const bando = espacos.ceu.querySelector('svg.bando');
    expect(bando).not.toBeNull();
    expect(bando?.getAttribute('aria-hidden')).toBe('true');
    expect(bando?.querySelectorAll('g').length).toBeGreaterThanOrEqual(2);
    expect(bando?.querySelectorAll('g').length).toBeLessThanOrEqual(5);
    expect(bando?.querySelectorAll('path.passaro').length).toBe(
      bando?.querySelectorAll('g').length,
    );
  });

  it('um bando novo só nasce quando o anterior termina, mesmo com o intervalo curto', () => {
    const curto: ConfigConvite = {
      ...configReal,
      vida: {
        ...configReal.vida,
        passaros: { ...configReal.vida.passaros, intervalo: [1, 1], travessia: [9, 9] },
      },
    };
    const { passaros, raiz } = montar({ config: curto });
    passaros.iniciar('completo');
    const vistos = new Set<Element>();
    let maximo = 0;

    correr(80, () => {
      const bandos = raiz.querySelectorAll('.bando');
      maximo = Math.max(maximo, bandos.length);
      for (const bando of bandos) vistos.add(bando);
    });

    expect(maximo).toBe(1);
    expect(vistos.size).toBeGreaterThanOrEqual(4);
  });

  it('pausar congela o bando no ar e retomar o leva até o fim', () => {
    const { passaros, raiz } = montar();
    passaros.iniciar('completo');
    correr(5);
    const bando = raiz.querySelector('.bando');
    const ave = bando?.querySelector('g');
    if (!bando || !ave) throw new Error('nenhum bando no ar');

    passaros.pausar();
    const parado = Number(gsap.getProperty(ave, 'x'));
    correr(6);
    expect(Number(gsap.getProperty(ave, 'x'))).toBe(parado);
    expect(bando.isConnected).toBe(true);

    passaros.retomar();
    correr(20);

    expect(bando.isConnected).toBe(false);
  });

  it('parar com o bando no ar não deixa nenhum .bando e nenhum nasce depois (CT-20.6)', () => {
    const { passaros, raiz } = montar();
    passaros.iniciar('completo');
    correr(6);
    expect(raiz.querySelectorAll('.bando')).toHaveLength(1);

    passaros.parar();
    correr(40);

    expect(raiz.querySelectorAll('.bando')).toHaveLength(0);
  });

  it('o nível leve não muda os pássaros: a vida deles é a mesma nos dois níveis', () => {
    const { passaros, raiz } = montar();
    passaros.iniciar('leve');

    expect(() => {
      passaros.aoMudarNivel('leve');
    }).not.toThrow();
    correr(5);

    expect(raiz.querySelectorAll('.bando')).toHaveLength(1);
  });

  it('com a árvore e o céu fora do DOM (sem espaços) nada acontece, sem erro', () => {
    document.body.innerHTML = '';
    const raiz = document.createElement('div');
    const passaros = criarPassaros({ raiz, config: configReal });

    expect(() => {
      passaros.iniciar('completo');
      correr(10);
      passaros.parar();
    }).not.toThrow();
  });
});
