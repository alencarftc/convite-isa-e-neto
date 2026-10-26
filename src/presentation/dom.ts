import { adiarImagem } from './imagens/imagens-tardias';

/** Elemento com classe e, se vier, texto (`textContent`: nunca HTML). */
export function criar(tag: string, classe: string, texto?: string): HTMLElement {
  const elemento = document.createElement(tag);
  elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

/**
 * Imagem decorativa (`alt` vazio, sem arrastar). `adiada`: o `src` só entra quando a etapa começa
 * (`carregarImagensTardias`), para a cena não baixar a experiência inteira no `init()` (SPEC-02,
 * RF-02.7).
 */
export function criarImagem(classe: string, url: string, adiada = false): HTMLImageElement {
  const imagem = document.createElement('img');
  imagem.className = classe;
  if (adiada) adiarImagem(imagem, url);
  else imagem.src = url;
  imagem.alt = '';
  imagem.draggable = false;
  return imagem;
}
