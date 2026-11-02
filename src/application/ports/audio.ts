export type NomeDeEfeito = 'fechadura' | 'tampa' | 'selo';

/**
 * Porta de áudio (SPEC-08). Todos os métodos são seguros: se um arquivo falhar ou o navegador
 * recusar o som, o adaptador engole o erro e o convite segue sem ele (RF-08.8).
 */
export interface AudioPort {
  /**
   * Libera o áudio e começa o ambiente. Precisa rodar dentro do gesto do toque de entrada
   * (RF-08.2). `somLigado` define se o som já nasce silenciado.
   */
  desbloquear(somLigado: boolean): void;
  efeito(nome: NomeDeEfeito): void;
  /**
   * A poeira de fada: um fundo suave, em loop, que sobe quando o baú termina de abrir e dura até a cena do baú acabar
   * (`encerrarFada`). Só a primeira chamada vale.
   */
  iniciarFada(): void;
  /** O baú saiu de cena: a poeira de fada esmaece e para. */
  encerrarFada(): void;
  /** Música da história: entra com esmaecimento e o ambiente baixa. */
  musica1(): void;
  /** Música da revelação: a música 1 sai e a 2 entra, uma só vez. Quando termina, o ambiente volta. */
  musica2(): void;
  /** Liga ou silencia tudo; as músicas seguem tocando mudas para ficarem em sincronia. */
  ligar(ligado: boolean): void;
  /** O convidado saiu do convite: silencia e pausa as músicas (RF-08.7). */
  pausar(): void;
  /** O convidado voltou: retoma as músicas de onde pararam; o mudo segue o último `ligar`. */
  retomar(): void;
  /** Modo de segurança: para tudo (SPEC-09, RF-09.8). */
  parar(): void;
}
