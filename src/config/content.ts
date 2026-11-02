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
    abrirEnvelope: 'Abrir o envelope',
    mensagem: 'Mensagem do casal',
    galeria: 'Fotos do casal',
    traje: 'Traje',
  },
  entrada: {
    nomes: 'Isabella & David',
    tocar: 'Toque para entrar',
    volume: 'Para uma experiência completa, aumente o volume.',
    aguarde: 'Preparando o bosque…',
  },
  envelope: {
    iniciais: 'I&D',
  },
  dicas: {
    som: 'Som',
    somLigado: 'Som ligado',
    somDesligado: 'Som desligado',
    pular: 'Pular para o convite',
    atalho: 'Ir direto ao convite',
    chaveComputador: 'Clique no baú para usar a chave',
    chaveCelular: 'Toque no baú para usar a chave',
    selo: 'Toque no selo',
    rolar: 'Role para ler',
    // Texto novo da cena viva (SPEC-18, US-13.6), ainda sem a aprovação do casal: entre colchetes, o `pnpm verificar` barra a publicação.
    pausarAnimacao: '[Pausar animação]',
    retomarAnimacao: '[Retomar animação]',
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
  // Fotos dos balões: pendentes (as do casal ainda não chegaram; as provisórias saíram em 31/10/2026). Sem foto
  // (`foto: ''`), a frase vive dentro da nuvem. Quando chegarem, preencha `foto`, `alt` (descrição) e `foco`.
  baloes: [
    {
      frase: 'Tudo começou de um jeito simples.',
      foto: '',
      alt: '',
      foco: '',
    },
    {
      frase: 'Viramos amigos, parceiros e um só time.',
      foto: '',
      alt: '',
      foco: '',
    },
    {
      frase: 'Entre risadas e orações, o amor cresceu.',
      foto: '',
      alt: '',
      foco: '',
    },
    {
      frase: 'Em Salinas, à beira-mar, veio o pedido.',
      foto: '',
      alt: '',
      foco: '',
    },
    {
      frase: 'E o nosso sonho ganhou um sim.',
      foto: '',
      alt: '',
      foco: '',
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
  // Mini-galeria do casal (02/11/2026), abaixo da mensagem. Os arquivos são os de `public/photos/`.
  galeria: [
    {
      foto: 'photos/galeria-1.webp',
      alt: 'O pedido de casamento na praia: ele ajoelhado, com a caixinha da aliança, e ela emocionada, com a mão no rosto.',
      largura: 533,
      altura: 800,
    },
    {
      foto: 'photos/galeria-2.webp',
      alt: 'O casal sentado num balanço de madeira, num parque: ela sorri de olhos fechados e ele a beija no rosto.',
      largura: 800,
      altura: 600,
    },
    {
      foto: 'photos/galeria-3.webp',
      alt: 'Selfie do casal, lado a lado, sorrindo, num restaurante.',
      largura: 800,
      altura: 450,
    },
    {
      foto: 'photos/galeria-4.webp',
      alt: 'Selfie do casal: ela encosta a cabeça nele e faz biquinho, e ele sorri de leve.',
      largura: 450,
      altura: 800,
    },
    {
      foto: 'photos/galeria-5.webp',
      alt: 'Selfie do casal de boné, no balanço do parque, ele beijando o rosto dela.',
      largura: 800,
      altura: 600,
    },
    {
      foto: 'photos/galeria-6.webp',
      alt: 'Selfie do casal à mesa de um restaurante, sorrindo, ela com uma bebida verde na mão.',
      largura: 600,
      altura: 800,
    },
  ],
  dressCode: 'Esporte fino',
  botoes: {
    confirmar: 'Confirmar presença',
    prazo: 'Confirme até 31 de dezembro de 2026.',
    comoChegar: 'Como chegar',
    // Texto novo (SPEC-17), ainda sem aprovação do casal: ver docs/specs-adicionais/SPEC-17-salvar-na-agenda.md.
    agenda: 'Salvar na agenda',
    encerrado: 'As confirmações foram encerradas em 31 de dezembro de 2026.',
  },
};
