import type { CarregadorDeImagens } from '@/application/ports/carregador-de-imagens';
import type { Temporizador } from '@/application/ports/temporizador';
import { criarCarregamento } from '@/application/use-cases/carregamento';
import type { ConfigConvite } from '@/domain/config/config-convite';

/**
 * Carregamento real (o caso de uso) sobre imagens e relógio falsos: cada download fica pendente
 * até o teste concluir, e os limites de tempo só passam quando o teste manda.
 */
export function criarCarregamentoFalso(
  config: ConfigConvite,
  opcoes: { instantaneo?: boolean } = {},
) {
  const pendentes: { url: string; resolver: (ok: boolean) => void }[] = [];
  const baixadas: string[] = [];
  const imagens: CarregadorDeImagens = {
    baixar(url) {
      baixadas.push(url);
      if (opcoes.instantaneo) return Promise.resolve(true);
      return new Promise((resolver) => {
        pendentes.push({ url, resolver });
      });
    },
  };
  const esperas: { segundos: number; passar: () => void }[] = [];
  const temporizador: Temporizador = {
    esperar: (segundos) => new Promise((resolver) => esperas.push({ segundos, passar: resolver })),
  };

  return {
    carregamento: criarCarregamento({ imagens, temporizador, config }),
    baixadas,
    /** Conclui todos os downloads em andamento, com sucesso (ou falha, se `ok` for false). */
    concluirImagens(ok = true) {
      for (const pendente of pendentes.splice(0)) pendente.resolver(ok);
    },
    passarEspera(segundos: number) {
      for (const espera of esperas.filter((e) => e.segundos === segundos)) espera.passar();
    },
  };
}
