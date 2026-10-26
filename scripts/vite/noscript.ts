import type { Plugin } from 'vite';

import type { ConfigConvite } from '../../src/domain/config/config-convite';
import type { ConteudoConvite } from '../../src/domain/conteudo/conteudo-convite';

/** Marcador no `index.html` que o plugin troca pelo `<noscript>` (SPEC-09, RF-09.9). */
export const MARCADOR_DO_NOSCRIPT = '<!--NOSCRIPT-->';

/** Escapa texto de elemento: o que o HTML interpretaria (`&`, `<`, `>`). */
function escapar(texto: string): string {
  return texto.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Escapa valor de atributo: além do texto, as aspas que o fechariam. */
function escaparAtributo(texto: string): string {
  return escapar(texto).replaceAll('"', '&quot;');
}

/**
 * Estilo mínimo para quem está sem JavaScript: esconde a entrada (névoa e nomes cobririam tudo) e
 * centraliza a carta. Só variáveis dos tokens; o CSS do site é carregado mesmo sem JavaScript.
 */
const ESTILO_SEM_JS = `
.entrada { display: none; }
.sem-js { max-width: 560px; padding: var(--espaco-6) var(--espaco-4) var(--espaco-7); margin: 0 auto; text-align: center; color: var(--cor-texto); background: var(--cor-marfim); font-family: var(--fonte-texto); font-size: var(--texto-corpo); }
.sem-js h2 { font-family: var(--fonte-cursiva), var(--fonte-cursiva-reserva); font-size: var(--texto-nomes); font-weight: 400; }
.sem-js p, .sem-js h2, .sem-js h3 { margin: 0 0 var(--espaco-4); }
.sem-js a { display: block; padding: var(--espaco-3); margin: 0 auto var(--espaco-3); max-width: 360px; color: var(--cor-texto); border: 1.5px solid var(--cor-texto); border-radius: 999px; text-decoration: none; }
.sem-js a:first-of-type { color: var(--cor-marfim); background: var(--cor-texto); }
`;

/**
 * O `<noscript>` (SPEC-09, RF-09.9): a carta em texto simples (blocos 1 a 14 da SPEC-06), o traje e
 * os links de confirmar presença e de como chegar. Os textos vêm de `content` e os links de
 * `config`; é a única exceção à regra de não escrever texto no HTML (CA-01.2.3), e os testes
 * conferem que os textos são os mesmos.
 */
export function gerarNoscript(conteudo: ConteudoConvite, config: ConfigConvite): string {
  const c = conteudo.carta;
  const p = (classe: string, texto: string) => `<p class="${classe}">${escapar(texto)}</p>`;
  const pais = [...c.paisNoiva, ...c.paisNoivo].map((nome) => p('pai', nome)).join('\n');
  const mensagem = [
    ...conteudo.mensagem.paragrafos,
    conteudo.mensagem.versoLouvor,
    conteudo.mensagem.assinatura,
  ]
    .map((texto) => p('mensagem', texto))
    .join('\n');
  const nomes = `${escapar(c.nomes.noiva)} ${escapar(c.nomes.e)} ${escapar(c.nomes.noivo)}`;

  return `<noscript>
<style>${ESTILO_SEM_JS}</style>
<main class="sem-js">
<article aria-labelledby="carta-titulo-sem-js">
${p('versiculo', c.versiculo)}
${p('referencia', c.referencia)}
${p('bencao', c.bencao)}
${pais}
<h2 id="carta-titulo-sem-js">${nomes}</h2>
${p('convite', c.convite)}
${p('data', c.data)}
${p('cerimonia', c.cerimonia)}
${p('local', c.local)}
${p('endereco', c.endereco)}
${p('fecho', c.fecho)}
${p('referencia', c.referenciaFecho)}
${p('despedida', c.despedida)}
${p('assinatura', c.assinatura)}
</article>
<section aria-label="${escaparAtributo(conteudo.rotulos.informacoes)}">
<h3>${escapar(conteudo.rotulos.traje)}</h3>
${p('traje', conteudo.dressCode)}
${mensagem}
<a href="${escaparAtributo(config.links.formulario)}" target="_blank" rel="noopener">${escapar(conteudo.botoes.confirmar)}</a>
${p('prazo', conteudo.botoes.prazo)}
<a href="${escaparAtributo(config.links.mapa)}" target="_blank" rel="noopener">${escapar(conteudo.botoes.comoChegar)}</a>
</section>
</main>
</noscript>`;
}

/** Plugin do Vite: troca o marcador do `index.html` pelo `<noscript>` gerado a partir de `content`. */
export function pluginNoscript(conteudo: ConteudoConvite, config: ConfigConvite): Plugin {
  return {
    name: 'convite-noscript',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(MARCADOR_DO_NOSCRIPT, gerarNoscript(conteudo, config)),
    },
  };
}
