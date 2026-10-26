import type { Plugin } from 'vite';

import type { ConfigConvite } from '../../src/domain/config/config-convite';
import type { ConteudoConvite } from '../../src/domain/conteudo/conteudo-convite';
import { PLANO_B } from '../../src/domain/plano-b/plano-b';
import { ESTILO_DO_TEXTO_SIMPLES, gerarTextoSimples } from './texto-simples';

/** Marcadores no `index.html`: o script e o estilo vão no `<head>`, o texto simples no `<body>`. */
export const MARCADOR_DO_HEAD_DO_PLANO_B = '<!--PLANO-B-HEAD-->';
export const MARCADOR_DO_TEXTO_DO_PLANO_B = '<!--PLANO-B-->';

/** Limite de tamanho do script inline (SPEC-15, RF-15.6): ele roda antes de tudo e não pode pesar. */
export const LIMITE_DO_SCRIPT_EM_BYTES = 512;

/**
 * Script inline do `<head>` (SPEC-15, RF-15.6). Sem imports nem GSAP (RNF-15.2), em ES5 para rodar em
 * qualquer navegador. Liga a classe se o pacote não deixar a marca até o limite; se o
 * `<script type="module">` falhar ao carregar (o `error` de recurso não borbulha, por isso a captura
 * no documento); ou se o pacote lançar um erro do próprio site antes de deixar a marca (um erro de
 * extensão do navegador, de outro endereço, não conta). Depois da marca, quem cuida dos erros é o
 * modo de segurança do convite.
 */
export function gerarScriptDoPlanoB(limiteEmSegundos: number): string {
  const { classe, variavel, marca } = PLANO_B;
  const milissegundos = Math.round(limiteEmSegundos * 1000);
  return (
    `(function(d,w){var l=d.documentElement.classList,g=function(){w.${variavel}!=="${marca}"&&l.add("${classe}")};` +
    `setTimeout(g,${milissegundos.toString()});` +
    'w.addEventListener("error",function(e){e.filename&&e.filename.indexOf(w.location.origin)===0&&g()});' +
    'd.addEventListener("error",function(e){e.target.tagName==="SCRIPT"&&g()},true)})(document,window)'
  );
}

/** Alterna entre o convite e o texto simples; as regras de `.sem-js` vêm do texto simples. */
const ESTILO_DO_PLANO_B = `
.plano-b-texto { display: none; }
html.${PLANO_B.classe} .plano-b-texto { display: block; }
html.${PLANO_B.classe} #app { display: none; }${ESTILO_DO_TEXTO_SIMPLES}`;

export function gerarHeadDoPlanoB(config: ConfigConvite): string {
  return `<script>${gerarScriptDoPlanoB(config.duracoes.limitePlanoB)}</script>\n<style>${ESTILO_DO_PLANO_B}</style>`;
}

export function gerarTextoDoPlanoB(conteudo: ConteudoConvite, config: ConfigConvite): string {
  return gerarTextoSimples(conteudo, config, 'plano-b', 'plano-b-texto');
}

/** Plugin do Vite: injeta o script, o estilo e o texto simples do plano B (SPEC-15, RF-15.6 e RF-15.7). */
export function pluginPlanoB(conteudo: ConteudoConvite, config: ConfigConvite): Plugin {
  return {
    name: 'convite-plano-b',
    transformIndexHtml: {
      order: 'pre',
      // Substituição por função: com texto, `$&` e `$'` do conteúdo seriam lidos como padrões.
      handler: (html) =>
        html
          .replace(MARCADOR_DO_HEAD_DO_PLANO_B, () => gerarHeadDoPlanoB(config))
          .replace(MARCADOR_DO_TEXTO_DO_PLANO_B, () => gerarTextoDoPlanoB(conteudo, config)),
    },
  };
}
