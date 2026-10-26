import type { ConfigConvite } from '@/domain/config/config-convite';

/**
 * Mesma configuração, com os tempos das animações encolhidos: os testes conferem o resultado e a
 * ordem das animações, não quanto elas duram. Distâncias, escalas e contagens ficam como estão.
 */
export function configRapida(original: ConfigConvite, fator = 0.03): ConfigConvite {
  const b = original.bau;
  const esc = (segundos: number) => segundos * fator;
  return {
    ...original,
    duracoes: {
      ...original.duracoes,
      nevoa: esc(original.duracoes.nevoa),
      bau: esc(original.duracoes.bau),
      dicaChave: 0.05,
      reforcoDica: 0.15,
      esmaecimentoReduzido: 0.02,
    },
    movimento: {
      ...original.movimento,
      profundidade: {
        ...original.movimento.profundidade,
        suavizacao: 0.02,
        periodoDaDeriva: 0.2,
      },
    },
    bau: {
      ...b,
      dicaSome: esc(b.dicaSome),
      chaveVaiAteAFechadura: esc(b.chaveVaiAteAFechadura),
      giroDaChave: esc(b.giroDaChave),
      instanteDoSalto: esc(b.instanteDoSalto),
      duracaoDoSalto: esc(b.duracaoDoSalto),
      instanteDaTampa: esc(b.instanteDaTampa),
      duracaoDaTampa: esc(b.duracaoDaTampa),
      instanteDaLuz: esc(b.instanteDaLuz),
      luzSobe: esc(b.luzSobe),
      luzAssenta: esc(b.luzAssenta),
      instanteDaChaveSome: esc(b.instanteDaChaveSome),
      chaveSome: esc(b.chaveSome),
      auraAparece: esc(b.auraAparece),
      chaveAparece: esc(b.chaveAparece),
      flutuacao: { ...b.flutuacao, duracao: esc(b.flutuacao.duracao) },
      brilhoDaChave: { ...b.brilhoDaChave, duracao: esc(b.brilhoDaChave.duracao) },
      pulso: { ...b.pulso, duracao: esc(b.pulso.duracao) },
      reforco: { ...b.reforco, duracao: esc(b.reforco.duracao) },
      petalas: { ...b.petalas, duracao: esc(b.petalas.duracao) },
    },
  };
}
