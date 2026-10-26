import type { ConfigConvite } from '@/domain/config/config-convite';

/** Datas, links e tempos do convite (SPEC-01). Tempos em segundos. */
export const config: ConfigConvite = {
  casamento: '2027-01-22T17:00:00-03:00',
  prazoConfirmacao: '2026-12-31T23:59:59-03:00',
  links: {
    formulario: 'https://forms.gle/yviZrELgrH2zrRGc7',
    mapa: 'https://www.google.com/maps/search/?api=1&query=R.+Na%C3%A7%C3%B5es+Unidas%2C+407+-+Benevides%2C+PA%2C+68795-000',
  },
  duracoes: {
    nevoa: 3,
    bau: 2,
    balao: 3,
    carta: 3,
    convite: 7,
    esperaSelo: 4,
    dicaChave: 1.5,
    reforcoDica: 8,
    limiteCritico: 8,
    limiteSeguranca: 20,
    novaTentativaDeImagem: 1,
    entradaNomes: 0.6,
    entradaNomesAtraso: 0.2,
    entradaChamada: 0.4,
    entradaSaida: 0.3,
    nevoaEmRepouso: 12,
    avisoDeEspera: 0.3,
  },
  // Arte provisória (docs/decisions/0006): trocar pelos WebP gerados e rodar `pnpm verificar`.
  imagens: {
    ceu: {
      vertical: 'assets/provisorio/ceu-9x16.svg',
      horizontal: 'assets/provisorio/ceu-16x9.svg',
    },
    ceuPorDoSol: {
      vertical: 'assets/provisorio/ceu-por-do-sol-9x16.svg',
      horizontal: 'assets/provisorio/ceu-por-do-sol-16x9.svg',
    },
    lago: {
      vertical: 'assets/provisorio/lago-9x16.svg',
      horizontal: 'assets/provisorio/lago-16x9.svg',
    },
    arvores: {
      vertical: 'assets/provisorio/arvores-9x16.svg',
      horizontal: 'assets/provisorio/arvores-16x9.svg',
    },
    primeiroPlano: {
      vertical: 'assets/provisorio/primeiro-plano-9x16.svg',
      horizontal: 'assets/provisorio/primeiro-plano-16x9.svg',
    },
    bauFechado: 'assets/provisorio/bau-fechado.svg',
    bauAberto: 'assets/provisorio/bau-aberto.svg',
    chave: 'assets/provisorio/chave.svg',
  },
  curvas: { suave: 'sine.inOut', saida: 'power2.out', pouso: 'power3.out' },
  volumes: { ambiente: 0.35, ambienteSobMusica: 0.15, efeitos: 0.8, musica: 0.6 },
  transicoesDeAudio: {
    entradaDoAmbiente: 2,
    ambienteSobMusica: 2,
    musica: 2,
    retornoDoAmbiente: 3,
  },
  musicas: { inicio1: 0, inicio2: 0 },
};
