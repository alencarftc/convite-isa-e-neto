/**
 * Raiz de composição: o único lugar que conhece todas as camadas. Instancia os
 * adaptadores de infraestrutura e os entrega aos casos de uso e à apresentação.
 */
import './styles/tokens.css';
import './styles/base.css';
import './styles/informacoes.css';

import { criarObterInformacoes } from '@/application/use-cases/obter-informacoes';
import { config } from '@/config/config';
import { content } from '@/config/content';
import { criarRelogio } from '@/infrastructure/relogio/relogio';
import { montarInformacoes } from '@/presentation/informacoes/informacoes';

const raiz = document.querySelector<HTMLElement>('#app');
if (!raiz) throw new Error('Elemento #app não encontrado no index.html');

const relogio = criarRelogio({
  desenvolvimento: import.meta.env.DEV,
  busca: window.location.search,
});

montarInformacoes({
  raiz,
  conteudo: content,
  config,
  relogio,
  obterInformacoes: criarObterInformacoes({ relogio, config, conteudo: content }),
});
