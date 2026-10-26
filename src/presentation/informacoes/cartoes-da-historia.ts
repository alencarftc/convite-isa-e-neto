import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import { criarFotoEmCirculo } from '@/presentation/historia/foto-em-circulo';

export interface DependenciasDaHistoriaEstatica {
  readonly raiz: HTMLElement;
  readonly conteudo: ConteudoConvite;
}

export interface HistoriaEstaticaMontada {
  readonly elemento: HTMLElement;
  /** Remove a seção. */
  destruir(): void;
}

/**
 * "A nossa história" sem animação (SPEC-13): as mesmas fotos e frases dos balões, em cartões
 * marfim logo abaixo da carta, para quem não viu os balões (animação reduzida, "Pular para o
 * convite", modo de segurança). Só `content.baloes`: nenhum texto nem foto novos (RF-13.1), e nenhum
 * título visível. Cada cartão é uma `figure`: o leitor de tela lê a descrição da foto e, depois, a
 * frase (CT-13.7). Foto ausente ou com erro: o cartão fica só com a frase (RF-13.3).
 */
export function montarHistoriaEstatica({
  raiz,
  conteudo,
}: DependenciasDaHistoriaEstatica): HistoriaEstaticaMontada {
  const secao = document.createElement('section');
  secao.className = 'historia-estatica';
  secao.setAttribute('aria-label', conteudo.rotulos.historia);

  const cartoes = conteudo.baloes.map((balao) => {
    const cartao = document.createElement('figure');
    cartao.className = 'cartao historia-estatica__cartao';
    const foto = criarFotoEmCirculo(balao, { classe: 'historia-estatica__foto', tardia: true });
    if (foto) cartao.append(foto);
    const frase = document.createElement('figcaption');
    frase.className = 'historia-estatica__frase';
    frase.textContent = balao.frase;
    cartao.append(frase);
    return cartao;
  });
  secao.append(...cartoes);
  raiz.append(secao);

  return {
    elemento: secao,
    destruir() {
      secao.remove();
    },
  };
}
