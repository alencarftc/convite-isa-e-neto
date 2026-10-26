/**
 * Raiz de composição: o único lugar que conhece todas as camadas. Instancia os
 * adaptadores de infraestrutura e os entrega aos casos de uso e à apresentação.
 */
import './styles/tokens.css';
import './styles/fontes.css';
import './styles/base.css';
import './styles/bau.css';
import './styles/bosque.css';
import './styles/carta.css';
import './styles/entrada.css';
import './styles/historia.css';
import './styles/historia-estatica.css';
import './styles/informacoes.css';
import './styles/botao-som.css';
import './styles/botao-pular.css';

import { Howl, Howler } from 'howler';

import { criarBarramento } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import { comErroForcado } from '@/application/cena-com-erro-forcado';
import { criarEstado } from '@/application/estado-convite';
import { conectarAudio } from '@/application/use-cases/audio-do-convite';
import { criarCarregamento } from '@/application/use-cases/carregamento';
import { criarObterInformacoes } from '@/application/use-cases/obter-informacoes';
import { criarOrquestrador, type EtapaDoConvite } from '@/application/use-cases/orquestrador';
import { registrarVisita } from '@/application/use-cases/registrar-visita';
import { config } from '@/config/config';
import { content } from '@/config/content';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { criarAmbienteDoNavegador } from '@/infrastructure/ambiente/ambiente-do-navegador';
import { criarCapacidadesDoNavegador } from '@/infrastructure/ambiente/capacidades-do-navegador';
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
import { montarAtalhoParaOConvite } from '@/presentation/acessibilidade/atalho-para-o-convite';
import { montarBotaoPular } from '@/presentation/acessibilidade/botao-pular';
import { marcarInicioDoConvite } from '@/presentation/acessibilidade/plano-b';
import { montarBotaoSom } from '@/presentation/audio/botao-som';
import { criarCenaBau } from '@/presentation/bau/cena-bau';
import { criarCenaBosque } from '@/presentation/bosque/cena-bosque';
import { criarCartaEConvite } from '@/presentation/carta/cena-carta';
import { criarCenaEntrada } from '@/presentation/entrada/cena-entrada';
import { refletirFaseNoCorpo } from '@/presentation/fase-no-corpo';
import { criarCenaHistoria } from '@/presentation/historia/cena-historia';
import { criarCenaInformacoes } from '@/presentation/informacoes/cena-informacoes';

// Primeira instrução depois dos imports: o script do <head> espera por esta marca (SPEC-15, RF-15.6).
marcarInicioDoConvite(window, document);

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
// Fora do #app, antes de "Pular" e do atalho: a ordem do Tab é atalho, Pular, som e a etapa atual (SPEC-14, RF-14.3).
const removerBotaoSom = montarBotaoSom({
  raiz: document.body,
  dicas: content.dicas,
  estado,
  eventos,
});

// ?erro=<cena> (só em desenvolvimento) faz a cena indicada falhar, para provar o modo de segurança.
const erroForcado = lerErroForcado({ desenvolvimento, busca });
function naCena<R>(nome: string, cena: Cena<R>): Cena<R> {
  return erroForcado === nome ? comErroForcado(nome, cena) : cena;
}

const carregamento = criarCarregamento({
  imagens: criarCarregadorDeImagens(),
  temporizador: criarTemporizador(),
  config,
});

const cartaEConvite = criarCartaEConvite({ raiz, conteudo: content, config, estado, eventos });

// Cada spec de cena (SPEC-03 a SPEC-06) acrescenta a sua aqui, na ordem do caminho.
const etapas: readonly EtapaDoConvite[] = [
  {
    nome: 'bosque',
    fase: 'bosque',
    cena: criarCenaBosque({ raiz, config, estado, eventos, carregamento }),
  },
  {
    nome: 'bau',
    fase: 'aguardando-bau',
    cena: criarCenaBau({ raiz, conteudo: content, config, estado, eventos }),
  },
  {
    nome: 'historia',
    fase: 'historia',
    cena: criarCenaHistoria({ raiz, conteudo: content, config, estado, eventos }),
  },
  { nome: 'carta', fase: 'carta', cena: cartaEConvite.carta },
  { nome: 'convite', fase: 'convite', cena: cartaEConvite.convite },
];

const orquestrador = criarOrquestrador({
  plano: {
    entrada: naCena(
      'entrada',
      criarCenaEntrada({ raiz, conteudo: content, config, estado, eventos, carregamento }),
    ),
    etapas: etapas.map((etapa) => ({ ...etapa, cena: naCena(etapa.nome, etapa.cena) })),
    final: naCena(
      'informacoes',
      criarCenaInformacoes(
        {
          raiz,
          conteudo: content,
          config,
          relogio,
          obterInformacoes: criarObterInformacoes({ relogio, config, conteudo: content }),
          animar: !estado.reduzido,
          // "Salvar na agenda" baixa o .ics onde o navegador baixa; senão, abre o Google Agenda (SPEC-17).
          baixaArquivos: criarCapacidadesDoNavegador(window).baixaArquivos(),
        },
        // As informações rolam abaixo da carta, dentro do `.conteudo` criado por ela (SPEC-06).
        () => raiz.querySelector<HTMLElement>('.conteudo') ?? raiz,
      ),
    ),
  },
  estado,
  eventos,
  registrarErro: (erro) => {
    console.error('[convite] modo de segurança', erro);
  },
});

const pararDeRegistrarVisita = registrarVisita({ estado, eventos });
// "Pular para o convite" (SPEC-14) e o atalho de teclado e leitor de tela (SPEC-09) levam ao mesmo
// destino. Se o som ainda não foi liberado, o próprio clique libera (como o toque de entrada).
function acionarPular(): void {
  if (estado.fase === 'carregando' || estado.fase === 'aguardando-entrada') {
    eventos.emit('entrada:tocou', { escolha: 'pular' });
  }
  orquestrador.pular();
}
// O botão entra antes: na ordem do Tab vem o atalho, depois "Pular", o som e a etapa atual (RF-14.3).
const removerBotaoPular = montarBotaoPular({
  corpo: document.body,
  conteudo: content,
  estado,
  aoAcionar: acionarPular,
});
const removerAtalho = montarAtalhoParaOConvite({
  corpo: document.body,
  conteudo: content,
  estado,
  aoAcionar: acionarPular,
});
const pararDeOuvirErros = ouvirErrosGlobais(window, (erro) => {
  orquestrador.falhar(erro);
});
void orquestrador.iniciar();

// Recarga a quente do Vite: desfaz tudo antes de montar de novo, para não duplicar cenas.
import.meta.hot?.dispose(() => {
  pararDeOuvirErros();
  pararDeRegistrarVisita();
  removerAtalho();
  removerBotaoPular();
  pararDeOuvirSaidaEVolta();
  removerBotaoSom();
  audioDoConvite.destruir();
  orquestrador.destruir();
  pararDeRefletirFase();
  estado.destruir();
});
