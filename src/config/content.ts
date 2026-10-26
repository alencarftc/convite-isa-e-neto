import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';

/**
 * Todos os textos visíveis ao convidado. A versão aprovada está em
 * docs/requisitos.md, seção "Textos do convite"; mudou lá, muda aqui.
 */
export const content: ConteudoConvite = {
  rotulos: {
    informacoes: 'Informações do casamento',
    abrirBau: 'Abrir o baú',
    historia: 'História do casal',
    avancarHistoria: 'Avançar a história',
  },
  entrada: {
    nomes: 'Isabella & David',
    tocar: 'Toque para entrar',
    volume: 'Para uma experiência completa, aumente o volume.',
    aguarde: 'Preparando o bosque…',
  },
  dicas: {
    som: 'Som',
    somLigado: 'Som ligado',
    somDesligado: 'Som desligado',
    pular: 'Pular para o convite',
    chaveComputador: 'Use a chave para abrir',
    chaveCelular: 'Toque na chave',
    avancar: 'Toque para avançar',
  },
  // Fotos e descrições dependem do casal (SPEC-05, "Questões em aberto"): os colchetes impedem a
  // publicação (`pnpm verificar`) e as fotos apontam para arte provisória.
  baloes: [
    {
      frase: 'Tudo começou de um jeito simples.',
      foto: 'assets/provisorio/foto-1.svg',
      alt: '[descrever a foto 1]',
      foco: '50% 35%',
    },
    {
      frase: 'Viramos amigos, parceiros e um só time.',
      foto: 'assets/provisorio/foto-2.svg',
      alt: '[descrever a foto 2]',
      foco: '50% 35%',
    },
    {
      frase: 'Entre risadas e orações, o amor cresceu.',
      foto: 'assets/provisorio/foto-3.svg',
      alt: '[descrever a foto 3]',
      foco: '50% 35%',
    },
    {
      frase: 'Em Salinas, à beira-mar, veio o pedido.',
      foto: 'assets/provisorio/foto-4.svg',
      alt: '[descrever a foto 4]',
      foco: '50% 35%',
    },
    {
      frase: 'E o nosso sonho ganhou um sim.',
      foto: 'assets/provisorio/foto-5.svg',
      alt: '[descrever a foto 5]',
      foco: '50% 35%',
    },
  ],
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
