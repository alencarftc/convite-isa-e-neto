/**
 * Imagens que só são pedidas quando a etapa que as usa começa (SPEC-02, RF-02.7). Todas as cenas
 * montam o DOM no `init()`, que roda antes do toque de entrada; uma `<img src>` ali começaria a baixar
 * a experiência inteira de uma vez, na frente das imagens críticas e para quem vai pular tudo. A
 * imagem tardia nasce com o endereço em `data-src` e ganha `src` em `carregarImagensTardias`.
 * Depois do toque, a fila secundária do `carregamento` já deixou os arquivos no cache.
 */
const ATRIBUTO = 'data-src';

/** Marca a imagem para carregar depois; o `src` fica de fora até a etapa começar. */
export function adiarImagem(imagem: HTMLImageElement, url: string): HTMLImageElement {
  imagem.setAttribute(ATRIBUTO, url);
  return imagem;
}

/** Pede a imagem agora, se ela ainda estava esperando. */
export function carregarImagemTardia(imagem: HTMLImageElement): void {
  const url = imagem.getAttribute(ATRIBUTO);
  if (url === null) return;
  imagem.src = url;
  imagem.removeAttribute(ATRIBUTO);
}

/** Pede, de uma vez, todas as imagens tardias dentro do contêiner (a etapa começou). */
export function carregarImagensTardias(conteiner: ParentNode): void {
  for (const imagem of conteiner.querySelectorAll<HTMLImageElement>(`img[${ATRIBUTO}]`)) {
    carregarImagemTardia(imagem);
  }
}
