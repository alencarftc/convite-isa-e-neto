import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarBarramento } from '@/application/barramento-eventos';
import { config } from '@/config/config';
import { content } from '@/config/content';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { criarCenaEntrada } from '@/presentation/entrada/cena-entrada';

import { criarCarregamentoFalso } from './suporte/carregamento-falso';
import { criarEstadoFalso, type OpcoesDoEstadoFalso } from './suporte/estado-falso';
import { montarIndexHtml, textoDoIndexHtml } from './suporte/index-html';

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

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
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

    it('init monta a imagem de config.imagens.selo e as iniciais de content.envelope (RF-16.5)', () => {
      const { cena, el } = montar();

      cena.init();

      expect(el('.entrada__selo-imagem').getAttribute('src')).toBe(config.imagens.selo);
      expect(el('.entrada__iniciais').textContent).toBe(content.envelope.iniciais);
      expect(el('.entrada__selo-imagem').getAttribute('alt')).toBe('');
    });

    it('o selo aparece quando a imagem chega, sem esperar nem atrasar "Toque para entrar" (CT-16.4)', async () => {
      const { cena, el } = montar();
      cena.init();
      expect(Number(el('.entrada__selo').style.opacity || 0)).toBe(0);

      el('.entrada__selo-imagem').dispatchEvent(new Event('load'));

      await vi.waitFor(() => {
        expect(Number(el('.entrada__selo').style.opacity)).toBe(1);
      });
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
      const execucao = montado.cena.run();
      montado.concluirImagens();
      await vi.waitFor(() => {
        expect(montado.el('.entrada__tocar').hidden).toBe(false);
      });
      return { ...montado, execucao };
    }

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

    it('com animação reduzida, o toque não espera o bosque', async () => {
      const { botao, execucao } = await ateOToque({ reduzido: true });

      botao('.entrada__tocar').click();

      await expect(execucao).resolves.toBe('entrar');
    });

    it('depois do toque, começa o carregamento secundário (RF-02.7)', async () => {
      const { botao, baixadas, concluirImagens } = await ateOToque();
      expect(baixadas).not.toContain('assets/provisorio/bau-aberto.svg');

      botao('.entrada__tocar').click();
      concluirImagens();

      await vi.waitFor(() => {
        expect(baixadas).toContain('assets/provisorio/bau-aberto.svg');
      });
    });
  });

  describe('bosque ainda carregando depois do toque', () => {
    async function tocarSemImagens() {
      const montado = montar();
      montado.cena.init();
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

    expect(baixadas.some((url) => url.includes('ceu-16x9'))).toBe(true);
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
