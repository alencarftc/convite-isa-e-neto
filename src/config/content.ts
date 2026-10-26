import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';

/**
 * Todos os textos visíveis ao convidado. A versão aprovada está em
 * docs/requisitos.md, seção "Textos do convite"; mudou lá, muda aqui.
 */
export const content: ConteudoConvite = {
  rotulos: {
    informacoes: 'Informações do casamento',
  },
  dicas: {
    som: 'Som',
    somLigado: 'Som ligado',
    somDesligado: 'Som desligado',
  },
  contagem: {
    antes: 'Faltam {dias}, {horas} e {minutos} para o nosso sim',
    noDia: 'É hoje! Nos vemos às 17h.',
    depois: 'Obrigado por fazer parte da nossa história. Com amor, Isabella & David',
    unidades: {
      dia: ['dia', 'dias'],
      hora: ['hora', 'horas'],
      minuto: ['minuto', 'minutos'],
    },
  },
  botoes: {
    confirmar: 'Confirmar presença',
    prazo: 'Confirme até 31 de dezembro de 2026.',
    comoChegar: 'Como chegar',
    encerrado: 'As confirmações foram encerradas em 31 de dezembro de 2026.',
  },
};
