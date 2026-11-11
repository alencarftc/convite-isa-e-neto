import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Guardas do piscar (11/11/2026, ADR-0050). O convite piscava no Motorola Edge 70 Fusion+ (144 Hz) e a causa não era uma peça só, e sim um
 * padrão: **pedir à GPU do celular mais do que ela aguenta com folga**, e o pior jeito de fazer isso é a mistura (`mix-blend-mode`) em
 * camada grande. Uma peça em mistura obriga o navegador a desenhar tudo o que está embaixo dela num buffer à parte, do tamanho da tela, e a
 * refazê-lo a cada quadro em que algo embaixo muda (a água, as pétalas, a subida da cena). A luz do pôr do sol era uma camada de tela cheia em
 * `soft-light` sobre a cena inteira: tirá-la acabou com o piscar. Estes testes impedem que o padrão volte, na CSS e no JavaScript.
 */

const RAIZ = join(import.meta.dirname, '..', '..');
const PASTA_DOS_ESTILOS = join(RAIZ, 'src', 'styles');

interface Regra {
  readonly arquivo: string;
  readonly seletor: string;
  readonly declaracoes: ReadonlyMap<string, string>;
}

/** Todas as regras das folhas de estilo (as de dentro de `@media` também), sem comentários. */
function lerRegras(): readonly Regra[] {
  const regras: Regra[] = [];
  for (const arquivo of readdirSync(PASTA_DOS_ESTILOS).filter((nome) => nome.endsWith('.css'))) {
    const css = readFileSync(join(PASTA_DOS_ESTILOS, arquivo), 'utf8').replaceAll(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    for (const [, seletor, corpo] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const declaracoes = new Map<string, string>();
      for (const [, nome, valor] of (corpo ?? '').matchAll(/([a-z-]+)\s*:\s*([^;]+);?/g)) {
        if (nome && valor) declaracoes.set(nome.trim(), valor.trim());
      }
      regras.push({ arquivo, seletor: (seletor ?? '').trim(), declaracoes });
    }
  }
  return regras;
}

const regras = lerRegras();
const comDeclaracao = (propriedade: string) =>
  regras.filter((regra) => regra.declaracoes.has(propriedade));

/** Os arquivos de código (sem os testes) da aplicação. */
function lerCodigo(): readonly { arquivo: string; texto: string }[] {
  const achados: { arquivo: string; texto: string }[] = [];
  const percorrer = (pasta: string): void => {
    for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
      const caminho = join(pasta, entrada.name);
      if (entrada.isDirectory()) percorrer(caminho);
      else if (entrada.name.endsWith('.ts') && !entrada.name.endsWith('.test.ts')) {
        achados.push({
          arquivo: caminho.slice(RAIZ.length + 1),
          texto: readFileSync(caminho, 'utf8'),
        });
      }
    }
  };
  percorrer(join(RAIZ, 'src'));
  return achados;
}

