import { describe, expect, it } from 'vitest';

import type { ConfigConvite } from '@/domain/config/config-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import { analisarInstante } from '@/domain/tempo/tempo';

import { criarObterInformacoes } from './obter-informacoes';

const config = {
  casamento: '2027-01-22T17:00:00-03:00',
  prazoConfirmacao: '2026-12-31T23:59:59-03:00',
} as ConfigConvite;

const conteudo: ConteudoConvite = {
  rotulos: {
    informacoes: 'Informações',
    abrirBau: 'Abrir',
    historia: 'História',
    avancarHistoria: 'Avançar',
    abrirEnvelope: 'Abrir',
    mensagem: 'Mensagem',
    traje: 'Traje',
  },
  envelope: { para: 'Para', iniciais: 'I' },
  entrada: { nomes: 'N', tocar: 'T', volume: 'V', aguarde: 'A' },
  dicas: {
    som: 'Som',
    somLigado: 'Som ligado',
    somDesligado: 'Som desligado',
    pular: 'Pular',
    chaveComputador: 'Chave',
    chaveCelular: 'Toque',
    avancar: 'Avançar',
    selo: 'Selo',
    rolar: 'Role',
  },
  carta: {
    versiculo: 'v',
    referencia: 'r',
    bencao: 'b',
    paisNoiva: [],
    paisNoivo: [],
    nomes: { noiva: 'n', e: '&', noivo: 'm' },
    convite: 'c',
    data: 'd',
    cerimonia: 'c',
    local: 'l',
    endereco: 'e',
    fecho: 'f',
    referenciaFecho: 'r',
    despedida: 'd',
    assinatura: 'a',
  },
  mensagem: { paragrafos: [], versoLouvor: 'v', assinatura: 'a' },
  dressCode: 'd',
  baloes: [],
  contagem: {
    antes: 'Faltam {dias}, {horas} e {minutos}',
    noDia: 'É hoje!',
    depois: 'Obrigado!',
    unidades: { dia: ['dia', 'dias'], hora: ['hora', 'horas'], minuto: ['minuto', 'minutos'] },
  },
  botoes: { confirmar: 'c', prazo: 'p', comoChegar: 'm', encerrado: 'e' },
};

function informacoesEm(iso: string) {
  const instante = analisarInstante(iso);
  return criarObterInformacoes({ relogio: { agora: () => instante }, config, conteudo })();
}

describe('criarObterInformacoes', () => {
  it('antes do prazo: contagem, confirmação aberta e mapa', () => {
    expect(informacoesEm('2026-11-15T10:00:00-03:00')).toEqual({
      estado: 'antes-do-prazo',
      contagem: 'Faltam 68 dias, 7 horas e 0 minutos',
      agradecimento: null,
      confirmacao: 'aberta',
      comoChegarVisivel: true,
    });
  });

  it('depois do prazo: contagem continua e a confirmação é encerrada', () => {
    const informacoes = informacoesEm('2027-01-10T12:00:00-03:00');
    expect(informacoes.estado).toBe('depois-do-prazo');
    expect(informacoes.contagem).toContain('Faltam');
    expect(informacoes.confirmacao).toBe('encerrada');
  });

  it('no dia: mensagem "É hoje!" no lugar da contagem', () => {
    expect(informacoesEm('2027-01-22T09:00:00-03:00')).toEqual({
      estado: 'no-dia',
      contagem: 'É hoje!',
      agradecimento: null,
      confirmacao: 'encerrada',
      comoChegarVisivel: true,
    });
  });

  it('depois do casamento: só o agradecimento, sem contagem, botão nem mapa', () => {
    expect(informacoesEm('2027-01-23T00:00:00-03:00')).toEqual({
      estado: 'depois',
      contagem: null,
      agradecimento: 'Obrigado!',
      confirmacao: 'oculta',
      comoChegarVisivel: false,
    });
  });

  it('relê o relógio a cada chamada', () => {
    let agora = analisarInstante('2026-12-31T23:59:00-03:00');
    const obter = criarObterInformacoes({ relogio: { agora: () => agora }, config, conteudo });

    expect(obter().confirmacao).toBe('aberta');
    agora = analisarInstante('2027-01-01T00:00:00-03:00');
    expect(obter().confirmacao).toBe('encerrada');
  });

  it('falha cedo se a configuração tiver data sem fuso', () => {
    expect(() =>
      criarObterInformacoes({
        relogio: { agora: () => 0 },
        config: { ...config, casamento: '2027-01-22T17:00:00' },
        conteudo,
      }),
    ).toThrow(/sem fuso/);
  });
});
