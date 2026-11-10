import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarBarramento } from '@/application/barramento-eventos';
import { config } from '@/config/config';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import type { Aleatorio } from '@/domain/vida/sorteio';
import { criarPetalasDoConvite } from '@/presentation/vida/petalas-do-convite';

import { criarEstadoFalso, type OpcoesDoEstadoFalso } from './suporte/estado-falso';
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

function montar(opcoes: OpcoesDoEstadoFalso & { modesto?: boolean; semente?: number } = {}) {
  document.body.innerHTML = '';
  const { estado } = criarEstadoFalso(opcoes);
  const eventos = criarBarramento<EventosConvite>();
  const petalas = criarPetalasDoConvite({
    corpo: document.body,
    config,
    estado,
    eventos,
    capacidades: { aparelhoModesto: () => opcoes.modesto ?? false },
    aleatorio: congruente(opcoes.semente ?? 11),
  });
  return { estado, eventos, petalas };
}

/** Avança o relógio em passos de 50 ms, chamando `observar` a cada passo. */
function correr(segundos: number, observar: () => void = () => undefined): void {
  for (let t = 0; t < segundos; t += 0.05) {
    relogio.avancar(0.05, 0.05);
    observar();
  }
}

const noAr = () => [...document.querySelectorAll<HTMLElement>('.petala-do-convite')];

beforeEach(() => {
  desfazerImagens = fingirImagens(true);
  relogio = criarRelogioManual();
});
afterEach(() => {
  relogio.restaurar();
  desfazerImagens();
  vi.restoreAllMocks();
});

// Simular uns 2 minutos de queda passo a passo leva alguns segundos com a máquina ocupada.
const PRAZO_DAS_SIMULACOES = 30_000;
const parametros = config.petalasDoConvite;

