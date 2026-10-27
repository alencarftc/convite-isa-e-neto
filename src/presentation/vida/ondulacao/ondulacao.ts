import { analisarCor, type CorRgb } from '@/domain/vida/cor';
import { ajusteDeCobertura } from '@/domain/vida/enquadramento';
import type { OndaDeOndulacao, ReflexosDaOndulacao } from '@/domain/vida/ondulacao';
import { type RegiaoDeOndulacao, validarRegiao } from '@/domain/vida/regioes';

import { FRAGMENTO, MAXIMO_DE_ELIPSES, VERTICE } from './shaders';

export interface OpcoesDaOndulacao {
  /** Onde o canvas entra (posicionado, com o tamanho da caixa da imagem). */
  readonly conteiner: HTMLElement;
  /** A fonte da textura: a imagem que o navegador desenhou (`<picture>` escolhe a arte, RF-19.2). */
  readonly imagem: HTMLImageElement;
  /** O `object-fit` da imagem na caixa. */
  readonly ajuste: 'cover' | 'contain';
  readonly regioes: readonly RegiaoDeOndulacao[];
  readonly onda: OndaDeOndulacao;
  readonly reflexos?: ReflexosDaOndulacao;
  /** Teto da densidade do canvas, em múltiplos da densidade da tela (RNF-19.2). */
  readonly resolucao: number;
  /** O canvas cobre a imagem inteira, e não só a região (para quando a imagem de baixo é escondida). */
  readonly cobrirTudo?: boolean;
  /** O contexto se perdeu: quem chamou para tudo e chama `destruir`. Nunca se tenta recuperar (RF-19.7). */
  readonly aoPerderOContexto?: () => void;
}

export interface QuadroDaOndulacao {
  /** Tempo acumulado da animação, em segundos (para quando pausa, o tempo para junto). */
  readonly tempo: number;
  /** Brilho dos reflexos, de 0 a 1. */
  readonly brilho: number;
  /** Multiplica a amplitude, de 0 a 1 (as rajadas de vento do casal, SPEC-22). */
  readonly forca: number;
}

export interface Ondulacao {
  readonly canvas: HTMLCanvasElement;
  /** Desenha um quadro: uma única chamada de desenho (RNF-19.1). */
  desenhar(quadro: QuadroDaOndulacao): void;
  /** Ajusta o canvas ao tamanho atual da caixa e à densidade da tela. */
  redimensionar(): void;
  definirResolucao(resolucao: number): void;
  definirRegioes(regioes: readonly RegiaoDeOndulacao[]): void;
  /** Envia a imagem atual à GPU de novo (o navegador trocou a arte). Devolve `false` se não deu. */
  recarregarTextura(): boolean;
  destruir(): void;
}

/** Período da fase da onda; o tempo dos reflexos dá a volta aqui (segundos): longo o bastante para ninguém notar. */
const VOLTA_DO_TEMPO = 1000;

const COR_PADRAO: CorRgb = [1, 1, 1];

/**
 * Motor de ondulação (SPEC-19): um canvas WebGL 1 por superfície que redesenha uma imagem com ondas, só dentro de
 * regiões (faixa ou elipses) e com reflexos de luz opcionais. Devolve `null` quando não há WebGL (ou o shader
 * não compila): quem chama deixa a imagem parada, como sempre foi. O canvas fica transparente fora da região e a
 * imagem de baixo nunca é escondida por ele (RF-19.6).
 */
