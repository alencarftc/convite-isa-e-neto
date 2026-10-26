import type { Plugin } from 'vite';

import type { ConfigConvite } from '../../src/domain/config/config-convite';
import type { ConteudoConvite } from '../../src/domain/conteudo/conteudo-convite';
import { ESTILO_DO_TEXTO_SIMPLES, gerarTextoSimples } from './texto-simples';

/** Marcador no `index.html` que o plugin troca pelo `<noscript>` (SPEC-09, RF-09.9). */
export const MARCADOR_DO_NOSCRIPT = '<!--NOSCRIPT-->';

/** Para quem está sem JavaScript, a entrada (névoa e nomes) cobriria tudo: some. */
const ESTILO_SEM_JS = `
.entrada { display: none; }${ESTILO_DO_TEXTO_SIMPLES}`;

/**
 * O `<noscript>` (SPEC-09, RF-09.9): a carta em texto simples, o traje e os links de confirmar
 * presença e de como chegar, o mesmo bloco que o plano B mostra (SPEC-15).
 */
export function gerarNoscript(conteudo: ConteudoConvite, config: ConfigConvite): string {
  return `<noscript>
<style>${ESTILO_SEM_JS}</style>
${gerarTextoSimples(conteudo, config, 'sem-js')}
</noscript>`;
}

/** Plugin do Vite: troca o marcador do `index.html` pelo `<noscript>` gerado a partir de `content`. */
export function pluginNoscript(conteudo: ConteudoConvite, config: ConfigConvite): Plugin {
  return {
    name: 'convite-noscript',
    transformIndexHtml: {
      order: 'pre',
      // Substituição por função: com texto, `$&` e `$'` do conteúdo seriam lidos como padrões.
      handler: (html) => html.replace(MARCADOR_DO_NOSCRIPT, () => gerarNoscript(conteudo, config)),
    },
  };
}
