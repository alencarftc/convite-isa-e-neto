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
      dicaChave: 0.05,
      reforcoDica: 0.15,
      esmaecimentoReduzido: 0.02,
    },
    entrada: {
      ...original.entrada,
      saida: {
        ...original.entrada.saida,
        aperto: {
          ...original.entrada.saida.aperto,
          duracao: esc(original.entrada.saida.aperto.duracao),
        },
        solta: {
          ...original.entrada.saida.solta,
          duracao: esc(original.entrada.saida.solta.duracao),
        },
        brilho: {
          ...original.entrada.saida.brilho,
          duracao: esc(original.entrada.saida.brilho.duracao),
        },
        nomes: {
          ...original.entrada.saida.nomes,
          duracao: esc(original.entrada.saida.nomes.duracao),
        },
        nevoaEm: esc(original.entrada.saida.nevoaEm),
      },
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
      bauSome: esc(original.carta.bauSome),
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
      seloSolta: {
        ...original.convite.seloSolta,
        duracao: esc(original.convite.seloSolta.duracao),
      },
      abaEm: esc(original.convite.abaEm),
      aba: esc(original.convite.aba),
      envelopeDesceEm: esc(original.convite.envelopeDesceEm),
      envelopeDesce: esc(original.convite.envelopeDesce),
      cenaSobeEm: esc(original.convite.cenaSobeEm),
      cenaSobe: esc(original.convite.cenaSobe),
      casalEm: esc(original.convite.casalEm),
      casalAparece: esc(original.convite.casalAparece),
      desdobraEm: esc(original.convite.desdobraEm),
      desdobra: esc(original.convite.desdobra),
      seloBrilho: {
        ...original.convite.seloBrilho,
        duracao: esc(original.convite.seloBrilho.duracao),
      },
      blocosEm: esc(original.convite.blocosEm),
      blocosAparecem: esc(original.convite.blocosAparecem),
      intervaloDosBlocos: esc(original.convite.intervaloDosBlocos),
      rolar: {
        ...original.convite.rolar,
        aparece: esc(original.convite.rolar.aparece),
        periodo: esc(original.convite.rolar.periodo),
      },
    },
    historia: {
      ...original.historia,
      centelhaSobe: esc(original.historia.centelhaSobe),
      cartaoEm: esc(original.historia.cartaoEm),
      cartaoAparece: esc(original.historia.cartaoAparece),
      fraseEm: esc(original.historia.fraseEm),
      fraseAparece: esc(original.historia.fraseAparece),
      respiro: {
        ...original.historia.respiro,
        duracao: esc(original.historia.respiro.duracao),
      },
      cartaoSomeEm: esc(original.historia.cartaoSomeEm),
      poeira: {
        ...original.historia.poeira,
        aparece: esc(original.historia.poeira.aparece),
        duracao: esc(original.historia.poeira.duracao),
      },
      estrela: {
        ...original.historia.estrela,
        sobe: esc(original.historia.estrela.sobe),
        atraso: esc(original.historia.estrela.atraso),
      },
      convergencia: esc(original.historia.convergencia),
    },
    bau: {
      ...b,
      dicaSome: esc(b.dicaSome),
      dica: {
        visivel: esc(b.dica.visivel),
        oculta: esc(b.dica.oculta),
        some: esc(b.dica.some),
      },
      chaveVoa: esc(b.chaveVoa),
      chaveEncaixa: esc(b.chaveEncaixa),
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
      aura: { ...b.aura, periodo: esc(b.aura.periodo) },
      inventarioAparece: esc(b.inventarioAparece),
      inventarioSome: esc(b.inventarioSome),
      balancoNoInventario: {
        ...b.balancoNoInventario,
        duracao: esc(b.balancoNoInventario.duracao),
      },
      brilhoDaChave: { ...b.brilhoDaChave, duracao: esc(b.brilhoDaChave.duracao) },
      pulso: { ...b.pulso, duracao: esc(b.pulso.duracao) },
      reforco: { ...b.reforco, duracao: esc(b.reforco.duracao) },
      petalas: { ...b.petalas, duracao: esc(b.petalas.duracao) },
    },
  };
}
