import { describe, expect, it, vi } from 'vitest';

import { type JanelaDeErros, ouvirErrosGlobais } from './erros-globais';

const ORIGEM = 'https://convite.example';

/** Janela falsa: um `EventTarget` do Node com `location`, e eventos com os campos que o navegador traz. */
function janelaFalsa() {
  const alvo = new EventTarget();
  const janela = Object.assign(alvo, { location: { origin: ORIGEM } }) as unknown as JanelaDeErros;
  return {
    janela,
    erro(filename: string, campos: { error?: unknown; message?: string } = {}) {
      alvo.dispatchEvent(
        Object.assign(new Event('error'), { filename, message: 'mensagem', ...campos }),
      );
    },
    rejeicao(reason: unknown) {
      alvo.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason }));
    },
  };
}

describe('ouvirErrosGlobais', () => {
  it('um erro de arquivo do próprio site chama o modo de segurança com o erro original', () => {
    const { janela, erro } = janelaFalsa();
    const aoFalhar = vi.fn();
    ouvirErrosGlobais(janela, aoFalhar);
    const causa = new Error('boom');

    erro(`${ORIGEM}/assets/index.js`, { error: causa });

    expect(aoFalhar).toHaveBeenCalledWith(causa);
  });

  it('sem objeto de erro, usa a mensagem', () => {
    const { janela, erro } = janelaFalsa();
    const aoFalhar = vi.fn();
    ouvirErrosGlobais(janela, aoFalhar);

    erro(`${ORIGEM}/assets/index.js`);

    expect(aoFalhar).toHaveBeenCalledWith('mensagem');
  });

  it.each(['chrome-extension://abc/content.js', 'https://terceiro.example/x.js', ''])(
    'ignora erro vindo de "%s" (extensão ou script de terceiros)',
    (arquivo) => {
      const { janela, erro } = janelaFalsa();
      const aoFalhar = vi.fn();
      ouvirErrosGlobais(janela, aoFalhar);

      erro(arquivo, { error: new Error('de fora') });

      expect(aoFalhar).not.toHaveBeenCalled();
    },
  );

  it('promessa rejeitada sem tratamento: modo de segurança com o motivo', () => {
    const { janela, rejeicao } = janelaFalsa();
    const aoFalhar = vi.fn();
    ouvirErrosGlobais(janela, aoFalhar);
    const motivo = new Error('rejeitada');

    rejeicao(motivo);

    expect(aoFalhar).toHaveBeenCalledWith(motivo);
  });

  it('a função devolvida desliga os dois ouvintes', () => {
    const { janela, erro, rejeicao } = janelaFalsa();
    const aoFalhar = vi.fn();
    const desligar = ouvirErrosGlobais(janela, aoFalhar);

    desligar();
    erro(`${ORIGEM}/a.js`, { error: new Error('x') });
    rejeicao(new Error('y'));

    expect(aoFalhar).not.toHaveBeenCalled();
  });
});
