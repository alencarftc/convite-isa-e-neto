import type { BalaoDoConvite } from '@/domain/conteudo/conteudo-convite';

import { adiarImagem } from '../imagens/imagens-tardias';

export interface OpcoesDaFoto {
  /** Classe do contêiner que posiciona o círculo (o tratamento da foto vem de `foto-em-circulo`). */
  readonly classe: string;
  /**
   * Foto abaixo da dobra: o navegador só baixa quando ela se aproxima da tela e decodifica sem
   * travar a rolagem (SPEC-13, RF-13.5). Os balões não usam: a fila secundária já as deixou no cache quando a história começa.
   */
  readonly tardia?: boolean;
  /**
   * O `src` só entra quando a etapa começa (`carregarImagensTardias`): a foto do balão não pode ser
   * baixada no `init()`, antes do toque de entrada (SPEC-02, RF-02.7).
   */
  readonly adiada?: boolean;
}

/**
 * Foto em círculo do casal, o mesmo tratamento nos balões (SPEC-05) e nos cartões da história
 * estática (SPEC-13): tom quente, borda esfumada, sem animar filtro. Se a foto não existir ou falhar,
 * o quadro some e sobra só a frase (SPEC-05, RF-05.9; SPEC-13, RF-13.3).
 */
export function criarFotoEmCirculo(
  balao: BalaoDoConvite,
  { classe, tardia = false, adiada = false }: OpcoesDaFoto,
): HTMLElement | null {
  if (balao.foto === '') return null;
  const quadro = document.createElement('span');
  quadro.className = `foto-em-circulo ${classe}`;
  const imagem = document.createElement('img');
  imagem.alt = balao.alt;
  imagem.style.objectPosition = balao.foco;
  imagem.draggable = false;
  if (tardia) {
    imagem.loading = 'lazy';
    imagem.decoding = 'async';
  }
  imagem.addEventListener(
    'error',
    () => {
      quadro.remove();
    },
    { once: true },
  );
  if (adiada) adiarImagem(imagem, balao.foto);
  else imagem.src = balao.foto;
  quadro.append(imagem);
  return quadro;
}
