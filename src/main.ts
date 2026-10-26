/**
 * Raiz de composição: o único lugar que conhece todas as camadas. Instancia os
 * adaptadores de infraestrutura e os entrega aos casos de uso e à apresentação.
 */
import './styles/tokens.css';
import './styles/base.css';
import './styles/informacoes.css';

import { criarBarramento } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import { comErroForcado } from '@/application/cena-com-erro-forcado';
import { criarEstado } from '@/application/estado-convite';
import { criarObterInformacoes } from '@/application/use-cases/obter-informacoes';
import { criarOrquestrador, type EtapaDoConvite } from '@/application/use-cases/orquestrador';
import { config } from '@/config/config';
import { content } from '@/config/content';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { criarAmbienteDoNavegador } from '@/infrastructure/ambiente/ambiente-do-navegador';
import {
  criarPreferencias,
  obterLocalStorageSeguro,
} from '@/infrastructure/armazenamento/preferencias-local-storage';
import { lerErroForcado } from '@/infrastructure/desenvolvimento/erro-forcado';
import { ouvirErrosGlobais } from '@/infrastructure/erros/erros-globais';
import { criarRelogio } from '@/infrastructure/relogio/relogio';
import { refletirFaseNoCorpo } from '@/presentation/fase-no-corpo';
import { criarCenaInformacoes } from '@/presentation/informacoes/cena-informacoes';

const raiz = document.querySelector<HTMLElement>('#app');
if (!raiz) throw new Error('Elemento #app não encontrado no index.html');

const desenvolvimento = import.meta.env.DEV;
const busca = window.location.search;

const relogio = criarRelogio({ desenvolvimento, busca });
const estado = criarEstado({
  preferencias: criarPreferencias(obterLocalStorageSeguro()),
  ambiente: criarAmbienteDoNavegador(window),
});
const eventos = criarBarramento<EventosConvite>();
const pararDeRefletirFase = refletirFaseNoCorpo(estado, document.body);

// ?erro=<cena> (só em desenvolvimento) faz a cena indicada falhar, para provar o modo de segurança.
const erroForcado = lerErroForcado({ desenvolvimento, busca });
function naCena<R>(nome: string, cena: Cena<R>): Cena<R> {
  return erroForcado === nome ? comErroForcado(nome, cena) : cena;
}

// Cada spec de cena (SPEC-02 a SPEC-06) acrescenta a sua aqui, na ordem do caminho.
const etapas: readonly EtapaDoConvite[] = [];

const orquestrador = criarOrquestrador({
  plano: {
    etapas: etapas.map((etapa) => ({ ...etapa, cena: naCena(etapa.nome, etapa.cena) })),
    final: naCena(
      'informacoes',
      criarCenaInformacoes({
        raiz,
        conteudo: content,
        config,
        relogio,
        obterInformacoes: criarObterInformacoes({ relogio, config, conteudo: content }),
      }),
    ),
  },
  estado,
  eventos,
  registrarErro: (erro) => {
    console.error('[convite] modo de segurança', erro);
  },
});

const pararDeOuvirErros = ouvirErrosGlobais(window, (erro) => {
  orquestrador.falhar(erro);
});
void orquestrador.iniciar();

// Recarga a quente do Vite: desfaz tudo antes de montar de novo, para não duplicar cenas.
import.meta.hot?.dispose(() => {
  pararDeOuvirErros();
  orquestrador.destruir();
  pararDeRefletirFase();
  estado.destruir();
});
