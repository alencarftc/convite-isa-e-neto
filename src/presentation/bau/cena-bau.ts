import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import type { EstadoConvite } from '@/application/estado-convite';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';

import { soltarPetalas } from '../petalas/soltar-petalas';

export interface DependenciasDoBau {
  readonly raiz: HTMLElement;
  readonly conteudo: ConteudoConvite;
  readonly config: ConfigConvite;
  readonly estado: EstadoConvite;
  readonly eventos: BarramentoEventos<EventosConvite>;
}

interface Partes {
  readonly bau: HTMLElement;
  readonly corpo: HTMLElement;
  readonly aura: HTMLElement;
  readonly aberto: HTMLElement;
  readonly luz: HTMLElement;
  readonly chave: HTMLElement;
  readonly brilho: HTMLElement;
  readonly botao: HTMLButtonElement;
  readonly dica: HTMLElement;
}

function criar(tag: string, classe: string): HTMLElement {
  const elemento = document.createElement(tag);
  elemento.className = classe;
  return elemento;
}

function criarImagem(classe: string, url: string): HTMLImageElement {
  const imagem = document.createElement('img');
  imagem.className = classe;
  imagem.src = url;
  imagem.alt = '';
  imagem.draggable = false;
  return imagem;
}

/** `50%` → `0.5`; a posição da fechadura vem de variáveis CSS (SPEC-04, "Marcação"). */
function fracaoDe(valor: string, padrao: number): number {
  const numero = Number.parseFloat(valor);
  return Number.isNaN(numero) ? padrao : numero / 100;
}

/**
 * Baú e chave (SPEC-04): a chave flutua no celular ou vira o cursor no computador; um toque no baú
 * ou na chave leva a chave à fechadura, gira, abre a tampa com um pequeno salto e solta a luz e as
 * pétalas, tudo em `duracoes.bau`. Dica após 1,5 s e reforço a cada 8 s sem interação (até 3).
 */