describe(
  'pétalas do convite aberto: caem devagar e sem parar (08/11/2026)',
  { timeout: PRAZO_DAS_SIMULACOES },
  () => {
    it('nada cai antes de o convidado tocar no selo, e nem a camada existe', () => {
      montar();

      correr(10);

      expect(document.querySelector('.petalas-do-convite')).toBeNull();
      expect(noAr()).toHaveLength(0);
    });

    it('ao tocar no selo a camada aparece, e a primeira pétala só cai depois de `primeiroEm`', () => {
      const { eventos } = montar();

      eventos.emit('carta:abrindo', { origem: 'toque' });
      correr(parametros.primeiroEm - 0.1);
      expect(noAr()).toHaveLength(0);

      correr(0.3);
      expect(document.querySelector('.petalas-do-convite')).not.toBeNull();
      expect(noAr().length).toBeGreaterThanOrEqual(1);
    });

    it('caem uma de cada vez, não todas de uma vez: no começo há uma só, e o número sobe aos poucos', () => {
      const { eventos } = montar();
      eventos.emit('carta:abrindo', { origem: 'toque' });

      correr(parametros.primeiroEm + 0.3);
      expect(noAr().length).toBeLessThanOrEqual(1);

      correr(parametros.intervalo[0] * 0.5);
      expect(noAr().length).toBeLessThanOrEqual(2);

      correr(20);
      const depois = noAr().length;
      expect(depois).toBeGreaterThan(2);
      expect(depois).toBeLessThanOrEqual(parametros.maximo.completo);
    });

    it('continuam caindo para sempre: em 2 minutos nunca passam do limite, nunca acabam e saem do DOM no fim da queda', () => {
      const { eventos } = montar();
      eventos.emit('carta:abrindo', { origem: 'toque' });
      let maximo = 0;
      const vistas = new Set<Element>();
      let primeira: Element | undefined;
      let vaziasDepoisDosPrimeirosSegundos = 0;
      let passos = 0;

      correr(120, () => {
        const lista = noAr();
        maximo = Math.max(maximo, lista.length);
        for (const petala of lista) vistas.add(petala);
        primeira ??= lista[0];
        passos += 1;
        if (passos * 0.05 > 30 && lista.length === 0) vaziasDepoisDosPrimeirosSegundos += 1;
      });

      expect(maximo).toBeLessThanOrEqual(parametros.maximo.completo);
      expect(vistas.size).toBeGreaterThan(20); // surgem pétalas novas o tempo todo
      expect(vaziasDepoisDosPrimeirosSegundos).toBe(0); // e nunca fica sem nenhuma
      expect(primeira?.isConnected).toBe(false); // cada uma sai do DOM no fim
    });

    it('caem em posições variadas: as pétalas começam espalhadas por toda a largura da tela', () => {
      const { eventos } = montar();
      eventos.emit('carta:abrindo', { origem: 'toque' });
      const inicios = new Map<Element, number>();

      correr(90, () => {
        for (const petala of noAr()) {
          if (!inicios.has(petala)) inicios.set(petala, Number(gsap.getProperty(petala, 'x')));
        }
      });

      const xs = [...inicios.values()];
      expect(xs.length).toBeGreaterThan(15);
      const largura = window.innerWidth;
      expect(Math.min(...xs)).toBeLessThan(largura * 0.25);
      expect(Math.max(...xs)).toBeGreaterThan(largura * 0.75);
      expect(new Set(xs.map((x) => Math.round(x / 20))).size).toBeGreaterThan(8);
    });

    it('caem devagar e com delicadeza: a queda dura de 11 a 18 s, são pequenas e fracas', () => {
      const { eventos } = montar();
      eventos.emit('carta:abrindo', { origem: 'toque' });
      correr(parametros.primeiroEm + 0.4);
      const [petala] = noAr();
      if (!petala) throw new Error('nenhuma pétala');

      const largura = Number.parseFloat(petala.style.width);
      expect(largura).toBeGreaterThanOrEqual(parametros.largura[0]);
      expect(largura).toBeLessThanOrEqual(parametros.largura[1]);
      expect(parametros.duracao[0]).toBeGreaterThanOrEqual(10);
      expect(parametros.largura[1]).toBeLessThanOrEqual(30);
      expect(parametros.opacidade).toBeLessThanOrEqual(0.9);

      const y0 = Number(gsap.getProperty(petala, 'y'));
      correr(2);
      const y1 = Number(gsap.getProperty(petala, 'y'));
      const velocidade = (y1 - y0) / 2; // pixels por segundo
      expect(velocidade).toBeGreaterThan(10);
      expect(velocidade).toBeLessThan(window.innerHeight / 8); // mais de 8 s para atravessar a tela
    });

    it('cada pétala é só enfeite: decorativa, sem texto, fora da árvore de acessibilidade, e a camada não recebe toque', () => {
      const { eventos } = montar();
      eventos.emit('carta:abrindo', { origem: 'toque' });
      correr(parametros.primeiroEm + 5);

      const camada = document.querySelector<HTMLElement>('.petalas-do-convite');
      expect(camada?.getAttribute('aria-hidden')).toBe('true');
      for (const petala of noAr()) {
        expect(petala.getAttribute('aria-hidden')).toBe('true');
        expect(petala.getAttribute('alt')).toBe('');
        expect(petala.getAttribute('src')).toMatch(/petala-[abc]/);
      }
    });

    it('o botão "Pausar animação" congela as pétalas no lugar, e ao religar elas seguem', () => {
      const { eventos, estado } = montar();
      eventos.emit('carta:abrindo', { origem: 'toque' });
      correr(parametros.primeiroEm + 4);
      const petala = noAr()[0];
      if (!petala) throw new Error('nenhuma pétala');

      estado.definirMovimento(false);
      const parada = Number(gsap.getProperty(petala, 'y'));
      correr(3);
      expect(Number(gsap.getProperty(petala, 'y'))).toBe(parada);

      estado.definirMovimento(true);
      correr(2);
      expect(Number(gsap.getProperty(petala, 'y'))).toBeGreaterThan(parada);
    });

    it('quem pausou a animação numa visita anterior só vê as pétalas quando religa', () => {
      const { eventos, estado } = montar({ movimentoLigado: false });
      eventos.emit('carta:abrindo', { origem: 'toque' });

      correr(parametros.primeiroEm + 5);
      expect(noAr()).toHaveLength(0);

      estado.definirMovimento(true);
      correr(parametros.primeiroEm + 1);
      expect(noAr().length).toBeGreaterThan(0);
    });

    it('quem pula direto ao convite vê as pétalas começarem logo, em `primeiroEmAoPular`', () => {
      const { eventos } = montar();

      eventos.emit('convite:pulado');
      correr(parametros.primeiroEmAoPular - 0.1);
      expect(noAr()).toHaveLength(0);

      correr(0.3);
      expect(noAr().length).toBeGreaterThanOrEqual(1);
    });

    it('um aparelho modesto tem menos pétalas no ar', { timeout: 90_000 }, () => {
      const { eventos } = montar({ modesto: true });
      eventos.emit('carta:abrindo', { origem: 'toque' });
      let maximo = 0;

      correr(120, () => {
        maximo = Math.max(maximo, noAr().length);
      });

      expect(maximo).toBeLessThanOrEqual(parametros.maximo.leve);
      expect(maximo).toBeGreaterThan(1);
    });

    it('com animação reduzida nunca cai pétala nenhuma', () => {
      const { eventos } = montar({ reduzido: true });
      eventos.emit('carta:abrindo', { origem: 'toque' });
      eventos.emit('convite:pulado');

      correr(30);

      expect(document.querySelector('.petalas-do-convite')).toBeNull();
    });

    it('o modo de segurança leva tudo embora e nada mais cai', () => {
      const { eventos, estado } = montar();
      eventos.emit('carta:abrindo', { origem: 'toque' });
      correr(parametros.primeiroEm + 6);
      expect(noAr().length).toBeGreaterThan(0);

      estado.definirFase('seguranca');

      expect(document.querySelector('.petalas-do-convite')).toBeNull();
      correr(20);
      expect(document.querySelector('.petalas-do-convite')).toBeNull();
    });

    it('destruir para tudo, tira a camada e solta os ouvintes', () => {
      const { eventos, petalas } = montar();
      eventos.emit('carta:abrindo', { origem: 'toque' });
      correr(parametros.primeiroEm + 6);

      petalas.destruir();
      eventos.emit('convite:pulado');
      correr(20);

      expect(document.querySelector('.petalas-do-convite')).toBeNull();
    });

    it('tocar no selo duas vezes ou pular depois não cria uma segunda camada', () => {
      const { eventos } = montar();

      eventos.emit('carta:abrindo', { origem: 'toque' });
      eventos.emit('convite:pulado');

      expect(document.querySelectorAll('.petalas-do-convite')).toHaveLength(1);
    });
  },
);
