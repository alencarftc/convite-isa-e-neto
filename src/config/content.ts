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
    fotoDaGaleria: 'Foto {n} de {total}',
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
      frase: 'Deus foi cuidando de cada detalhe.',
      foto: '',
      alt: '',
      foco: '',
    },
    {
      frase: 'Aos poucos, a amizade virou amor.',
      foto: '',
      alt: '',
      foco: '',
    },
    {
      frase: 'E o que era sonho virou promessa.',
      foto: '',
      alt: '',
      foco: '',
    },
    {
      frase: 'E queremos celebrar essa promessa com você.',
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
  // Carrossel de fotos do casal (ensaio, 09/11/2026), abaixo da mensagem. Os arquivos são os de `public/photos/`.
  galeria: [
    {
      foto: 'photos/galeria-1.webp',
      alt: 'Foto em preto e branco: o casal de branco, de mãos dadas e bem juntinhos, ela sorrindo de olhos baixos.',
      largura: 508,
      altura: 900,
    },
    {
      foto: 'photos/galeria-2.webp',
      alt: 'O casal de branco, abraçado e sorrindo para a câmera, ela com a mão no ombro dele.',
      largura: 601,
      altura: 900,
    },
    {
      foto: 'photos/galeria-3.webp',
      alt: 'O casal de branco abraçado numa passarela cercada de folhagem: ele beija o rosto dela, que sorri de olhos fechados.',
      largura: 601,
      altura: 900,
    },
    {
      foto: 'photos/galeria-4.webp',
      alt: 'O casal de branco num beco: ele olha para ela, que se inclina sobre o ombro dele com um sorriso discreto.',
      largura: 900,
      altura: 601,
    },
    {
      foto: 'photos/galeria-5.webp',
      alt: 'O casal de branco num beco de paredes antigas: ela sorri para a câmera e ele a beija no rosto.',
      largura: 900,
      altura: 601,
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
