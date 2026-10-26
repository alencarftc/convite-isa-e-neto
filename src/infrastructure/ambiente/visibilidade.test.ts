import { describe, expect, it, vi } from 'vitest';

import { type DocumentoVisivel, type JanelaComPagina, ouvirSaidaEVolta } from './visibilidade';

function cenario() {
  const documentoAlvo = new EventTarget();
  const janelaAlvo = new EventTarget();
  const documento = Object.assign(documentoAlvo, {
    hidden: false,
  }) as unknown as DocumentoVisivel & {
    hidden: boolean;
  };
  const janela = janelaAlvo as unknown as JanelaComPagina;
  const aoSair = vi.fn();
  const aoVoltar = vi.fn();
  const desligar = ouvirSaidaEVolta(documento, janela, aoSair, aoVoltar);
  return {
    aoSair,
    aoVoltar,
    desligar,
    mudarVisibilidade(escondido: boolean) {
      documento.hidden = escondido;
      documentoAlvo.dispatchEvent(new Event('visibilitychange'));
    },
    disparar: (tipo: 'pagehide' | 'pageshow') => janelaAlvo.dispatchEvent(new Event(tipo)),
  };
}

describe('ouvirSaidaEVolta', () => {
  it('documento oculto avisa a saída; visível de novo avisa a volta (CT-08.5)', () => {
    const { aoSair, aoVoltar, mudarVisibilidade } = cenario();

    mudarVisibilidade(true);
    expect(aoSair).toHaveBeenCalledOnce();
    expect(aoVoltar).not.toHaveBeenCalled();

    mudarVisibilidade(false);
    expect(aoVoltar).toHaveBeenCalledOnce();
  });

  it('pagehide e pageshow também avisam (RF-08.7)', () => {
    const { aoSair, aoVoltar, disparar } = cenario();

    disparar('pagehide');
    disparar('pageshow');

    expect(aoSair).toHaveBeenCalledOnce();
    expect(aoVoltar).toHaveBeenCalledOnce();
  });

  it('a função devolvida desliga todos os ouvintes', () => {
    const { aoSair, aoVoltar, desligar, mudarVisibilidade, disparar } = cenario();

    desligar();
    mudarVisibilidade(true);
    disparar('pagehide');
    disparar('pageshow');

    expect(aoSair).not.toHaveBeenCalled();
    expect(aoVoltar).not.toHaveBeenCalled();
  });
});
