import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarBarramento } from '@/application/barramento-eventos';
import { config } from '@/config/config';
import { content } from '@/config/content';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { curvaCss } from '@/presentation/animacao/curva-css';
import { criarCenaEntrada } from '@/presentation/entrada/cena-entrada';

import { type AnimacoesFalsas, instalarAnimacoesFalsas } from './suporte/animacoes-falsas';
import { criarCarregamentoFalso } from './suporte/carregamento-falso';
import { criarEstadoFalso, type OpcoesDoEstadoFalso } from './suporte/estado-falso';
import { montarIndexHtml, textoDoIndexHtml } from './suporte/index-html';
import { criarRelogioManual } from './suporte/relogio-gsap';

function montar(opcoes: OpcoesDoEstadoFalso = {}) {
  montarIndexHtml();
  const raiz = document.querySelector<HTMLElement>('#app');
  if (!raiz) throw new Error('index.html sem #app');

  const { estado, girar } = criarEstadoFalso(opcoes);
  const { carregamento, baixadas, concluirImagens, passarEspera } = criarCarregamentoFalso(config);
  const eventos = criarBarramento<EventosConvite>();
  const aoTocar = vi.fn();
  eventos.on('entrada:tocou', aoTocar);
  const cena = criarCenaEntrada({ raiz, conteudo: content, config, estado, eventos, carregamento });

  const el = (seletor: string) => {
    const elemento = document.querySelector<HTMLElement>(seletor);
    if (!elemento) throw new Error(`sem ${seletor}`);
    return elemento;
  };
  const botao = (seletor: string) => {
    const elemento = document.querySelector<HTMLButtonElement>(seletor);
    if (!elemento) throw new Error(`sem ${seletor}`);
    return elemento;
  };

  return { cena, estado, aoTocar, baixadas, el, botao, concluirImagens, passarEspera, girar };
}

/** As animações do navegador que a entrada pediu (falsas: o happy-dom não as roda). */
let animacoes: AnimacoesFalsas;

