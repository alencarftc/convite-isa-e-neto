import type { ConfigConvite } from '@/domain/config/config-convite';
import { calcularContagem, formatarContagem } from '@/domain/contagem/contagem-regressiva';
import { calcularEstadoPorData, type EstadoPorData } from '@/domain/contagem/estado-por-data';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import { analisarInstante } from '@/domain/tempo/tempo';

import type { Relogio } from '../ports/relogio';

/** Tudo que o bloco "Informações" precisa saber neste instante (SPEC-07). */
export interface InformacoesDoMomento {
  readonly estado: EstadoPorData;
  /** Texto do cartão de contagem; `null` quando o cartão some. */
  readonly contagem: string | null;
  /** Texto do cartão de agradecimento; `null` enquanto o casamento não passou. */
  readonly agradecimento: string | null;
  /** `aberta`: botão ativo · `encerrada`: aviso de prazo · `oculta`: nada. */
  readonly confirmacao: 'aberta' | 'encerrada' | 'oculta';
  readonly comoChegarVisivel: boolean;
  /** "Salvar na agenda" some junto com "Como chegar", depois do casamento (SPEC-17, RF-17.5). */
  readonly agendaVisivel: boolean;
}

export interface DependenciasObterInformacoes {
  readonly relogio: Relogio;
  readonly config: ConfigConvite;
  readonly conteudo: ConteudoConvite;
}

/**
 * Caso de uso: a partir da hora de Brasília, decide o que o convidado vê abaixo
 * da carta. Retorna uma função, para ser chamada a cada virada de minuto.
 */
export function criarObterInformacoes(
  dependencias: DependenciasObterInformacoes,
): () => InformacoesDoMomento {
  const { relogio, config, conteudo } = dependencias;
  const datas = {
    casamento: analisarInstante(config.casamento),
    prazoConfirmacao: analisarInstante(config.prazoConfirmacao),
  };

  return () => {
    const agora = relogio.agora();
    const estado = calcularEstadoPorData(agora, datas);
    const { antes, noDia, depois, unidades } = conteudo.contagem;

    switch (estado) {
      case 'antes-do-prazo':
        return {
          estado,
          contagem: formatarContagem(calcularContagem(agora, datas.casamento), antes, unidades),
          agradecimento: null,
          confirmacao: 'aberta',
          comoChegarVisivel: true,
          agendaVisivel: true,
        };
      case 'depois-do-prazo':
        return {
          estado,
          contagem: formatarContagem(calcularContagem(agora, datas.casamento), antes, unidades),
          agradecimento: null,
          confirmacao: 'encerrada',
          comoChegarVisivel: true,
          agendaVisivel: true,
        };
      case 'no-dia':
        return {
          estado,
          contagem: noDia,
          agradecimento: null,
          confirmacao: 'encerrada',
          comoChegarVisivel: true,
          agendaVisivel: true,
        };
      case 'depois':
        return {
          estado,
          contagem: null,
          agradecimento: depois,
          confirmacao: 'oculta',
          comoChegarVisivel: false,
          agendaVisivel: false,
        };
    }
  };
}
