import type { CarregadorDeImagens } from '@/application/ports/carregador-de-imagens';

/** O que o adaptador usa de uma imagem; no navegador é um `HTMLImageElement`. */
export interface ImagemDecodificavel {
  src: string;
  fetchPriority: 'high' | 'low' | 'auto';
  decode(): Promise<void>;
}

/**
 * Baixa e decodifica as imagens com `img.decode()` (SPEC-02, RF-02.3): quando a promessa resolve, a
 * imagem já pode ser pintada sem aparecer em pedaços (CA-02.3.2). As imagens ficam guardadas para o
 * navegador não descartar o que acabou de decodificar.
 */
export function criarCarregadorDeImagens(
  criarImagem: () => ImagemDecodificavel = () => new Image(),
): CarregadorDeImagens {
  const guardadas = new Map<string, ImagemDecodificavel>();

  return {
    async baixar(url, prioridade) {
      try {
        const imagem = criarImagem();
        imagem.fetchPriority = prioridade === 'alta' ? 'high' : 'low';
        imagem.src = url;
        await imagem.decode();
        guardadas.set(url, imagem);
        return true;
      } catch {
        return false;
      }
    },
  };
}