beforeEach(() => {
  document.body.innerHTML = '';
  animacoes = instalarAnimacoesFalsas();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const proximoTurno = () => new Promise<void>((resolver) => setTimeout(resolver, 0));

describe('cena de entrada (SPEC-02)', () => {
  describe('primeiro quadro (RF-02.1)', () => {
    it('o index.html já traz nomes, névoa e botões ocultos, com o mesmo texto de content.entrada', () => {
      expect(textoDoIndexHtml('.entrada__nomes')).toBe(content.entrada.nomes);
      expect(textoDoIndexHtml('.entrada__chamada')).toBe(content.entrada.tocar);
      expect(textoDoIndexHtml('.entrada__volume')).toBe(content.entrada.volume);
      expect(textoDoIndexHtml('.entrada__aguarde')).toBe(content.entrada.aguarde);
      expect(document.querySelectorAll('.nevoa > span')).toHaveLength(2);
      expect(document.querySelector('.entrada__tocar')?.hasAttribute('hidden')).toBe(true);
    });

    it('init reescreve os rótulos a partir do content', () => {
      const { cena, el } = montar();
      el('.entrada__nomes').textContent = 'texto antigo';

      cena.init();

      expect(el('.entrada__nomes').textContent).toBe(content.entrada.nomes);
    });

    it('os nomes da entrada ficam numa linha só, "Isabella & David", sem elemento que os quebre (01/11/2026)', () => {
      const { cena, el } = montar();
      expect(el('.entrada__nomes').children).toHaveLength(0); // o primeiro quadro, do index.html

      cena.init();

      expect(el('.entrada__nomes').children).toHaveLength(0);
      expect(el('.entrada__nomes').textContent).toBe('Isabella & David');
    });

    it('a névoa respira por animações do navegador: cada camada vai e volta 4% para um lado e a opacidade oscila entre 0,85 e 1 (ADR-0044)', () => {
      const { cena } = montar();
      cena.init();
      const { nevoaEmRepouso } = config.duracoes;

      const camadas = [...document.querySelectorAll<HTMLElement>('.nevoa > span')];
      expect(camadas).toHaveLength(2);
      const [primeira, segunda] = camadas.map((camada) => animacoes.doElemento(camada));
      // uma animação de deslocamento e outra de opacidade por camada
      expect(primeira).toHaveLength(2);
      expect(primeira?.[0]?.quadros).toEqual([
        { transform: 'translateX(-4%)' },
        { transform: 'translateX(4%)' },
      ]);
      expect(segunda?.[0]?.quadros).toEqual([
        { transform: 'translateX(4%)' },
        { transform: 'translateX(-4%)' }, // a segunda vai em sentido oposto
      ]);
      expect(primeira?.[0]?.opcoes).toMatchObject({
        duration: nevoaEmRepouso * 1000,
        direction: 'alternate',
        iterations: Number.POSITIVE_INFINITY,
        easing: curvaCss(config.curvas.suave),
      });
      expect(primeira?.[1]?.quadros).toEqual([{ opacity: 0.85 }, { opacity: 1 }]);
      expect(primeira?.[1]?.opcoes).toMatchObject({ duration: (nevoaEmRepouso / 2) * 1000 });
    });

    it('com animação reduzida a névoa fica parada: nenhuma animação do navegador', () => {
      const { cena } = montar({ reduzido: true });
      cena.init();

      expect(animacoes.todas).toHaveLength(0);
    });

    it('destroy e skip cancelam a respiração da névoa', () => {
      const { cena } = montar();
      cena.init();
      expect(animacoes.vivas().length).toBeGreaterThan(0);

      cena.destroy();

      expect(animacoes.vivas()).toHaveLength(0);
    });

    it('sem a seção .entrada no HTML, falha com mensagem clara', () => {
      const { cena } = montar();
      document.querySelector('.entrada')?.remove();

      expect(() => {
        cena.init();
      }).toThrow('.entrada');
    });
  });

  describe('"Toque para entrar"', () => {
    it('só aparece depois que as imagens críticas carregaram (CA-02.3.1, CA-02.2.1)', async () => {
      const { cena, estado, el, concluirImagens } = montar();
      cena.init();
      void cena.run();
      await proximoTurno();

      expect(el('.entrada__tocar').hidden).toBe(true);
      expect(estado.fase).toBe('carregando');

      concluirImagens();
      await vi.waitFor(() => {
        expect(el('.entrada__tocar').hidden).toBe(false);
      });
      expect(estado.fase).toBe('aguardando-entrada');
    });

    it('aparece mesmo assim depois de 8 s sem o crítico (CA-02.4.1, CT-02.4)', async () => {
      const { cena, estado, el, passarEspera } = montar();
      cena.init();
      void cena.run();
      await proximoTurno();
      expect(el('.entrada__tocar').hidden).toBe(true);

      passarEspera(config.duracoes.limiteCritico);

      await vi.waitFor(() => {
        expect(el('.entrada__tocar').hidden).toBe(false);
      });
      expect(estado.fase).toBe('aguardando-entrada');
    });

    it('"Pular para o convite" não é mais da entrada: é o botão fixo da SPEC-14', () => {
      montar();

      expect(document.querySelector('.entrada__pular')).toBeNull();
    });
  });

  describe('selo na entrada (SPEC-16)', () => {
    it('o HTML reserva o lugar do selo, decorativo, acima dos nomes, sem texto próprio (RF-16.5)', () => {
      montarIndexHtml();

      const selo = document.querySelector('.entrada__selo');
      expect(selo?.getAttribute('aria-hidden')).toBe('true');
      expect(selo?.textContent).toBe('');
      expect(selo?.nextElementSibling?.className).toBe('entrada__nomes');
    });

    it('init monta o selo inteiro (uma imagem só) com a imagem de config.imagens.selo, decorativa e sem texto (RF-16.5)', () => {
      const { cena } = montar();

      cena.init();

      const imagens = [
        ...document.querySelectorAll<HTMLImageElement>('.entrada__selo .selo__imagem'),
      ];
      expect(imagens).toHaveLength(1);
      expect(imagens[0]?.getAttribute('src')).toBe(config.imagens.selo);
      expect(imagens[0]?.getAttribute('alt')).toBe('');
      expect(document.querySelector('.selo__metade')).toBeNull(); // o selo não se parte (31/10/2026)
      expect(document.querySelector('.entrada__iniciais')).toBeNull(); // as siglas vêm na arte
      expect(document.querySelector('.entrada__selo')?.textContent).toBe('');
    });

    /** A landing, do primeiro quadro ao "Toque para entrar": os botões fixos de cima já existem na página (como em main.ts). */
    function prepararLanding(opcoes: OpcoesDoEstadoFalso = {}) {
      const montado = montar(opcoes);
      for (const classe of ['botao-som', 'botao-pular']) {
        const botao = document.createElement('button');
        botao.className = classe;
        document.body.append(botao);
      }
      montado.cena.init();
      return montado;
    }
    const itensDaLanding = ['.entrada__nomes', '.entrada__tocar', '.entrada__selo'] as const;

    it('os nomes, o selo e "Toque para entrar" nascem invisíveis: nada aparece antes da hora, nem os nomes que vinham no HTML (11/11/2026)', () => {
      const { el } = prepararLanding();

      expect(animacoes.doElemento(el('.entrada__nomes'))).toHaveLength(0);
      expect(animacoes.doElemento(el('.entrada__selo'))).toHaveLength(0);
      expect(el('.entrada__tocar').hidden).toBe(true);
      expect(Number(el('.entrada__selo').style.opacity || 0)).toBe(0);
    });

    it('quando as imagens críticas e o selo chegaram, os nomes, o selo, "Toque para entrar" e os botões de cima entram juntos: mesmo instante, mesma duração, mesma curva (11/11/2026)', async () => {
      const { cena, el, concluirImagens, estado } = prepararLanding();
      el('.entrada__selo .selo__imagem').dispatchEvent(new Event('load'));
      void cena.run();
      concluirImagens();
      await vi.waitFor(() => {
        expect(el('.entrada__tocar').hidden).toBe(false);
      });
      const { entradaJunto } = config.duracoes;

      const botoes = [...document.querySelectorAll<HTMLElement>('.botao-som, .botao-pular')];
      const entrando = [...itensDaLanding.map((seletor) => el(seletor)), ...botoes].map(
        (elemento) => animacoes.doElemento(elemento)[0],
      );
      expect(entrando.every((animacao) => animacao !== undefined)).toBe(true);
      for (const animacao of entrando) {
        expect(animacao?.opcoes).toMatchObject({
          duration: entradaJunto * 1000,
          easing: curvaCss(config.curvas.saida),
          fill: 'both',
        });
        expect(animacao?.opcoes.delay ?? 0).toBe(0); // todos começam no mesmo instante
      }
      // os nomes e "Toque para entrar" sobem um pouco; o selo e os botões só esmaecem
      expect(animacoes.doElemento(el('.entrada__nomes'))[0]?.quadros).toEqual([
        { opacity: 0, transform: `translateY(${String(config.entrada.sobe)}px)` },
        { opacity: 1, transform: 'translateY(0px)' },
      ]);
      expect(animacoes.doElemento(el('.entrada__tocar'))[0]?.quadros[0]).toMatchObject({
        opacity: 0,
        transform: `translateY(${String(config.entrada.sobe)}px)`,
      });
      expect(animacoes.doElemento(el('.entrada__selo'))[0]?.quadros).toEqual([
        { opacity: 0 },
        { opacity: 1 },
      ]);
      expect(estado.fase).toBe('aguardando-entrada'); // a fase muda no mesmo instante (a CSS mostra os botões fixos por ela)
    });

    it('ao fim da entrada o estado final vai para o estilo e as animações são canceladas: tudo fica à vista (11/11/2026)', async () => {
      const { cena, el, concluirImagens } = prepararLanding();
      el('.entrada__selo .selo__imagem').dispatchEvent(new Event('load'));
      void cena.run();
      concluirImagens();
      await vi.waitFor(() => {
        expect(el('.entrada__tocar').hidden).toBe(false);
      });

      animacoes.terminarTodas();

      for (const seletor of itensDaLanding) {
        expect(el(seletor).style.opacity, seletor).toBe('1');
        expect(animacoes.doElemento(el(seletor))[0]?.estado, seletor).toBe('cancelled');
      }
      expect(el('.entrada__nomes').style.transform).toBe('');
      expect(el('.entrada__tocar').style.transform).toBe('');
      // os botões fixos não ganham estilo: a CSS os mostra quando a fase deixa de ser "carregando"
      expect(document.querySelector<HTMLElement>('.botao-som')?.style.opacity).toBe('');
    });

    it('se o selo demora mais que `entradaAguardaSelo`, a landing entra sem ele e ele chega sozinho, com a mesma suavidade (11/11/2026)', async () => {
      const relogio = criarRelogioManual();
      try {
        const { cena, el, concluirImagens } = prepararLanding();
        void cena.run();
        concluirImagens();
        // O relógio anda aos poucos até a landing entrar (a espera só existe quando as imagens críticas chegam).
        let avancado = 0;
        await vi.waitFor(() => {
          relogio.avancar(0.05, 0.01);
          avancado += 0.05;
          expect(el('.entrada__tocar').hidden).toBe(false);
        });
        expect(avancado).toBeGreaterThanOrEqual(config.duracoes.entradaAguardaSelo - 0.06); // esperou o selo até o limite

        expect(animacoes.doElemento(el('.entrada__nomes'))).toHaveLength(1);
        expect(animacoes.doElemento(el('.entrada__selo'))).toHaveLength(0); // o selo ficou de fora

        el('.entrada__selo .selo__imagem').dispatchEvent(new Event('load')); // e agora chegou
        await vi.waitFor(() => {
          expect(animacoes.doElemento(el('.entrada__selo'))).toHaveLength(1);
        });
        expect(animacoes.doElemento(el('.entrada__selo'))[0]?.opcoes).toMatchObject({
          duration: config.duracoes.entradaJunto * 1000,
        });
      } finally {
        relogio.restaurar();
      }
    });

    it('um selo que não vem (erro ao carregar) não trava a landing: ela entra do mesmo jeito', async () => {
      const { cena, el, concluirImagens } = prepararLanding();
      void cena.run();
      concluirImagens();

      el('.entrada__selo .selo__imagem').dispatchEvent(new Event('error'));

      await vi.waitFor(() => {
        expect(el('.entrada__tocar').hidden).toBe(false);
      });
    });

    it('com animação reduzida nada se anima: os nomes, o selo e "Toque para entrar" aparecem de uma vez (11/11/2026)', async () => {
      const { cena, el, concluirImagens } = prepararLanding({ reduzido: true });
      el('.entrada__selo .selo__imagem').dispatchEvent(new Event('load'));
      void cena.run();
      concluirImagens();
      await vi.waitFor(() => {
        expect(el('.entrada__tocar').hidden).toBe(false);
      });

      for (const seletor of itensDaLanding) expect(el(seletor).style.opacity, seletor).toBe('1');
      expect(animacoes.todas).toHaveLength(0);
    });

    it('pulsa devagar em repouso e fica parado com animação reduzida (CT-16.3)', () => {
      const normal = montar();
      normal.cena.init();
      const tweens = gsap.getTweensOf(normal.el('.entrada__selo'));
      expect(tweens.some((tween) => tween.repeat() === -1)).toBe(true);
      normal.cena.destroy();

      const reduzida = montar({ reduzido: true });
      reduzida.cena.init();
      expect(
        gsap.getTweensOf(reduzida.el('.entrada__selo')).some((tween) => tween.repeat() === -1),
      ).toBe(false);
    });

    it('a área de toque da entrada continua sendo a tela inteira: o selo não captura o toque (RF-16.5, RF-16.6)', async () => {
      const { cena, concluirImagens, botao, aoTocar } = montar();
      cena.init();
      void cena.run();
      concluirImagens();
      await vi.waitFor(() => {
        expect(botao('.entrada__tocar').hidden).toBe(false);
      });

      botao('.entrada__tocar').click();

      expect(aoTocar).toHaveBeenCalledExactlyOnceWith({ escolha: 'entrar' });
    });
  });

  describe('toque', () => {
    async function ateOToque(opcoes: OpcoesDoEstadoFalso = {}) {
      const montado = montar(opcoes);
      montado.cena.init();
      montado.el('.entrada__selo .selo__imagem').dispatchEvent(new Event('load')); // o selo já chegou
      const execucao = montado.cena.run();
      montado.concluirImagens();
      await vi.waitFor(() => {
        expect(montado.el('.entrada__tocar').hidden).toBe(false);
      });
      return { ...montado, execucao };
    }

    it('um toque no meio da entrada leva o que ainda entrava direto ao fim, antes de a saída começar (11/11/2026)', async () => {
      const { botao, el, execucao, concluirImagens } = await ateOToque();
      const nomes = animacoes.doElemento(el('.entrada__nomes'))[0];
      expect(nomes?.estado).toBe('running'); // ainda entrando

      botao('.entrada__tocar').click();
      concluirImagens();
      await execucao;

      expect(nomes?.estado).toBe('cancelled');
      expect(el('.entrada__nomes').style.opacity).not.toBe('0');
    });

    it('emite entrada:tocou dentro do próprio clique e resolve "entrar" com o bosque pronto (RF-02.6)', async () => {
      const { botao, aoTocar, execucao, concluirImagens } = await ateOToque();

      botao('.entrada__tocar').click();
      expect(aoTocar).toHaveBeenCalledExactlyOnceWith({ escolha: 'entrar' }); // síncrono, no gesto
      concluirImagens();

      await expect(execucao).resolves.toBe('entrar');
    });

    it('toque duplo rápido só conta o primeiro (casos de borda)', async () => {
      const { botao, aoTocar, concluirImagens } = await ateOToque();
      const tocar = botao('.entrada__tocar');

      tocar.click();
      tocar.click();
      concluirImagens();

      expect(aoTocar).toHaveBeenCalledTimes(1);
      expect(tocar.disabled).toBe(true);
    });

    it('ao tocar, o selo se solta inteiro (levanta, cresce e some), um clarão acende e os nomes se desfazem (ADR-0012)', async () => {
      const { botao, el, execucao, concluirImagens } = await ateOToque();

      botao('.entrada__tocar').click();
      concluirImagens();
      await execucao;
      await vi.waitFor(
        () => {
          expect(Number(gsap.getProperty(el('.entrada__selo .selo__imagem'), 'opacity'))).toBe(0);
          expect(Number(gsap.getProperty(el('.entrada__nomes'), 'opacity'))).toBe(0);
        },
        { timeout: 4000 },
      );

      expect(Number(gsap.getProperty(el('.entrada__nomes'), 'y'))).toBeLessThan(0); // os nomes subiram
      // O selo subiu e cresceu ao se soltar, mas nunca foi partido nem girou além do giro configurado.
      const imagem = el('.entrada__selo .selo__imagem');
      expect(Number(gsap.getProperty(imagem, 'y'))).toBeLessThan(0);
      expect(Number(gsap.getProperty(imagem, 'scale'))).toBeGreaterThan(1);
      expect(Math.abs(Number(gsap.getProperty(imagem, 'rotation')))).toBeLessThanOrEqual(
        config.entrada.saida.solta.giro + 1e-6,
      );
    });

    it('o clarão que sai de trás do selo é uma animação do navegador: sobe até a opacidade máxima a 35%, e se desfaz crescendo, depois do aperto (ADR-0044)', async () => {
      const { botao, el, execucao, concluirImagens } = await ateOToque();
      const { saida } = config.entrada;

      botao('.entrada__tocar').click();
      concluirImagens();
      await execucao;

      const [clarao] = animacoes.doElemento(el('.selo__brilho'));
      expect(clarao?.quadros).toEqual([
        { opacity: 0, transform: 'scale(0.3)', easing: curvaCss(config.curvas.saida) },
        {
          opacity: saida.brilho.opacidade,
          transform: `scale(${String(saida.brilho.escala * 0.6)})`,
          offset: 0.35,
          easing: curvaCss(config.curvas.senoSaida),
        },
        { opacity: 0, transform: `scale(${String(saida.brilho.escala)})` },
      ]);
      expect(clarao?.opcoes).toMatchObject({
        duration: saida.brilho.duracao * 1000,
        delay: saida.aperto.duracao * 1000,
        fill: 'both',
      });
      expect(saida.brilho.opacidade).toBeGreaterThan(0.3);
    });

    it('a névoa só pode abrir quando o selo se solta: o run espera config.entrada.saida.nevoaEm', async () => {
      // Relógio manual: medir o tempo real falhava com a máquina ocupada (o conjunto todo roda junto).
      const relogio = criarRelogioManual();
      try {
        const { botao, execucao, concluirImagens } = await ateOToque();
        let resolvida = false;
        void execucao.then(() => {
          resolvida = true;
        });

        botao('.entrada__tocar').click();
        concluirImagens();
        relogio.avancar(config.entrada.saida.nevoaEm - 0.05, 0.01);
        await Promise.resolve();
        await Promise.resolve();
        expect(resolvida).toBe(false); // o selo ainda não se soltou

        relogio.avancar(5, 0.05);
        await expect(execucao).resolves.toBe('entrar');
      } finally {
        relogio.restaurar();
      }
    });

    it('com animação reduzida, o toque só esmaece: o selo não se solta nem o clarão acende', async () => {
      const { botao, el, execucao } = await ateOToque({ reduzido: true });

      botao('.entrada__tocar').click();
      await execucao;

      expect(gsap.getTweensOf(el('.selo__brilho'))).toHaveLength(0);
      expect(animacoes.doElemento(el('.selo__brilho'))).toHaveLength(0);
      expect(gsap.getTweensOf(el('.entrada__selo .selo__imagem'))).toHaveLength(0);
    });

    it('com animação reduzida, o toque não espera o bosque', async () => {
      const { botao, execucao } = await ateOToque({ reduzido: true });

      botao('.entrada__tocar').click();

      await expect(execucao).resolves.toBe('entrar');
    });

    it('depois do toque, começa o carregamento secundário (RF-02.7)', async () => {
      const { botao, baixadas, concluirImagens } = await ateOToque();
      expect(baixadas).not.toContain('assets/objects/09-bau-aberto.webp');

      botao('.entrada__tocar').click();
      concluirImagens();

      await vi.waitFor(() => {
        expect(baixadas).toContain('assets/objects/09-bau-aberto.webp');
      });
    });
  });

  describe('bosque ainda carregando depois do toque', () => {
    async function tocarSemImagens() {
      const montado = montar();
      montado.cena.init();
      montado.el('.entrada__selo .selo__imagem').dispatchEvent(new Event('load')); // o selo já chegou
      const execucao = montado.cena.run();
      const resultado = execucao.then(
        (valor) => ({ valor }),
        (erro: unknown) => ({ erro }),
      );
      montado.passarEspera(config.duracoes.limiteCritico); // "Toque" aparece sem o crítico
      await vi.waitFor(() => {
        expect(montado.el('.entrada__tocar').hidden).toBe(false);
      });
      montado.botao('.entrada__tocar').click();
      return { ...montado, resultado };
    }

    it('mostra "Preparando o bosque…" e segue quando as imagens chegam (CT-02.4)', async () => {
      const { el, resultado, concluirImagens } = await tocarSemImagens();

      await vi.waitFor(() => {
        expect(el('.entrada__aguarde').hidden).toBe(false);
      });
      concluirImagens();

      await expect(resultado).resolves.toEqual({ valor: 'entrar' });
      expect(el('.entrada__aguarde').hidden).toBe(true);
    });

    it('20 s depois do toque, sem bosque, rejeita para o orquestrador entrar em segurança (CA-02.4.2)', async () => {
      const { passarEspera, resultado } = await tocarSemImagens();
      await proximoTurno(); // a espera do bosque começa uns passos depois do toque

      passarEspera(config.duracoes.limiteSeguranca);

      const { erro } = (await resultado) as { erro: Error };
      expect(erro.message).toContain('não ficou pronto');
    });

    it('imagem crítica ausente depois da nova tentativa rejeita no toque (CT-02.5)', async () => {
      const { resultado, concluirImagens, passarEspera } = await tocarSemImagens();

      concluirImagens(false); // primeira tentativa falha
      await proximoTurno();
      passarEspera(config.duracoes.novaTentativaDeImagem);
      await proximoTurno();
      concluirImagens(false); // segunda também

      const { erro } = (await resultado) as { erro: Error };
      expect(erro.message).toContain('Imagem crítica ausente');
    });
  });

  it('girar o aparelho antes do toque baixa também as imagens da outra orientação (RF-02.9)', async () => {
    const { cena, baixadas, girar } = montar();
    cena.init();
    void cena.run();
    await proximoTurno();
    expect(baixadas.some((url) => url.includes('-16x9'))).toBe(false);

    girar('horizontal');

    expect(baixadas.some((url) => url.includes('ceu-baunilha-16x9'))).toBe(true);
  });

  it('skip esconde a entrada; destroy devolve o primeiro quadro (HMR)', () => {
    const { cena, el } = montar();
    cena.init();

    cena.skip();
    expect(el('.entrada').hidden).toBe(true);

    cena.destroy();
    expect(el('.entrada').hidden).toBe(false);
  });

  it('skip funciona mesmo sem init (modo de segurança)', () => {
    const { cena, el } = montar();

    cena.skip();

    expect(el('.entrada').hidden).toBe(true);
  });
});
