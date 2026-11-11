import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const pasta = join(import.meta.dirname, '..', '..', 'src', 'styles');
const folha = (nome: string) => readFileSync(join(pasta, `${nome}.css`), 'utf8');

/** O bloco de regras de um seletor (do seletor à primeira chave que fecha), ou '' se não existir. */
function bloco(css: string, seletor: string): string {
  const inicio = css.search(new RegExp(String.raw`(^|\n)${seletor}\s*\{`));
  if (inicio === -1) return '';
  // Sem os comentários: eles explicam o `dvh` que saiu, e a conferência é só das declarações.
  return css.slice(inicio, css.indexOf('}', inicio) + 1).replaceAll(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Com o convite aberto, ao rolar a página a barra de endereço do navegador recolhe e volta; com `100dvh` a cena mudava de altura a cada
 * passo, as camadas se reescalavam e a tela parecia piscar (11/11/2026). A cena, o chão e o conteúdo usam a altura da janela grande
 * (`vh`, que não muda) e a cena e o chão ficam ancorados na borda de baixo.
 */
describe('a cena não se reescala quando a barra de endereço recolhe (11/11/2026)', () => {
  it('a cena tem altura fixa em vh, sem dvh, e fica ancorada na borda de baixo', () => {
    const cena = bloco(folha('bosque'), String.raw`\.cena`);

    expect(cena).not.toBe('');
    expect(cena).toMatch(/height:\s*100vh/);
    expect(cena).not.toMatch(/dvh|svh/);
    expect(cena).toMatch(/inset:\s*auto 0 0/);
  });

  it('a cena não tem clip-path: ela é fixa na janela, e o corte não aparecia (ADR-0047)', () => {
    expect(bloco(folha('bosque'), '[.]cena')).not.toMatch(/clip-path/);
  });

  it('o chão sob a carta é ancorado na borda de baixo, e não por `top: 100%`, que seguia a altura da janela', () => {
    const chao = bloco(folha('carta'), String.raw`\.convite__chao`);

    expect(chao).not.toBe('');
    expect(chao).toMatch(/bottom:\s*calc\(6vh/);
    expect(chao).not.toMatch(/top:\s*calc\(100%/);
    expect(chao).not.toMatch(/dvh|svh/);
  });

  it('o recuo da carta e a altura mínima da página também não dependem da altura dinâmica da janela', () => {
    const conteudo = folha('carta');
    const entradaDaCarta = conteudo
      .slice(conteudo.indexOf('.conteudo {'), conteudo.indexOf('.carta {'))
      .replaceAll(/\/\*[\s\S]*?\*\//g, '');
    expect(entradaDaCarta).toMatch(/58vh/);
    expect(entradaDaCarta).not.toMatch(/dvh/);
    expect(bloco(folha('base'), 'body')).not.toMatch(/dvh/);
  });

  it('no computador o chão continua com a altura da faixa de gramado da pintura', () => {
    const computador = bloco(folha('carta'), String.raw`\.convite__chao--computador`);

    expect(computador).toMatch(/--chao-h:\s*var\(--chao-altura\)/);
  });
});
