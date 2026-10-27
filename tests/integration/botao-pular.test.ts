import { beforeEach, describe, expect, it, vi } from 'vitest';

import { content } from '@/config/content';
import type { Fase } from '@/domain/fase/fase';
import { montarBotaoPular } from '@/presentation/acessibilidade/botao-pular';

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
  document.body.innerHTML = '';
});

function montar() {
  const { estado } = criarEstadoFalso();
  const aoAcionar = vi.fn();
  const remover = montarBotaoPular({
    corpo: document.body,
    conteudo: content,
    estado,
    aoAcionar,
  });
  const botao = () => {
    const encontrado = document.querySelector<HTMLButtonElement>('.botao-pular');
    if (!encontrado) throw new Error('botão "Pular" não encontrado');
    return encontrado;
  };
  return { estado, aoAcionar, remover, botao };
}

describe('"Pular para o convite" sempre à mão (SPEC-14, ADR-0012)', () => {
  it('já na primeira visita fica visível na entrada, no bosque, no baú, na história e no envelope (CT-14.1, RF-14.1)', () => {
    const { estado, botao } = montar();

    expect(botao().hidden).toBe(false); // carregando
    for (const fase of CAMINHO) {
      estado.definirFase(fase);
      expect(botao().hidden, fase).toBe(false);
    }
  });

  it('some nas informações (estado final) e no modo de segurança (CT-14.2, RNF-14.2)', () => {
    const final = montar();
    final.estado.definirFase('informacoes');
    expect(final.botao().hidden).toBe(true);

    document.body.innerHTML = '';
    const seguranca = montar();
    seguranca.estado.definirFase('bosque');
    seguranca.estado.definirFase('seguranca');
    expect(seguranca.botao().hidden).toBe(true);
  });

  it('continua visível depois que a visita é registrada, no fim da abertura', () => {
    const { estado, botao } = montar();
    for (const fase of CAMINHO) estado.definirFase(fase);

    estado.marcarVisitado(); // o que registrarVisita faz quando a carta termina de abrir

    expect(botao().hidden).toBe(false);
  });

  it('o toque aciona o destino, e o texto vem de content.dicas.pular', () => {
    const { aoAcionar, botao } = montar();

    botao().click();

    expect(botao().textContent).toBe(content.dicas.pular);
    expect(aoAcionar).toHaveBeenCalledTimes(1);
  });

  it('é o primeiro elemento do corpo, para ficar logo depois do atalho na ordem do Tab (RF-14.3)', () => {
    document.body.innerHTML = '<div id="app"></div>';

    montar();

    expect(document.body.firstElementChild?.className).toBe('botao-pular');
  });

  it('remover tira o botão e para de reagir às fases', () => {
    const { estado, remover } = montar();

    remover();
    estado.definirFase('bosque');

    expect(document.querySelector('.botao-pular')).toBeNull();
  });
});
