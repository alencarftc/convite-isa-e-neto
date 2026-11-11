import { describe, expect, it } from 'vitest';

import {
  estiloDasPromocoes,
  estiloDasRegioesOcultas,
  estiloDoCarrosselAntigo,
  estiloDoDiagnostico,
  lerPecasDesligadas,
  lerTetoDeQuadros,
  type PecaDoDiagnostico,
} from './diagnostico-de-piscar';

describe('lerPecasDesligadas', () => {
  it('em desenvolvimento, devolve as peças pedidas em ?sem=', () => {
    const pecas = lerPecasDesligadas({ desenvolvimento: true, busca: '?sem=agua,deriva,mascaras' });
    expect([...pecas].sort()).toEqual(['agua', 'deriva', 'mascaras']);
  });

  it('?sem=tudo desliga todas as peças', () => {
    const pecas = lerPecasDesligadas({ desenvolvimento: true, busca: '?sem=tudo' });
    expect(pecas.has('agua')).toBe(true);
    expect(pecas.has('mistura')).toBe(true);
    expect(pecas.has('aura')).toBe(true);
  });

  it('os grupos js, css e vida desligam várias peças de uma vez', () => {
    const js = lerPecasDesligadas({ desenvolvimento: true, busca: '?sem=js' });
    expect(js.has('agua') && js.has('petalas') && js.has('deriva')).toBe(true);
    expect(js.has('mascaras')).toBe(false);

    const css = lerPecasDesligadas({ desenvolvimento: true, busca: '?sem=css' });
    expect(css.has('mascaras') && css.has('mistura') && css.has('sombradacarta')).toBe(true);
    expect(css.has('agua')).toBe(false);

    const vida = lerPecasDesligadas({ desenvolvimento: true, busca: '?sem=vida,petalas' });
    expect([...vida].sort()).toEqual(['agua', 'esquilo', 'folhas', 'passaros', 'petalas']);
  });

  it('em produção, ignora ?sem= (o diagnóstico não existe lá)', () => {
    expect(lerPecasDesligadas({ desenvolvimento: false, busca: '?sem=tudo' }).size).toBe(0);
  });

  it.each(['', '?data=2027-01-22T10:00', '?sem=', '?sem=nada,outra'])(
    'não desliga nada para a busca "%s"',
    (busca) => {
      expect(lerPecasDesligadas({ desenvolvimento: true, busca }).size).toBe(0);
    },
  );
});

describe('lerTetoDeQuadros', () => {
  it('em desenvolvimento, devolve o teto de ?fps=', () => {
    expect(lerTetoDeQuadros({ desenvolvimento: true, busca: '?fps=60' })).toBe(60);
  });

  it('em produção ou com valor inválido, devolve null', () => {
    expect(lerTetoDeQuadros({ desenvolvimento: false, busca: '?fps=60' })).toBeNull();
    expect(lerTetoDeQuadros({ desenvolvimento: true, busca: '?fps=abc' })).toBeNull();
    expect(lerTetoDeQuadros({ desenvolvimento: true, busca: '?fps=1' })).toBeNull();
    expect(lerTetoDeQuadros({ desenvolvimento: true, busca: '' })).toBeNull();
  });
});

describe('estiloDoDiagnostico', () => {
  it('só traz a CSS das peças desligadas', () => {
    const css = estiloDoDiagnostico(new Set<PecaDoDiagnostico>(['mascaras', 'clip']));
    expect(css).toContain('mask-image: none');
    expect(css).toContain('clip-path: none');
    expect(css).not.toContain('filter: none');
  });

  it('a peça aura esconde a aura, a dica e o inventário do baú', () => {
    expect(estiloDoDiagnostico(new Set<PecaDoDiagnostico>(['aura']))).toContain('.inventario');
  });

  it('sem peças, não há CSS', () => {
    expect(estiloDoDiagnostico(new Set())).toBe('');
  });

  it('a peça sombradacarta tira só o filtro da carta, sem tocar nos outros filtros', () => {
    const css = estiloDoDiagnostico(new Set<PecaDoDiagnostico>(['sombradacarta']));
    expect(css).toBe('.carta { filter: none !important; }');
  });

  it('as peças do carrossel desligam o fundo desfocado, os cantos e a sombra do quadro', () => {
    const css = estiloDoDiagnostico(new Set<PecaDoDiagnostico>(['fundo', 'cantos', 'sombra']));
    expect(css).toContain('.carrossel__fundo { display: none');
    expect(css).toContain('border-radius: 0');
    expect(css).toContain('box-shadow: none');
  });
});

