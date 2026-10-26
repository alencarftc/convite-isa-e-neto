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
      balao: esc(original.duracoes.balao),
      carta: esc(original.duracoes.carta),
      convite: esc(original.duracoes.convite),
      esperaSelo: esc(original.duracoes.esperaSelo),
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
    carta: {
      ...original.carta,
      pouso: esc(original.carta.pouso),
      sombraEm: esc(original.carta.sombraEm),
      sombra: esc(original.carta.sombra),
      pousouEm: esc(original.carta.pousouEm),
      dicaEm: esc(original.carta.dicaEm),
      dicaAparece: esc(original.carta.dicaAparece),
      pulsoDoSelo: {
        ...original.carta.pulsoDoSelo,
        periodo: esc(original.carta.pulsoDoSelo.periodo),
      },
    },
    convite: {
      ...original.convite,
      dicaSome: esc(original.convite.dicaSome),
      seloCresce: {
        ...original.convite.seloCresce,
        duracao: esc(original.convite.seloCresce.duracao),
      },
      seloParte: {
        ...original.convite.seloParte,
        duracao: esc(original.convite.seloParte.duracao),
      },
      abaEm: esc(original.convite.abaEm),
      aba: esc(original.convite.aba),
      cartaSobeEm: esc(original.convite.cartaSobeEm),
      cartaSobe: esc(original.convite.cartaSobe),
      envelopeDesceEm: esc(original.convite.envelopeDesceEm),
      envelopeDesce: esc(original.convite.envelopeDesce),
      cenaSobeEm: esc(original.convite.cenaSobeEm),
      cenaSobe: esc(original.convite.cenaSobe),
      bauSome: esc(original.convite.bauSome),
      casalEm: esc(original.convite.casalEm),
      casalAparece: esc(original.convite.casalAparece),
      desdobraEm: esc(original.convite.desdobraEm),
      desdobra: esc(original.convite.desdobra),
      blocosEm: esc(original.convite.blocosEm),
      blocosIntervalo: esc(original.convite.blocosIntervalo),
      blocosAparecem: esc(original.convite.blocosAparecem),
      petalasEm: esc(original.convite.petalasEm),
      petalas: { ...original.convite.petalas, duracao: esc(original.convite.petalas.duracao) },
      rolarEm: esc(original.convite.rolarEm),
      rolarAparece: esc(original.convite.rolarAparece),
    },
    historia: {
      ...original.historia,
      saida: esc(original.historia.saida),
      fraseEm: esc(original.historia.fraseEm),
      fraseAparece: esc(original.historia.fraseAparece),
      leituraEm: esc(original.historia.leituraEm),
      leitura: esc(original.historia.leitura),
      subidaFinalEm: esc(original.historia.subidaFinalEm),
      subidaFinal: esc(original.historia.subidaFinal),
      dica: {
        aparece: esc(original.historia.dica.aparece),
        some: esc(original.historia.dica.some),
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
