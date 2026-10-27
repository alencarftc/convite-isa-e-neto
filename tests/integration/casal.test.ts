import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarBarramento } from '@/application/barramento-eventos';
import { config } from '@/config/config';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { criarCasal } from '@/presentation/vida/casal';

import { criarEstadoFalso } from './suporte/estado-falso';
import { criarRelogioManual } from './suporte/relogio-gsap';
import { criarTickerFalso } from './suporte/ticker-falso';
import { instalarWebGLFalso, type WebGLFalso } from './suporte/webgl-falso';

let relogio: ReturnType<typeof criarRelogioManual>;
let webgl: WebGLFalso | undefined;

const LARGURA_DA_IMAGEM = 520;

/** O espaço do casal como a carta o monta (SPEC-22, RF-22.1). */
function montar(opcoes: { webgl?: boolean; carregada?: boolean } = {}) {
  document.body.innerHTML = '';
  const raiz = document.createElement('div');
  const casal = document.createElement('div');
  casal.className = 'casal';
  const brilho = document.createElement('span');
  brilho.className = 'casal__brilho';
  brilho.style.opacity = '0'; // a CSS o esconde até a vida o acender
  const figura = document.createElement('span');
  figura.className = 'casal__figura';
  const respiro = document.createElement('span');
  respiro.className = 'casal__respiro';
  const imagem = document.createElement('img');
  imagem.className = 'casal__imagem';
  Object.defineProperty(imagem, 'naturalWidth', {
    configurable: true,
    value: opcoes.carregada === false ? 0 : LARGURA_DA_IMAGEM,
  });
  Object.defineProperty(imagem, 'naturalHeight', { configurable: true, value: 400 });
  respiro.append(imagem);
  figura.append(respiro);
  casal.append(brilho, figura);
  raiz.append(casal);
  document.body.append(raiz);

  const { estado } = criarEstadoFalso();
  const eventos = criarBarramento<EventosConvite>();
  const ticker = criarTickerFalso();
  const elemento = criarCasal({
    raiz,
    config,
    estado,
    eventos,
    capacidades: { suportaWebGL: () => opcoes.webgl ?? true },
    ticker,
    aleatorio: () => 0.5,
  });
  return { elemento, raiz, brilho, figura, respiro, imagem, estado, eventos, ticker };
}

const escalaY = (el: Element) => Number(gsap.getProperty(el, 'scaleY'));
const opacidade = (el: Element) => Number(gsap.getProperty(el, 'opacity'));

beforeEach(() => {
  webgl = instalarWebGLFalso();
  relogio = criarRelogioManual();
});
afterEach(() => {
  webgl?.desinstalar();
  relogio.restaurar();
  vi.restoreAllMocks();
});

