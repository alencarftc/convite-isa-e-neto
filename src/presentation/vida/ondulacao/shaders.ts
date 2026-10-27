/**
 * GLSL do motor de ondulação (SPEC-19). Uma passada, um triângulo que cobre a tela, uma textura: até três
 * senoides e um ruído de valor por pixel (RNF-19.1). Escrito para WebGL 1 (GLSL ES 1.00), que existe no piso
 * de compatibilidade (Safari 15.1, Chrome 90).
 */

/** Quantas elipses o shader aceita (o vento do casal usa duas). */
export const MAXIMO_DE_ELIPSES = 4;

/** Um triângulo grande que cobre o quadro; `v_uv` vai de 0 a 1 na caixa, com o y para baixo como na imagem. */
export const VERTICE = `
attribute vec2 a_pos;
varying vec2 v_uv;

void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

/*
 * Como o fragmento funciona (os comentários ficam aqui, e não no GLSL, para não irem no pacote):
 * - `regiao`: 0 fora da região, 1 dentro, com a transição suave de cada forma (faixa ou elipses).
 * - `faisca`: traços horizontais curtos que acendem e apagam devagar, cada um no seu ritmo.
 * - `coluna`: a luz se concentra numa coluna abaixo do sol, mas ainda há reflexos fora dela.
 * - Perspectiva: no alto da faixa as ondas são miúdas e pequenas; perto da margem, largas e maiores.
 * - As fases das senoides são múltiplos inteiros da fase base: a onda fecha o ciclo sem emenda quando ela volta a 0.
 * - Fora da região o canvas é transparente e a imagem de baixo aparece como sempre foi (sem somar duas vezes a
 *   transparência das bordas da arte); dentro, ele a cobre por inteiro.
 */
export const FRAGMENTO = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 v_uv;

uniform sampler2D u_imagem;
uniform vec2 u_escala;
uniform vec2 u_deslocamento;

uniform vec2 u_faixa;
uniform vec4 u_elipses[${String(MAXIMO_DE_ELIPSES)}];
uniform vec2 u_elipsesExtra[${String(MAXIMO_DE_ELIPSES)}];
uniform int u_nElipses;

uniform vec2 u_caixa;
uniform vec2 u_amplitude;
uniform float u_frequencia;
uniform float u_fase;
uniform float u_perspectiva;
uniform float u_direcao;
uniform float u_forca;
uniform float u_tempo;
uniform float u_cobrirTudo;

uniform float u_reflexos;
uniform vec3 u_corDoBrilho;
uniform float u_densidade;
uniform vec2 u_coluna;
uniform float u_brilho;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float regiao(vec2 uv) {
  float r = 0.0;
  if (u_faixa.y >= 0.0) {
    r = smoothstep(u_faixa.x, u_faixa.x + max(u_faixa.y, 0.0001), uv.y);
  }
  for (int i = 0; i < ${String(MAXIMO_DE_ELIPSES)}; i++) {
    if (i >= u_nElipses) break;
    vec4 e = u_elipses[i];
    vec2 extra = u_elipsesExtra[i];
    float d = length((uv - e.xy) / e.zw);
    r = max(r, (1.0 - smoothstep(1.0 - extra.x, 1.0, d)) * extra.y);
  }
  return r;
}

float faisca(vec2 px) {
  vec2 p = vec2(px.x / 14.0, px.y / 1.6);
  float h = hash(floor(p));
  float limite = 1.0 - u_densidade;
  float ativo = step(limite, h);
  float s = (h - limite) / max(u_densidade, 0.0001);
  float pisca = 0.5 + 0.5 * sin(u_tempo * (0.5 + 1.5 * s) + 6.2832 * fract(s * 7.0));
  float x = fract(p.x);
  float forma = smoothstep(0.0, 0.3, x) * (1.0 - smoothstep(0.7, 1.0, x));
  return ativo * pisca * pisca * forma;
}

float coluna(float x) {
  return mix(0.25, 1.0, 1.0 - smoothstep(0.0, u_coluna.y * 0.5, abs(x - u_coluna.x)));
}

void main() {
  float r = regiao(v_uv);

  float p = 1.0;
  if (u_faixa.y >= 0.0) p = clamp((v_uv.y - u_faixa.x) / (1.0 - u_faixa.x), 0.0, 1.0);
  p = mix(1.0, p, u_perspectiva);
  float f = mix(u_frequencia * 2.0, u_frequencia, p);
  float a = mix(0.5, 1.0, p) * r * u_forca;

  float t = u_fase * 6.2832;
  vec2 c = u_direcao > 0.5 ? v_uv.yx : v_uv;
  float dx = sin(c.y * f * 6.2832 + t)
           + 0.5 * sin(c.y * f * 13.1 - t * 2.0 + c.x * 4.0)
           + 0.3 * sin(c.y * f * 4.7 + t * 3.0 - c.x * 6.0);
  dx /= 1.8;
  vec2 desvio = u_direcao > 0.5 ? vec2(0.2 * dx, dx) : vec2(dx, 0.2 * dx);

  vec2 uv = clamp(v_uv + desvio * u_amplitude * a, 0.0, 1.0);
  vec2 tex = uv * u_escala + u_deslocamento;
  float dentro = step(0.0, tex.x) * step(tex.x, 1.0) * step(0.0, tex.y) * step(tex.y, 1.0);
  vec4 cor = texture2D(u_imagem, clamp(tex, 0.0, 1.0)) * dentro;

  float brilho = u_reflexos * faisca(v_uv * u_caixa) * coluna(v_uv.x) * r * u_brilho;
  cor.rgb += u_corDoBrilho * brilho * cor.a;

  float cobertura = u_cobrirTudo > 0.5 ? 1.0 : clamp(r * 4.0, 0.0, 1.0);
  gl_FragColor = cor * cobertura;
}
`;
