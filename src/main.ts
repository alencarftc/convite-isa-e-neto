/**
 * Raiz de composição: o único lugar que conhece todas as camadas. Instancia os
 * adaptadores de infraestrutura e os entrega aos casos de uso e à apresentação.
 */
import './styles/tokens.css';
import './styles/fontes.css';
import './styles/base.css';
import './styles/entrada.css';
import './styles/informacoes.css';
import './styles/botao-som.css';

import { Howl, Howler } from 'howler';

import { criarBarramento } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import { comErroForcado } from '@/application/cena-com-erro-forcado';
import { criarEstado } from '@/application/estado-convite';
import { conectarAudio } from '@/application/use-cases/audio-do-convite';
import { criarCarregamento } from '@/application/use-cases/carregamento';
import { criarObterInformacoes } from '@/application/use-cases/obter-informacoes';
import { criarOrquestrador, type EtapaDoConvite } from '@/application/use-cases/orquestrador';
import { config } from '@/config/config';
import { content } from '@/config/content';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { criarAmbienteDoNavegador } from '@/infrastructure/ambiente/ambiente-do-navegador';
import { ouvirSaidaEVolta } from '@/infrastructure/ambiente/visibilidade';
import {
  criarPreferencias,
  obterLocalStorageSeguro,
} from '@/infrastructure/armazenamento/preferencias-local-storage';
import { criarAudioHowler, obterSessaoDeAudio } from '@/infrastructure/audio/audio-howler';
import { lerErroForcado } from '@/infrastructure/desenvolvimento/erro-forcado';
import { ouvirErrosGlobais } from '@/infrastructure/erros/erros-globais';
import { criarCarregadorDeImagens } from '@/infrastructure/imagens/carregador-de-imagens';
import { criarRelogio } from '@/infrastructure/relogio/relogio';
import { criarTemporizador } from '@/infrastructure/tempo/temporizador';
import { montarBotaoSom } from '@/presentation/audio/botao-som';
import { criarCenaEntrada } from '@/presentation/entrada/cena-entrada';
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

// Áudio (SPEC-08): os arquivos só são criados no toque de entrada; o botão de som fica sempre à vista.
const audioDoConvite = conectarAudio({
  audio: criarAudioHowler({
    biblioteca: { Howl, Howler },
    config,
    avisar: (erro) => {
      console.warn('[convite] som indisponível', erro);
    },
    sessaoDeAudio: obterSessaoDeAudio(navigator),
  }),
  eventos,
  estado,
  avisar: (erro) => {
    console.warn('[convite] som indisponível', erro);
  },
});
const pararDeOuvirSaidaEVolta = ouvirSaidaEVolta(
  document,
  window,
  () => {
    audioDoConvite.aoSair();
  },
  () => {
    audioDoConvite.aoVoltar();
  },
);
const removerBotaoSom = montarBotaoSom({ raiz, dicas: content.dicas, estado, eventos });

// ?erro=<cena> (só em desenvolvimento) faz a cena indicada falhar, para provar o modo de segurança.
const erroForcado = lerErroForcado({ desenvolvimento, busca });
function naCena<R>(nome: string, cena: Cena<R>): Cena<R> {
  return erroForcado === nome ? comErroForcado(nome, cena) : cena;
}

// Cada spec de cena (SPEC-02 a SPEC-06) acrescenta a sua aqui, na ordem do caminho.
const etapas: readonly EtapaDoConvite[] = [];

const carregamento = criarCarregamento({
  imagens: criarCarregadorDeImagens(),
  temporizador: criarTemporizador(),
  config,
});

const orquestrador = criarOrquestrador({
  plano: {
    entrada: naCena(
      'entrada',
      criarCenaEntrada({ raiz, conteudo: content, config, estado, eventos, carregamento }),
    ),
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
  pararDeOuvirSaidaEVolta();
  removerBotaoSom();
  audioDoConvite.destruir();
  orquestrador.destruir();
  pararDeRefletirFase();
  estado.destruir();
});