describe('casal vivo (SPEC-22)', () => {
  it('começa casalEm segundos depois de carta:abrindo: respiração e brilho (CT-22.2, CA-13.5.2)', () => {
    const { elemento, eventos, respiro, brilho } = montar();
    elemento.iniciar('completo');

    relogio.avancar(5);
    expect(escalaY(respiro)).toBe(1);
    expect(opacidade(brilho)).toBe(0);

    eventos.emit('carta:abrindo', { origem: 'toque' });
    relogio.avancar(config.convite.casalEm - 0.2);
    expect(opacidade(brilho)).toBe(0);

    relogio.avancar(0.3 + 2.2); // o casal surge: o halo acende e a respiração começa
    expect(escalaY(respiro)).toBeGreaterThan(1);
    expect(escalaY(respiro)).toBeLessThanOrEqual(config.vida.casal.respiracao.escala);
    expect(opacidade(brilho)).toBeGreaterThan(0);
  });

  it('a respiração vai e volta entre 1 e 1,006, a cada 4,5 s, para sempre (RF-22.3)', () => {
    const { elemento, eventos, respiro } = montar();
    elemento.iniciar('completo');
    eventos.emit('convite:pulado');
    let minimo = Infinity;
    let maximo = -Infinity;

    relogio.avancar(0.0, 0.05);
    for (let t = 0; t < 60; t += 0.05) {
      relogio.avancar(0.05, 0.05);
      minimo = Math.min(minimo, escalaY(respiro));
      maximo = Math.max(maximo, escalaY(respiro));
    }

    expect(minimo).toBeCloseTo(1, 4);
    expect(maximo).toBeCloseTo(1.006, 4);
  });

  it('o halo vai de 50% a 85% de opacidade e volta, a cada 6 s (RF-22.5)', () => {
    const { elemento, eventos, brilho } = montar();
    elemento.iniciar('completo');
    eventos.emit('convite:pulado');
    relogio.avancar(config.convite.casalAparece + 0.1);
    let minimo = Infinity;
    let maximo = -Infinity;

    for (let t = 0; t < 30; t += 0.05) {
      relogio.avancar(0.05, 0.05);
      minimo = Math.min(minimo, opacidade(brilho));
      maximo = Math.max(maximo, opacidade(brilho));
    }

    expect(minimo).toBeCloseTo(0.5, 2);
    expect(maximo).toBeCloseTo(0.85, 2);
  });

  it('com Pular os movimentos começam na hora (CT-22.2)', () => {
    const { elemento, eventos, respiro, brilho } = montar();
    elemento.iniciar('completo');

    eventos.emit('convite:pulado');
    relogio.avancar(1);

    expect(escalaY(respiro)).toBeGreaterThan(1);
    expect(opacidade(brilho)).toBeGreaterThan(0);
  });

  it('se a vida só começa com a carta já aberta, o casal ganha vida logo', () => {
    const { elemento, estado, respiro } = montar();
    estado.definirFase('informacoes');

    elemento.iniciar('completo');
    relogio.avancar(1);

    expect(escalaY(respiro)).toBeGreaterThan(1);
  });

  it('no nível completo com WebGL há um canvas do vento dentro do respiro, com as duas elipses (RF-22.4)', () => {
    const { elemento, eventos, respiro, ticker } = montar();
    elemento.iniciar('completo');
    eventos.emit('convite:pulado');

    const canvas = respiro.querySelector('canvas.ondulacao');

    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
    expect(ticker.escutas()).toBe(1);
    ticker.quadro(16);
    expect(webgl?.contar('drawArrays')).toBe(1);
    expect(webgl?.valorDoUniforme('u_nElipses')).toEqual([2]);
    expect(webgl?.valorDoUniforme('u_faixa')).toEqual([0, -1]); // sem faixa: o vento é só nas elipses
  });

  it('no nível leve não há vento: respiração e brilho ficam (CT-22.3, CA-13.5.3)', () => {
    const { elemento, eventos, respiro, ticker } = montar();
    elemento.iniciar('leve');
    eventos.emit('convite:pulado');
    relogio.avancar(1);

    expect(respiro.querySelector('canvas')).toBeNull();
    expect(ticker.escutas()).toBe(0);
    expect(escalaY(respiro)).toBeGreaterThan(1);
  });

  it('sem WebGL não há canvas e a respiração segue, sem erro (CT-22.3)', () => {
    const { elemento, eventos, respiro } = montar({ webgl: false });
    elemento.iniciar('completo');

    expect(() => {
      eventos.emit('convite:pulado');
      relogio.avancar(1);
    }).not.toThrow();

    expect(respiro.querySelector('canvas')).toBeNull();
    expect(escalaY(respiro)).toBeGreaterThan(1);
  });

  it('descer para leve no meio da vida tira o vento e mantém o resto', () => {
    const { elemento, eventos, respiro, ticker } = montar();
    elemento.iniciar('completo');
    eventos.emit('convite:pulado');
    expect(respiro.querySelector('canvas')).not.toBeNull();

    elemento.aoMudarNivel('leve');
    relogio.avancar(1);

    expect(respiro.querySelector('canvas')).toBeNull();
    expect(ticker.escutas()).toBe(0);
    expect(escalaY(respiro)).toBeGreaterThan(1);
  });

  it('a força do vento sobe e desce em rajadas de 8 a 12 s, entre o calmo e o inteiro (RF-22.4)', () => {
    const { elemento, eventos, ticker } = montar();
    elemento.iniciar('completo');
    eventos.emit('convite:pulado');
    const forcas: number[] = [];

    for (let t = 0; t < 40; t += 0.1) {
      ticker.quadro(100);
      forcas.push(webgl?.valorDoUniforme('u_forca')?.[0] as number);
    }

    expect(Math.min(...forcas)).toBeGreaterThanOrEqual(0.1 - 1e-9);
    expect(Math.max(...forcas)).toBeLessThanOrEqual(1 + 1e-9);
    expect(Math.max(...forcas) - Math.min(...forcas)).toBeGreaterThan(0.8);
  });

  it('o vento espera a imagem carregar (RF-22.2)', () => {
    const { elemento, eventos, respiro, imagem, ticker } = montar({ carregada: false });
    elemento.iniciar('completo');
    eventos.emit('convite:pulado');
    expect(respiro.querySelector('canvas')).toBeNull();

    Object.defineProperty(imagem, 'naturalWidth', { configurable: true, value: LARGURA_DA_IMAGEM });
    imagem.dispatchEvent(new Event('load'));

    expect(respiro.querySelector('canvas')).not.toBeNull();
    expect(ticker.escutas()).toBe(1);
  });

  it('perder o contexto tira só o vento: a respiração segue (RF-19.7)', () => {
    const { elemento, eventos, respiro } = montar();
    elemento.iniciar('completo');
    eventos.emit('convite:pulado');

    respiro.querySelector('canvas')?.dispatchEvent(new Event('webglcontextlost'));
    relogio.avancar(1);

    expect(respiro.querySelector('canvas')).toBeNull();
    expect(escalaY(respiro)).toBeGreaterThan(1);
  });

  it('pausar congela respiração, brilho e vento juntos; retomar os devolve (CA-13.1.6)', () => {
    const { elemento, eventos, respiro, brilho, ticker } = montar();
    elemento.iniciar('completo');
    eventos.emit('convite:pulado');
    relogio.avancar(1.7);

    elemento.pausar();
    const escala = escalaY(respiro);
    const halo = opacidade(brilho);
    relogio.avancar(5);
    expect(escalaY(respiro)).toBe(escala);
    expect(opacidade(brilho)).toBe(halo);
    expect(ticker.escutas()).toBe(0);

    elemento.retomar();
    relogio.avancar(1);
    expect(escalaY(respiro)).not.toBe(escala);
    expect(ticker.escutas()).toBe(1);
  });

  it('parar devolve o casal à pintura parada: sem canvas, sem halo, sem respiração (RF-18.5)', () => {
    const { elemento, eventos, respiro, brilho, ticker } = montar();
    elemento.iniciar('completo');
    eventos.emit('convite:pulado');
    relogio.avancar(2);

    elemento.parar();
    relogio.avancar(10);

    expect(respiro.querySelector('canvas')).toBeNull();
    expect(ticker.escutas()).toBe(0);
    expect(respiro.style.transform).toBe('');
    expect(brilho.style.opacity).toBe('');
    // Eventos depois do `parar` não ressuscitam nada.
    eventos.emit('convite:pulado');
    relogio.avancar(1);
    expect(respiro.style.transform).toBe('');
  });

  it('os movimentos começam uma vez só, mesmo com carta:abrindo e convite:pulado juntos', () => {
    const { elemento, eventos, respiro } = montar();
    elemento.iniciar('completo');

    eventos.emit('carta:abrindo', { origem: 'toque' });
    eventos.emit('convite:pulado');
    relogio.avancar(5);

    expect(gsap.getTweensOf(respiro)).toHaveLength(1);
  });
});
