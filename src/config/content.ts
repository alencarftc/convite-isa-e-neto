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
    abrirEnvelope: 'Abrir o envelope',
    mensagem: 'Mensagem do casal',
    traje: 'Traje',
  },
  entrada: {
    nomes: 'Isabella & David',
    tocar: 'Toque para entrar',
    volume: 'Para uma experiência completa, aumente o volume.',
    aguarde: 'Preparando o bosque…',
  },
  envelope: {
    para: 'Para você e sua família',
    iniciais: 'I&D',
  },
  dicas: {
    som: 'Som',
    somLigado: 'Som ligado',
    somDesligado: 'Som desligado',
    pular: 'Pular para o convite',
    atalho: 'Ir direto ao convite',
    chaveComputador: 'Use a chave para abrir',
    chaveCelular: 'Toque na chave',
    avancar: 'Toque para avançar',
    selo: 'Toque no selo',
    rolar: 'Role para ler',
  },
  previa: {
    titulo: 'Isabella & David — Convite de casamento',
    descricao: 'Uma carta foi escrita para você. Toque para abrir.',
  },
  carta: {
    versiculo:
      'Melhor é serem dois do que um… e o cordão de três dobras não se quebra tão depressa.',
    referencia: 'Eclesiastes 4:9,12',
    bencao: 'COM A BÊNÇÃO DE DEUS E DE SEUS PAIS',
    paisNoiva: ['Marcelo André Pinto da Silva', 'Elizabete de Farias Vaz'],
    paisNoivo: ['Sara Raquel Coimbra Cardoso', 'Ronaldo Silva Damasceno'],
    nomes: { noiva: 'Isabella Vaz', e: '&', noivo: 'David Neto' },
    convite:
      'Esta carta foi escrita para você e sua família. Transbordando de amor, alegria e gratidão, queremos ter vocês ao nosso lado no dia mais especial da nossa história: o nosso casamento.',
    data: 'SEXTA-FEIRA · 22 DE JANEIRO DE 2027 · 17H',
    cerimonia: 'Cerimônia e recepção',
    local: 'Sítio Olinda — Espaço para Eventos',
    endereco: 'R. Nações Unidas, 407 · Benevides, PA',
    fecho: 'Portanto, o que Deus ajuntou não separe o homem.',
    referenciaFecho: 'Mateus 19:6',
    despedida: 'Com amor,',
    assinatura: 'Isabella & David',
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
  mensagem: {
    paragrafos: [
      'Antes de tudo, agradecemos a Deus. Foi Ele quem uniu os nossos caminhos, cuidou de cada detalhe e transformou um sonho em realidade.',
      'Aprendemos juntos que o amor "tudo sofre, tudo crê, tudo espera, tudo suporta" (1 Coríntios 13:7). É esse amor que queremos celebrar com quem caminhou ao nosso lado.',
      'Você faz parte da nossa história, e a sua presença é o nosso maior presente.',
    ],
    // Pendência do casal: não reproduzimos letra de música (direitos autorais). O `pnpm verificar`
    // barra a publicação enquanto estiver entre colchetes.
    versoLouvor: '[Um verso do louvor escolhido, em itálico, com o nome da música]',
    assinatura: 'Com carinho, Isabella & David',
  },
  dressCode: 'Esporte fino',
  botoes: {
    confirmar: 'Confirmar presença',
    prazo: 'Confirme até 31 de dezembro de 2026.',
    comoChegar: 'Como chegar',
    encerrado: 'As confirmações foram encerradas em 31 de dezembro de 2026.',
  },
};
