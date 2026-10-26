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
  },
  curvas: { suave: 'sine.inOut', saida: 'power2.out', pouso: 'power3.out' },
  volumes: { ambiente: 0.35, ambienteSobMusica: 0.15, efeitos: 0.8, musica: 0.6 },
  musicas: { inicio1: 0, inicio2: 0 },
};