export function criarCenaBau(dependencias: DependenciasDoBau): Cena {
  const { raiz, conteudo, config, estado, eventos } = dependencias;
  const { duracoes, curvas, bau: parametros } = config;

  let partes: Partes | undefined;
  let petalas: HTMLImageElement[] = [];
  let ociosas: gsap.core.Animation[] = [];
  let agendamentos: gsap.core.Tween[] = [];
  let linhaDoTempo: gsap.core.Timeline | undefined;
  let ouvintes: AbortController | undefined;
  let reforcos = 0;
  let aberto = false;

  function montar(): Partes {
    if (partes) return partes;
    const bau = raiz.querySelector<HTMLElement>('.bau');
    if (!bau) throw new Error('A cena do bosque precisa montar o espaço ".bau" antes (SPEC-03)');

    const corpo = criar('div', 'bau__corpo');
    const aura = criar('div', 'bau__aura');
    aura.setAttribute('aria-hidden', 'true');
    const luz = criar('div', 'bau__luz');
    luz.setAttribute('aria-hidden', 'true');
    const brilho = criar('span', 'bau__brilho');
    brilho.setAttribute('aria-hidden', 'true');
    const chave = criar('div', 'bau__chave');
    chave.append(
      brilho,
      criarImagem('bau__chave-imagem', urlDaImagem(config.imagens.chave, 'vertical')),
    );
    const aberta = criarImagem('bau__aberto', urlDaImagem(config.imagens.bauAberto, 'vertical'));
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'bau__botao';
    botao.setAttribute('aria-label', conteudo.rotulos.abrirBau);
    botao.disabled = true;
    const dica = criar('p', 'bau__dica');
    dica.setAttribute('aria-live', 'polite');

    corpo.append(
      aura,
      criarImagem('bau__fechado', urlDaImagem(config.imagens.bauFechado, 'vertical')),
      aberta,
      luz,
      chave,
      botao,
      dica,
    );
    bau.append(corpo);
    gsap.set([aberta, luz, chave, aura, dica], { opacity: 0 });

    // Pede as pétalas já, para estarem prontas quando a tampa abrir (RF-04.9).
    petalas = (['petalaA', 'petalaB', 'petalaC'] as const).map((chavePetala) => {
      const petala = new Image();
      petala.src = urlDaImagem(config.imagens[chavePetala], 'vertical');
      return petala;
    });

    partes = { bau, corpo, aura, aberto: aberta, luz, chave, brilho, botao, dica };
    return partes;
  }

  function limparAgendamentos(): void {
    for (const agendamento of agendamentos) agendamento.kill();
    agendamentos = [];
  }

  function pararOciosas(): void {
    for (const animacao of ociosas) animacao.kill();
    ociosas = [];
  }

  function definirCursor(ativo: boolean): void {
    if (ativo) {
      const url = urlDaImagem(config.imagens.cursorChave, 'vertical');
      // Ponto ativo na ponta da chave; `pointer` é a reserva se o navegador recusar o cursor.
      document.body.style.setProperty('--cursor-chave', `url('${url}') 8 40, pointer`);
    } else {
      document.body.style.removeProperty('--cursor-chave');
    }
  }

  function pulsar(escala: number, duracao: number, repeticoes = 1): void {
    const { chave, aura } = montar();
    const meio = duracao / (repeticoes * 2);
    if (estado.algumToque) {
      ociosas.push(
        gsap.to(chave, {
          scale: escala,
          duration: meio,
          ease: curvas.suave,
          yoyo: true,
          repeat: repeticoes * 2 - 1,
        }),
      );
    }
    // A aura também pulsa: no computador, onde a chave é o cursor, ela é o único sinal visível.
    gsap.fromTo(
      aura,
      { opacity: 0 },
      { opacity: 1, duration: meio, ease: curvas.suave, yoyo: true, repeat: repeticoes * 2 - 1 },
    );
  }

  function mostrarDica(): void {
    const { dica } = montar();
    dica.textContent = estado.toque ? conteudo.dicas.chaveCelular : conteudo.dicas.chaveComputador;
    gsap.fromTo(
      dica,
      { opacity: 0 },
      { opacity: 1, duration: parametros.chaveAparece, ease: curvas.saida },
    );
  }

  function agendarReforco(): void {
    if (reforcos >= parametros.reforco.maximo) return;
    agendamentos.push(
      gsap.delayedCall(duracoes.reforcoDica, () => {
        reforcos += 1;
        pulsar(parametros.reforco.escala, parametros.reforco.duracao, parametros.reforco.pulsos);
        mostrarDica();
        agendarReforco();
      }),
    );
  }

  /** Qualquer interação adia o reforço: ele só vale para quem está parado. */
  function reiniciarReforco(): void {
    limparAgendamentos();
    agendamentos.push(gsap.delayedCall(duracoes.dicaChave, mostrarDica));
    agendarReforco();
  }

  function abrir(origem: { x: number; y: number } | null): Promise<void> {
    const { bau, corpo, aura, aberto: tampa, luz, chave, botao, dica } = montar();
    aberto = true;
    botao.disabled = true;
    estado.definirFase('bau');
    limparAgendamentos();
    pararOciosas();
    ouvintes?.abort();
    definirCursor(false);

    // A chave sai de onde está (celular) ou da ponta do cursor (computador) e vai à fechadura.
    const centro = () => {
      const caixa = chave.getBoundingClientRect();
      return { x: caixa.left + caixa.width / 2, y: caixa.top + caixa.height / 2 };
    };
    if (origem) {
      const atual = centro();
      gsap.set(chave, { x: `+=${origem.x - atual.x}`, y: `+=${origem.y - atual.y}` });
    }
    gsap.set(chave, { opacity: 1, scale: 1 });
    const estilo = getComputedStyle(bau);
    const caixaDoCorpo = corpo.getBoundingClientRect();
    const fechadura = {
      x:
        caixaDoCorpo.left +
        caixaDoCorpo.width * fracaoDe(estilo.getPropertyValue('--fechadura-x'), 0.5),
      y:
        caixaDoCorpo.top +
        caixaDoCorpo.height * fracaoDe(estilo.getPropertyValue('--fechadura-y'), 0.58),
    };
    const partida = centro();
    const dx = fechadura.x - partida.x;
    const dy = fechadura.y - partida.y;

    const petalasPorAbertura = Math.round(
      gsap.utils.random(parametros.petalas.minimo, parametros.petalas.maximo),
    );

    return new Promise<void>((resolver) => {
      linhaDoTempo = gsap
        .timeline({ onComplete: resolver })
        // 0 s: a dica some; a chave vai à fechadura.
        .to(dica, { opacity: 0, duration: parametros.dicaSome, ease: curvas.saida }, 0)
        .to(aura, { opacity: 0, duration: parametros.dicaSome, ease: curvas.saida }, 0)
        .to(
          chave,
          {
            x: `+=${dx}`,
            y: `+=${dy}`,
            rotation: 0,
            duration: parametros.chaveVaiAteAFechadura,
            ease: curvas.viaDupla,
          },
          0,
        )
        // 0,4 s: a chave gira 90° e a fechadura faz o som.
        .call(
          () => {
            eventos.emit('bau:girou');
          },
          [],
          parametros.chaveVaiAteAFechadura,
        )
        .to(
          chave,
          {
            rotation: parametros.grausDoGiro,
            duration: parametros.giroDaChave,
            ease: parametros.curvaDoGiro,
          },
          parametros.chaveVaiAteAFechadura,
        )
        // 1,0 s: pequeno salto do baú.
        .to(
          corpo,
          {
            y: -parametros.alturaDoSalto,
            scale: parametros.escalaDoSalto,
            duration: parametros.duracaoDoSalto,
            ease: curvas.saida,
          },
          parametros.instanteDoSalto,
        )
        .to(
          corpo,
          { y: 0, scale: 1, duration: parametros.duracaoDoSalto, ease: curvas.entrada },
          parametros.instanteDoSalto + parametros.duracaoDoSalto,
        )
        // 1,0 s: a tampa se abre, com o som, as pétalas e a luz.
        .to(
          tampa,
          { opacity: 1, duration: parametros.duracaoDaTampa, ease: curvas.leve },
          parametros.instanteDaTampa,
        )
        .call(
          () => {
            eventos.emit('bau:abriu');
          },
          [],
          parametros.instanteDaTampa,
        )
        .add(
          soltarPetalas({
            conteiner: corpo,
            imagens: petalas,
            quantidade: petalasPorAbertura,
            origem: { x: '50%', y: '30%' },
            largura: parametros.petalas.largura,
            subida: parametros.petalas.subida,
            deriva: parametros.petalas.deriva,
            duracao: parametros.petalas.duracao,
            curva: curvas.saida,
          }),
          parametros.instanteDaTampa,
        )
        // 1,1 s: a luz sobe até 1 e assenta em 0,6.
        .to(
          luz,
          { opacity: 1, duration: parametros.luzSobe, ease: curvas.senoSaida },
          parametros.instanteDaLuz,
        )
        .to(
          luz,
          {
            opacity: parametros.opacidadeFinalDaLuz,
            duration: parametros.luzAssenta,
            ease: curvas.senoSaida,
          },
          parametros.instanteDaLuz + parametros.luzSobe,
        )
        // 1,3 s: a chave some.
        .to(
          chave,
          { opacity: 0, duration: parametros.chaveSome, ease: curvas.leve },
          parametros.instanteDaChaveSome,
        )
        // 2 s: fim; a história começa.
        .set({}, {}, duracoes.bau);
    });
  }

  return {
    init() {
      montar();
    },

    run() {
      const { botao, aura, chave, brilho } = montar();
      return new Promise<void>((resolver) => {
        ouvintes = new AbortController();
        const { signal } = ouvintes;

        if (!estado.toque) definirCursor(true);
        if (estado.algumToque) {
          // Chave flutuante junto à fechadura, com brilho pulsando (RF-04.3).
          gsap.fromTo(chave, { opacity: 0 }, { opacity: 1, duration: parametros.chaveAparece });
          ociosas.push(
            gsap.fromTo(
              chave,
              { y: 0, rotation: -parametros.flutuacao.rotacao },
              {
                y: -parametros.flutuacao.amplitude,
                rotation: parametros.flutuacao.rotacao,
                duration: parametros.flutuacao.duracao,
                ease: curvas.suave,
                yoyo: true,
                repeat: -1,
              },
            ),
            gsap.fromTo(
              brilho,
              { opacity: parametros.brilhoDaChave.minimo },
              {
                opacity: parametros.brilhoDaChave.maximo,
                duration: parametros.brilhoDaChave.duracao,
                ease: curvas.suave,
                yoyo: true,
                repeat: -1,
              },
            ),
          );
        }
        reiniciarReforco();
        botao.disabled = false;

        // Aura dourada atrás do baú quando o cursor passa por cima (só com mouse).
        if (!estado.toque) {
          botao.addEventListener(
            'pointerenter',
            () => {
              gsap.to(aura, { opacity: 1, duration: parametros.auraAparece, ease: curvas.saida });
            },
            { signal },
          );
          botao.addEventListener(
            'pointerleave',
            () => {
              gsap.to(aura, { opacity: 0, duration: parametros.auraAparece, ease: curvas.saida });
            },
            { signal },
          );
        }
        // Toque fora do baú: a chave e a aura pulsam uma vez; qualquer interação adia o reforço.
        window.addEventListener(
          'pointerdown',
          (evento) => {
            if (aberto) return;
            if (evento.target !== botao) pulsar(parametros.pulso.escala, parametros.pulso.duracao);
            reiniciarReforco();
          },
          { signal },
        );
        window.addEventListener('keydown', reiniciarReforco, { signal });

        // O botão cobre o baú e a chave; Enter e Espaço também abrem. Só o primeiro toque conta.
        botao.addEventListener(
          'click',
          (evento) => {
            if (aberto) return;
            // `detail` zero: veio do teclado, sem ponto de origem para a chave sair do cursor.
            const doPonteiro = evento.detail > 0 && !estado.toque;
            void abrir(doPonteiro ? { x: evento.clientX, y: evento.clientY } : null).then(resolver);
          },
          { signal },
        );
      });
    },

    skip() {
      const { aberto: tampa, luz, chave, aura, dica, botao } = montar();
      aberto = true;
      linhaDoTempo?.kill();
      limparAgendamentos();
      pararOciosas();
      ouvintes?.abort();
      definirCursor(false);
      botao.disabled = true;
      // Baú aberto, luz assentada e sem chave nem dica (RF-04.8).
      gsap.set(tampa, { opacity: 1 });
      gsap.set(luz, { opacity: parametros.opacidadeFinalDaLuz });
      gsap.set([chave, aura, dica], { opacity: 0 });
    },

    destroy() {
      linhaDoTempo?.kill();
      limparAgendamentos();
      pararOciosas();
      ouvintes?.abort();
      definirCursor(false);
      partes?.corpo.remove();
      partes = undefined;
      aberto = false;
      reforcos = 0;
    },
  };
}