export function criarOndulacao(opcoes: OpcoesDaOndulacao): Ondulacao | null {
  const { conteiner, imagem, ajuste, onda, reflexos, cobrirTudo = false } = opcoes;
  let resolucao = opcoes.resolucao;
  let regioes = opcoes.regioes.map(validarRegiao);

  const canvas = document.createElement('canvas');
  canvas.className = 'ondulacao';
  canvas.setAttribute('aria-hidden', 'true');

  const contexto = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
    // Sem WebGL de verdade (software, lista de bloqueio) a imagem parada é melhor que uma água a 5 quadros.
    failIfMajorPerformanceCaveat: true,
  });
  if (!contexto) return null;
  // Sem `null` no tipo: as funções abaixo (declaradas, não setas) não herdam o estreitamento da guarda.
  const gl: WebGLRenderingContext = contexto;

  function compilar(tipo: number, fonte: string): WebGLShader | null {
    const sombreador = gl.createShader(tipo);
    if (!sombreador) return null;
    gl.shaderSource(sombreador, fonte);
    gl.compileShader(sombreador);
    if (gl.getShaderParameter(sombreador, gl.COMPILE_STATUS)) return sombreador;
    gl.deleteShader(sombreador);
    return null;
  }

  const vertice = compilar(gl.VERTEX_SHADER, VERTICE);
  const fragmento = compilar(gl.FRAGMENT_SHADER, FRAGMENTO);
  // O tipo do DOM não admite `null`, mas um contexto já perdido o devolve.
  const programa = gl.createProgram() as WebGLProgram | null;
  if (!vertice || !fragmento || !programa) {
    if (vertice) gl.deleteShader(vertice);
    if (fragmento) gl.deleteShader(fragmento);
    if (programa) gl.deleteProgram(programa);
    return null;
  }
  gl.attachShader(programa, vertice);
  gl.attachShader(programa, fragmento);
  gl.linkProgram(programa);
  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) {
    gl.deleteShader(vertice);
    gl.deleteShader(fragmento);
    gl.deleteProgram(programa);
    return null;
  }
  gl.useProgram(programa);

  // Um triângulo maior que o quadro: cobre tudo com uma passada e sem diagonal.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const posicao = gl.getAttribLocation(programa, 'a_pos');
  gl.enableVertexAttribArray(posicao);
  gl.vertexAttribPointer(posicao, 2, gl.FLOAT, false, 0, 0);

  const textura = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textura);
  // NPOT em WebGL 1: sem mipmap, borda esticada e filtro linear (RNF-19.3).
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const local = new Map<string, WebGLUniformLocation | null>();
  const uniforme = (nome: string): WebGLUniformLocation | null => {
    if (!local.has(nome)) local.set(nome, gl.getUniformLocation(programa, nome));
    return local.get(nome) ?? null;
  };

  const cor = reflexos ? (analisarCor(reflexos.cor) ?? COR_PADRAO) : COR_PADRAO;
  let caixa = { largura: 1, altura: 1 };
  let texturaPronta = false;
  let estaticosDesatualizados = true;
  let destruido = false;

  function enviarTextura(): boolean {
    if (imagem.naturalWidth === 0) return false;
    try {
      gl.bindTexture(gl.TEXTURE_2D, textura);
      // A arte tem bordas transparentes: o desenho é com alfa pré-multiplicado, para não ganhar halo (RNF-19.3).
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imagem);
      texturaPronta = true;
      estaticosDesatualizados = true;
      return true;
    } catch {
      texturaPronta = false;
      return false;
    }
  }

  /** O que só muda com o tamanho, a imagem ou as regiões: vai à GPU uma vez, não a cada quadro. */
  function enviarEstaticos(): void {
    const ajusteDaTextura = ajusteDeCobertura({
      imagem: { largura: imagem.naturalWidth, altura: imagem.naturalHeight },
      caixa,
      ajuste,
    });
    gl.uniform2f(uniforme('u_escala'), ajusteDaTextura.escala[0], ajusteDaTextura.escala[1]);
    gl.uniform2f(
      uniforme('u_deslocamento'),
      ajusteDaTextura.deslocamento[0],
      ajusteDaTextura.deslocamento[1],
    );

    const faixa = regioes.find((regiao) => regiao.tipo === 'faixa');
    // Borda negativa avisa o shader de que não há faixa.
    gl.uniform2f(uniforme('u_faixa'), faixa?.inicio ?? 0, faixa?.borda ?? -1);
    const elipses = regioes
      .filter((regiao) => regiao.tipo === 'elipse')
      .slice(0, MAXIMO_DE_ELIPSES);
    const dados = new Float32Array(MAXIMO_DE_ELIPSES * 4);
    const extras = new Float32Array(MAXIMO_DE_ELIPSES * 2);
    elipses.forEach((elipse, indice) => {
      dados.set([elipse.centro[0], elipse.centro[1], elipse.raio[0], elipse.raio[1]], indice * 4);
      extras.set([elipse.borda, elipse.intensidade], indice * 2);
    });
    gl.uniform4fv(uniforme('u_elipses'), dados);
    gl.uniform2fv(uniforme('u_elipsesExtra'), extras);
    gl.uniform1i(uniforme('u_nElipses'), elipses.length);

    gl.uniform2f(uniforme('u_caixa'), caixa.largura, caixa.altura);
    // Amplitude em pixels de tela, convertida para a caixa: o deslocamento mede o mesmo nos dois eixos.
    gl.uniform2f(
      uniforme('u_amplitude'),
      onda.amplitude / caixa.largura,
      onda.amplitude / caixa.altura,
    );
    gl.uniform1f(uniforme('u_frequencia'), onda.frequencia);
    gl.uniform1f(uniforme('u_perspectiva'), onda.perspectiva);
    gl.uniform1f(uniforme('u_direcao'), onda.direcao === 'vertical' ? 1 : 0);
    gl.uniform1f(uniforme('u_cobrirTudo'), cobrirTudo ? 1 : 0);

    gl.uniform1f(uniforme('u_reflexos'), reflexos ? 1 : 0);
    gl.uniform3f(uniforme('u_corDoBrilho'), cor[0], cor[1], cor[2]);
    gl.uniform1f(uniforme('u_densidade'), reflexos?.densidade ?? 0);
    gl.uniform2f(
      uniforme('u_coluna'),
      reflexos?.colunaDoSol ?? 0.5,
      reflexos?.larguraDaColuna ?? 1,
    );
    gl.uniform1i(uniforme('u_imagem'), 0);
    estaticosDesatualizados = false;
  }

  function redimensionar(): void {
    if (destruido) return;
    const largura = conteiner.clientWidth;
    const altura = conteiner.clientHeight;
    caixa = { largura: Math.max(1, largura), altura: Math.max(1, altura) };
    const escala = Math.min(window.devicePixelRatio || 1, resolucao);
    canvas.width = Math.max(1, Math.round(caixa.largura * escala));
    canvas.height = Math.max(1, Math.round(caixa.altura * escala));
    gl.viewport(0, 0, canvas.width, canvas.height);
    estaticosDesatualizados = true;
  }

  function aoPerderOContexto(): void {
    // Sem `preventDefault`: o navegador não tenta devolver o contexto, e a água fica parada (RF-19.7).
    opcoes.aoPerderOContexto?.();
  }

  function liberar(acao: () => void): void {
    try {
      acao();
    } catch {
      // O contexto pode já ter ido embora: o que importa é soltar o resto.
    }
  }

  canvas.addEventListener('webglcontextlost', aoPerderOContexto);
  conteiner.append(canvas);
  redimensionar();
  enviarTextura();

  return {
    canvas,

    desenhar(quadro) {
      if (destruido || !texturaPronta) return;
      if (estaticosDesatualizados) enviarEstaticos();
      gl.uniform1f(uniforme('u_fase'), (quadro.tempo * onda.velocidade) % 1);
      gl.uniform1f(uniforme('u_tempo'), quadro.tempo % VOLTA_DO_TEMPO);
      gl.uniform1f(uniforme('u_brilho'), quadro.brilho);
      gl.uniform1f(uniforme('u_forca'), quadro.forca);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    redimensionar,

    definirResolucao(nova) {
      resolucao = nova;
      redimensionar();
    },

    definirRegioes(novas) {
      regioes = novas.map(validarRegiao);
      estaticosDesatualizados = true;
    },

    recarregarTextura: enviarTextura,

    destruir() {
      if (destruido) return;
      destruido = true;
      canvas.removeEventListener('webglcontextlost', aoPerderOContexto);
      liberar(() => {
        gl.deleteTexture(textura);
        gl.deleteBuffer(buffer);
        gl.deleteShader(vertice);
        gl.deleteShader(fragmento);
        gl.deleteProgram(programa);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      });
      canvas.remove();
    },
  };
}
