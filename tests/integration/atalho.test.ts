import { beforeEach, describe, expect, it, vi } from 'vitest';

import { content } from '@/config/content';
import type { Fase } from '@/domain/fase/fase';
import { montarAtalhoParaOConvite } from '@/presentation/acessibilidade/atalho-para-o-convite';

import { criarEstadoFalso } from './suporte/estado-falso';

const CAMINHO: readonly Fase[] = [
  'aguardando-entrada',
  'bosque',
  'aguardando-bau',
  'bau',
  'historia',
  'carta',
  'aguardando-selo',
  'convite',
];

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

function montar() {
  const { estado } = criarEstadoFalso();
  const aoAcionar = vi.fn();
  const remover = montarAtalhoParaOConvite({
    corpo: document.body,
    conteudo: content,
    estado,
    aoAcionar,
  });
  const botao = () => {
    const encontrado = document.querySelector<HTMLButtonElement>('button.atalho');
    if (!encontrado) throw new Error('atalho não encontrado');
    return encontrado;
  };
  return { estado, aoAcionar, remover, botao };
}

describe('"Ir direto ao convite" (SPEC-09, RF-09.4)', () => {
  it('é o primeiro elemento focável da página, com o texto de content.dicas.atalho', () => {
    const { botao } = montar();

    expect(document.body.firstElementChild).toBe(botao());
    expect(botao().textContent).toBe(content.dicas.atalho);
  });

  it('o toque aciona o destino', () => {
    const { aoAcionar, botao } = montar();

    botao().click();

    expect(aoAcionar).toHaveBeenCalledTimes(1);
  });

  it('fica no Tab durante toda a abertura, da entrada ao envelope', () => {
    const { estado, botao } = montar();

    expect(botao().hidden).toBe(false);
    for (const fase of CAMINHO) {
      estado.definirFase(fase);
      expect(botao().hidden, fase).toBe(false);
    }
  });

  it('sai do Tab no estado final e no modo de segurança, onde já não leva a lugar nenhum', () => {
    const final = montar();
    final.estado.definirFase('informacoes');
    expect(final.botao().hidden).toBe(true);

    document.body.innerHTML = '';
    const seguranca = montar();
    seguranca.estado.definirFase('bosque');
    seguranca.estado.definirFase('seguranca');
    expect(seguranca.botao().hidden).toBe(true);
  });

  it('remover tira o botão e para de reagir às fases', () => {
    const { estado, remover } = montar();

    remover();
    estado.definirFase('bosque');

    expect(document.querySelector('button.atalho')).toBeNull();
  });
});