describe('o padrão que fazia o convite piscar não volta (ADR-0050)', () => {
  describe('mistura de cores (mix-blend-mode)', () => {
    it('só existe `difference`, e só dentro da carta, que é isolada e já é uma camada à parte', () => {
      const emUso = comDeclaracao('mix-blend-mode').filter(
        (regra) => regra.declaracoes.get('mix-blend-mode') !== 'normal',
      );

      expect(emUso.length).toBeGreaterThan(0); // a tinta da carta (ADR-0016) segue protegida
      for (const regra of emUso) {
        expect(regra.declaracoes.get('mix-blend-mode'), regra.seletor).toBe('difference');
        expect(regra.seletor, `${regra.arquivo}: ${regra.seletor}`).toMatch(/\.carta/);
      }
    });

    it('nenhuma camada da cena, da vida ou de tela cheia mistura com o que está embaixo', () => {
      const grandes = /\.(cena|camada|vida|convite__chao|conteudo|historia|entrada)\b/;
      for (const regra of comDeclaracao('mix-blend-mode')) {
        if (regra.declaracoes.get('mix-blend-mode') === 'normal') continue;
        expect(regra.seletor, regra.seletor).not.toMatch(grandes);
      }
    });

    it('a luz do pôr do sol é uma camada comum, sem mistura (era soft-light sobre a cena inteira)', () => {
      const luz = regras.find((regra) => regra.seletor === '.camada--luz');

      expect(luz).toBeDefined();
      expect(luz?.declaracoes.get('mix-blend-mode') ?? 'normal').toBe('normal');
      expect(luz?.declaracoes.get('background')).toContain('radial-gradient');
    });

    it('o código não escreve mistura pelo JavaScript nem pelo canvas', () => {
      for (const { arquivo, texto } of lerCodigo()) {
        if (arquivo.includes('desenvolvimento')) continue; // o painel de diagnóstico só existe em desenvolvimento
        expect(texto, arquivo).not.toMatch(/mixBlendMode|mix-blend-mode|globalCompositeOperation/);
      }
    });
  });

  describe('efeitos que o navegador refaz a cada quadro', () => {
    it('não há `backdrop-filter` em lugar nenhum: ele lê e desfoca o que está atrás, a cada quadro', () => {
      expect(comDeclaracao('backdrop-filter')).toHaveLength(0);
      expect(comDeclaracao('-webkit-backdrop-filter')).toHaveLength(0);
    });

    it('nenhuma peça grande (a cena, as camadas, a carta aberta, o chão) tem `filter`, exceto a carta, que é uma camada própria', () => {
      const grandes =
        /^\.(cena|camada|vida|convite__chao|conteudo|historia|entrada)([\s.:[>,~+-]|$)/;
      for (const regra of comDeclaracao('filter')) {
        expect(regra.seletor, `${regra.arquivo}: ${regra.seletor}`).not.toMatch(grandes);
      }
    });

    it('o único desfoque é o do fundo do carrossel', () => {
      const comDesfoque = comDeclaracao('filter').filter((regra) =>
        (regra.declaracoes.get('filter') ?? '').includes('blur('),
      );

      expect(comDesfoque.map((regra) => regra.seletor)).toEqual(['.carrossel__fundo']);
    });

    it('a cena não tem máscara nem recorte: o que passa dela já fica fora da tela', () => {
      for (const propriedade of ['mask-image', '-webkit-mask-image', 'clip-path']) {
        for (const regra of comDeclaracao(propriedade)) {
          expect(regra.seletor, `${regra.arquivo}: ${regra.seletor}`).not.toMatch(
            /^\.(cena|camada|vida)\b/,
          );
        }
      }
    });
  });

  describe('trabalho do JavaScript', () => {
    it('o GSAP tem teto de quadros por segundo: em 120 ou 144 Hz não reescreve o estilo a cada quadro da tela', async () => {
      const { config } = await import('@/config/config');

      expect(config.movimento.quadrosMaximosDoGsap).toBeGreaterThanOrEqual(30);
      expect(config.movimento.quadrosMaximosDoGsap).toBeLessThanOrEqual(60);
    });

    it('a água se redesenha a, no máximo, 30 quadros por segundo em qualquer nível', async () => {
      const { config } = await import('@/config/config');

      expect(config.vida.leve.quadrosDaAgua).toBeLessThanOrEqual(30);
      expect(config.vida.completo.quadrosDaAgua).toBeLessThanOrEqual(30);
    });
  });

  describe('camadas de GPU', () => {
    it('o `will-change` só é pedido por JavaScript, pela carta, e nunca pela CSS', () => {
      expect(comDeclaracao('will-change')).toHaveLength(0);
      const quem = lerCodigo()
        .filter(
          ({ arquivo, texto }) =>
            !arquivo.includes('desenvolvimento') &&
            /[.]willChange[ ]*=|willChange[ ]*:|setProperty[(][ ]*['"]will-change/.test(texto),
        )
        .map(({ arquivo }) => arquivo.replaceAll('\\', '/'));

      expect(quem).toEqual(['src/presentation/carta/cena-carta.ts']);
    });
  });
});
