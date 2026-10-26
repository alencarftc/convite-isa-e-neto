import type { ConfigConvite } from '../../src/domain/config/config-convite';
import type { ConteudoConvite } from '../../src/domain/conteudo/conteudo-convite';

/** Escapa texto de elemento: o que o HTML interpretaria (`&`, `<`, `>`). */
export function escapar(texto: string): string {
  return texto.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Escapa valor de atributo: além do texto, as aspas que o fechariam. */
export function escaparAtributo(texto: string): string {
  return escapar(texto).replaceAll('"', '&quot;');
}

/**
 * Estilo do texto simples, o mesmo para o `<noscript>` e para o plano B. Só variáveis dos tokens;
 * o CSS do site é carregado mesmo sem JavaScript.
 */
export const ESTILO_DO_TEXTO_SIMPLES = `
.sem-js { max-width: 560px; padding: var(--espaco-6) var(--espaco-4) var(--espaco-7); margin: 0 auto; text-align: center; color: var(--cor-texto); background: var(--cor-marfim); font-family: var(--fonte-texto); font-size: var(--texto-corpo); }
.sem-js h2 { font-family: var(--fonte-cursiva), var(--fonte-cursiva-reserva); font-size: var(--texto-nomes); font-weight: 400; }
.sem-js p, .sem-js h2, .sem-js h3 { margin: 0 0 var(--espaco-4); }
.sem-js a { display: block; padding: var(--espaco-3); margin: 0 auto var(--espaco-3); max-width: 360px; color: var(--cor-texto); border: 1.5px solid var(--cor-texto); border-radius: 999px; text-decoration: none; }
.sem-js a:first-of-type { color: var(--cor-marfim); background: var(--cor-texto); }
.sem-js figure { margin: 0 0 var(--espaco-5); }
.sem-js img { display: block; width: min(52vw, 200px); min-width: 160px; margin: 0 auto var(--espaco-3); aspect-ratio: 1; object-fit: cover; border-radius: 50%; }
.sem-js figcaption { margin: 0; }
`;

/**
 * A carta em texto simples (blocos 1 a 14 da SPEC-06), o traje, a mensagem e os links de confirmar
 * presença e de como chegar. É a fonte única do `<noscript>` (SPEC-09, RF-09.9) e do plano B
 * (SPEC-15, RF-15.7). Os textos vêm de `content` e os links de `config`; é a única exceção à regra
 * de não escrever texto no HTML (CA-01.2.3), e os testes conferem que os textos são os mesmos.
 *
 * `sufixoDeId` evita ids repetidos quando os dois blocos estão na mesma página.
 */
export function gerarTextoSimples(
  conteudo: ConteudoConvite,
  config: ConfigConvite,
  sufixoDeId: string,
  classesExtras = '',
): string {
  const c = conteudo.carta;
  const p = (classe: string, texto: string) => `<p class="${classe}">${escapar(texto)}</p>`;
  const pais = [...c.paisNoiva, ...c.paisNoivo].map((nome) => p('pai', nome)).join('\n');
  const mensagem = [
    ...conteudo.mensagem.paragrafos,
    conteudo.mensagem.versoLouvor,
    conteudo.mensagem.assinatura,
  ]
    .filter((texto) => texto !== '') // verso vazio: sem parágrafo (SPEC-14, RF-14.5)
    .map((texto) => p('mensagem', texto))
    .join('\n');
  const nomes = `${escapar(c.nomes.noiva)} ${escapar(c.nomes.e)} ${escapar(c.nomes.noivo)}`;
  const historia = conteudo.baloes
    .map((balao) => {
      const foto =
        balao.foto === ''
          ? ''
          : `<img src="${escaparAtributo(balao.foto)}" alt="${escaparAtributo(balao.alt)}" loading="lazy" decoding="async" style="object-position: ${escaparAtributo(balao.foco)}">`;
      return `<figure>
${foto}
<figcaption>${escapar(balao.frase)}</figcaption>
</figure>`;
    })
    .join('\n');
  const idDoTitulo = `carta-titulo-${sufixoDeId}`;
  const classes = classesExtras === '' ? 'sem-js' : `sem-js ${classesExtras}`;

  return `<main class="${classes}">
<article aria-labelledby="${idDoTitulo}">
${p('versiculo', c.versiculo)}
${p('referencia', c.referencia)}
${p('bencao', c.bencao)}
${pais}
<h2 id="${idDoTitulo}">${nomes}</h2>
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
<section aria-label="${escaparAtributo(conteudo.rotulos.historia)}">
${historia}
</section>
<section aria-label="${escaparAtributo(conteudo.rotulos.informacoes)}">
<h3>${escapar(conteudo.rotulos.traje)}</h3>
${p('traje', conteudo.dressCode)}
${mensagem}
<a href="${escaparAtributo(config.links.formulario)}" target="_blank" rel="noopener">${escapar(conteudo.botoes.confirmar)}</a>
${p('prazo', conteudo.botoes.prazo)}
<a href="${escaparAtributo(config.links.mapa)}" target="_blank" rel="noopener">${escapar(conteudo.botoes.comoChegar)}</a>
</section>
</main>`;
}
