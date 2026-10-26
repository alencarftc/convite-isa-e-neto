import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criarBarramento } from '@/application/barramento-eventos';
import { criarEstado, type EstadoConvite } from '@/application/estado-convite';
import type { Ambiente, Orientacao } from '@/application/ports/ambiente';
import type { CarregadorDeImagens } from '@/application/ports/carregador-de-imagens';
import type { Temporizador } from '@/application/ports/temporizador';
import { criarCarregamento } from '@/application/use-cases/carregamento';
import { config } from '@/config/config';
import { content } from '@/config/content';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { criarCenaEntrada } from '@/presentation/entrada/cena-entrada';

import { montarIndexHtml, textoDoIndexHtml } from './suporte/index-html';

/** Imagens falsas: ficam pendentes até o teste liberar; `ausentes` lista as urls que nunca existem. */
function montar(opcoes: { visitado?: boolean; reduzido?: boolean } = {}) {
  montarIndexHtml();
  const raiz = document.querySelector<HTMLElement>('#app');
  if (!raiz) throw new Error('index.html sem #app');

  const pendentes: { url: string; resolver: (ok: boolean) => void }[] = [];
  const baixadas: string[] = [];
  const imagens: CarregadorDeImagens = {
    baixar(url) {
      baixadas.push(url);
      return new Promise((resolver) => {
        pendentes.push({ url, resolver });
      });
    },
  };
  const esperas: { segundos: number; passar: () => void }[] = [];
  const temporizador: Temporizador = {
    esperar: (segundos) => new Promise((resolver) => esperas.push({ segundos, passar: resolver })),
  };

  let orientacao: Orientacao = 'vertical';
  const giros = new Set<(o: Orientacao) => void>();
  const ambiente: Ambiente = {
    animacaoReduzida: () => opcoes.reduzido ?? false,
    porToque: () => true,
    orientacao: () => orientacao,
    aoMudarOrientacao(escuta) {
      giros.add(escuta);
      return () => {
        giros.delete(escuta);
      };
    },
  };
  const estado: EstadoConvite = criarEstado({
    preferencias: {
      ler: (chave, padrao) => (chave === 'convite:visitado' ? (opcoes.visitado ?? padrao) : padrao),
      gravar: vi.fn(),
    },
    ambiente,
  });
  const eventos = criarBarramento<EventosConvite>();
  const aoTocar = vi.fn();
  eventos.on('entrada:tocou', aoTocar);
  const carregamento = criarCarregamento({ imagens, temporizador, config });
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

  return {
    cena,
    estado,
    aoTocar,
    baixadas,
    el,
    botao,
    /** Conclui todos os downloads em andamento, com sucesso (ou falha, se `ok` for false). */
    concluirImagens(ok = true) {
      for (const pendente of pendentes.splice(0)) pendente.resolver(ok);
    },
    passarEspera(segundos: number) {
      for (const espera of esperas.filter((e) => e.segundos === segundos)) espera.passar();
    },
    girar(nova: Orientacao) {
      orientacao = nova;
      for (const escuta of giros) escuta(nova);
    },
  };
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
      expect(textoDoIndexHtml('.entrada__pular')).toBe(content.dicas.pular);
      expect(document.querySelectorAll('.nevoa > span')).toHaveLength(2);
      expect(document.querySelector('.entrada__tocar')?.hasAttribute('hidden')).toBe(true);
    });

    it('init reescreve os rótulos a partir do content', () => {
      const { cena, el } = montar();
      el('.entrada__nomes').textContent = 'texto antigo';

      cena.init();

      expect(el('.entrada__nomes').textContent).toBe(content.entrada.nomes);
      expect(el('.entrada__pular').textContent).toBe(content.dicas.pular);
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

    it('"Pular para o convite" só aparece a partir da segunda visita (CA-09)', async () => {
      const primeira = montar({ visitado: false });
      primeira.cena.init();
      void primeira.cena.run();
      primeira.concluirImagens();
      await vi.waitFor(() => {
        expect(primeira.el('.entrada__tocar').hidden).toBe(false);
      });
      expect(primeira.el('.entrada__pular').hidden).toBe(true);

      const segunda = montar({ visitado: true });
      segunda.cena.init();
      void segunda.cena.run();
      segunda.concluirImagens();
      await vi.waitFor(() => {
        expect(segunda.el('.entrada__pular').hidden).toBe(false);
      });
    });
  });

  describe('toque', () => {
    async function ateOToque(opcoes: Parameters<typeof montar>[0] = {}) {
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

    it('"Pular" resolve na hora, sem esperar o bosque, e não dispara a entrada', async () => {
      const { botao, aoTocar, execucao } = await ateOToque({ visitado: true });

      botao('.entrada__pular').click();

      expect(aoTocar).toHaveBeenCalledExactlyOnceWith({ escolha: 'pular' });
      await expect(execucao).resolves.toBe('pular');
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