describe('chaves das mudanças de 11/11/2026', () => {
  it('?sem=glow esconde o glow do envelope, e só ele', () => {
    const pecas = lerPecasDesligadas({ desenvolvimento: true, busca: '?sem=glow' });

    expect([...pecas]).toEqual(['glow']);
    expect(estiloDoDiagnostico(pecas)).toBe('.envelope__aura { display: none !important; }');
  });

  it('?com=dvh volta a cena à altura dinâmica ancorada em cima e o chão ao top: 100%', () => {
    const css = estiloDasPromocoes({ desenvolvimento: true, busca: '?com=dvh' });

    expect(css).toContain('.cena { inset: 0 !important; height: 100dvh !important; }');
    expect(css).toContain('top: calc(100% + var(--sobra-da-cena) - 6vh) !important');
    expect(css).toContain('bottom: auto !important');
  });

  it('?sem=css e ?sem=tudo incluem o glow', () => {
    expect(lerPecasDesligadas({ desenvolvimento: true, busca: '?sem=css' }).has('glow')).toBe(true);
    expect(lerPecasDesligadas({ desenvolvimento: true, busca: '?sem=tudo' }).has('glow')).toBe(
      true,
    );
  });
});

describe('estiloDasRegioesOcultas', () => {
  it('em desenvolvimento, ?ocultar= esconde só as regiões pedidas', () => {
    const css = estiloDasRegioesOcultas({ desenvolvimento: true, busca: '?ocultar=carta,botoes' });
    expect(css).toContain('.carta { visibility: hidden !important; }');
    expect(css).toContain('.botao-som');
    expect(css).not.toContain('.carrossel');
  });

  it('em produção, sem o parâmetro ou com nome desconhecido, não há CSS', () => {
    expect(estiloDasRegioesOcultas({ desenvolvimento: false, busca: '?ocultar=cena' })).toBe('');
    expect(estiloDasRegioesOcultas({ desenvolvimento: true, busca: '' })).toBe('');
    expect(estiloDasRegioesOcultas({ desenvolvimento: true, busca: '?ocultar=nada' })).toBe('');
  });
});

describe('estiloDasPromocoes', () => {
  it('em desenvolvimento, ?com= dá camada própria às peças pedidas', () => {
    const css = estiloDasPromocoes({ desenvolvimento: true, busca: '?com=carta,cena' });
    expect(css).toContain('.carta { will-change: transform, opacity !important; }');
    expect(css).toContain('.cena { will-change: transform !important; }');
    expect(css).not.toContain('.convite__chao');
  });

  it('em produção, sem o parâmetro ou com nome desconhecido, não há CSS', () => {
    expect(estiloDasPromocoes({ desenvolvimento: false, busca: '?com=carta' })).toBe('');
    expect(estiloDasPromocoes({ desenvolvimento: true, busca: '' })).toBe('');
    expect(estiloDasPromocoes({ desenvolvimento: true, busca: '?com=outra' })).toBe('');
  });
});

describe('estiloDoCarrosselAntigo', () => {
  it('em desenvolvimento, ?velho=carrossel devolve as camadas permanentes de antes', () => {
    const css = estiloDoCarrosselAntigo({ desenvolvimento: true, busca: '?velho=carrossel' });
    expect(css).toContain('.carrossel__slide { will-change: transform, opacity !important');
    expect(css).toContain('.carrossel__foto { will-change: transform !important');
  });

  it('em produção ou sem o parâmetro, não há CSS', () => {
    expect(estiloDoCarrosselAntigo({ desenvolvimento: false, busca: '?velho=carrossel' })).toBe('');
    expect(estiloDoCarrosselAntigo({ desenvolvimento: true, busca: '' })).toBe('');
  });
});
