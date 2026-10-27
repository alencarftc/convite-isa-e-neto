import gsap from 'gsap';

import type { BarramentoEventos } from '@/application/barramento-eventos';
import type { Cena } from '@/application/cena';
import type { EstadoConvite } from '@/application/estado-convite';
import type { ConfigConvite } from '@/domain/config/config-convite';
import type { ConteudoConvite } from '@/domain/conteudo/conteudo-convite';
import type { EventosConvite } from '@/domain/eventos/eventos-convite';
import { urlDaImagem } from '@/domain/imagens/catalogo-de-imagens';

import { criar, criarImagem } from '../dom';
import { carregarImagensTardias } from '../imagens/imagens-tardias';
import { removerPetalas } from '../petalas/petalas';
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
  /** Aura que respira o tempo todo, o contorno dourado que a acompanha e o realce que o mouse acende. */
  readonly aura: HTMLElement;
  readonly contorno: HTMLElement;
  readonly realce: HTMLElement;
  readonly onda: HTMLElement;
  readonly brilhantes: readonly HTMLElement[];
  readonly aberto: HTMLElement;
  readonly luz: HTMLElement;
  /** O inventário (moldura e chave) fica na raiz, acima da cena: a chave sai dele e voa até o baú. */
  readonly inventario: HTMLElement;
  readonly moldura: HTMLElement;
  readonly chave: HTMLElement;
  readonly brilho: HTMLElement;
  readonly botao: HTMLButtonElement;
  readonly dica: HTMLElement;
}

/** `50%` → `0.5`; a posição da fechadura vem de variáveis CSS (SPEC-04, "Marcação"). */
function fracaoDe(valor: string, padrao: number): number {
  const numero = Number.parseFloat(valor);
  return Number.isNaN(numero) ? padrao : numero / 100;
}

/**
 * Baú e chave (SPEC-04, ADR-0012): a chave espera no inventário, no pé da tela; um toque no baú (ou
 * na chave) a usa. Ela sai do inventário, voa até a fechadura, entra na horizontal, gira em torno do
 * próprio eixo e o baú abre com um pequeno salto, soltando a luz e as pétalas, tudo em `duracoes.bau`.
 * O baú tem sombra, aura que respira e pontos de luz. Dica após 1,5 s e reforço a cada 8 s sem
 * interação (até 3).
 */
export function criarCenaBau(dependencias: DependenciasDoBau): Cena {
  const { raiz, conteudo, config, estado, eventos } = dependencias;
  const { duracoes, curvas, bau: parametros } = config;
  const { chave: medidas } = parametros;

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

    const decorativo = (classe: string, tag: 'div' | 'span' = 'div') => {
      const elemento = criar(tag, classe);
      elemento.setAttribute('aria-hidden', 'true');
      return elemento;
    };

    const corpo = criar('div', 'bau__corpo');
    const sombra = decorativo('bau__sombra');
    const aura = decorativo('bau__aura');
    const realce = decorativo('bau__aura bau__aura--realce');
    // Cópia do baú atrás dele, só para o seu brilho de contorno aparecer (a CSS põe o `drop-shadow`).
    const contorno = criarImagem(
      'bau__contorno',
      urlDaImagem(config.imagens.bauFechado, 'vertical'),
    );
    contorno.setAttribute('aria-hidden', 'true');
    const onda = decorativo('bau__onda');
    const brilhantes = Array.from({ length: parametros.brilhantes.quantidade }, () =>
      decorativo('bau__brilhante', 'span'),
    );
    const caixaDosBrilhantes = decorativo('bau__brilhantes');
    caixaDosBrilhantes.append(...brilhantes);
    const luz = decorativo('bau__luz');
    // A tampa aberta e as pétalas só são pedidas quando o baú passa a aceitar o toque (`run`).
    const aberta = criarImagem(
      'bau__aberto',
      urlDaImagem(config.imagens.bauAberto, 'vertical'),
      true,
    );
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'bau__botao';
    botao.setAttribute('aria-label', conteudo.rotulos.abrirBau);
    botao.disabled = true;
    const dica = criar('p', 'bau__dica');
    dica.setAttribute('aria-live', 'polite');

    // A sombra fica sobre a aura e o contorno (ou a luz os apagaria) e sob o baú.
    corpo.append(
      aura,
      realce,
      onda,
      contorno,
      sombra,
      criarImagem('bau__fechado', urlDaImagem(config.imagens.bauFechado, 'vertical')),
      aberta,
      luz,
      caixaDosBrilhantes,
      botao,
      dica,
    );
    bau.append(corpo);

    // Inventário: na raiz (acima da cena, fixo no pé da tela), para a chave poder sair dele e voar até o
    // baú sem ser cortada por camada alguma. Não tem texto nem foco: o botão do baú é o controle.
    const inventario = decorativo('inventario');
    const moldura = decorativo('inventario__moldura');
    const brilho = decorativo('bau__brilho', 'span');
    const imagemDaChave = criarImagem(
      'bau__chave-imagem',
      urlDaImagem(config.imagens.chave, 'vertical'),
    );
    const chave = decorativo('bau__chave');
    chave.append(brilho, imagemDaChave);
    inventario.append(moldura, chave);
    raiz.append(inventario);

    gsap.set([aberta, luz, aura, contorno, realce, onda, dica, inventario, ...brilhantes], {
      opacity: 0,
    });
    // A arte vem inclinada: a imagem gira dentro da caixa até a chave ficar na horizontal (ponta à
    // esquerda, argola à direita); a caixa guarda a inclinação do inventário e depois a desfaz.
    gsap.set(imagemDaChave, { rotation: medidas.giroDaArte });
    gsap.set(chave, {
      rotation: medidas.inclinacaoNoInventario,
      transformPerspective: parametros.perspectivaDoGiro,
    });

    partes = {
      bau,
      corpo,
      aura,
      contorno,
      realce,
      onda,
      brilhantes,
      aberto: aberta,
      luz,
      inventario,
      moldura,
      chave,
      brilho,
      botao,
      dica,
    };
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

  /** A chave pulsa e uma onda sai do baú: o aviso para quem tocou fora ou ficou parado. */
  function pulsar(escala: number, duracao: number, repeticoes = 1): void {
    const { chave, onda } = montar();
    const meio = duracao / (repeticoes * 2);
    ociosas.push(
      gsap.to(chave, {
        scale: escala,
        duration: meio,
        ease: curvas.suave,
        yoyo: true,
        repeat: repeticoes * 2 - 1,
      }),
      gsap.fromTo(
        onda,
        { opacity: parametros.onda.opacidade, scale: parametros.onda.inicio },
        {
          opacity: 0,
          scale: parametros.onda.fim,
          duration: meio * 2,
          ease: curvas.saida,
          repeat: repeticoes - 1,
        },
      ),
    );
  }

  function mostrarDica(): void {
    const { dica } = montar();
    dica.textContent = estado.toque ? conteudo.dicas.chaveCelular : conteudo.dicas.chaveComputador;
    gsap.fromTo(
      dica,
      { opacity: 0 },
      { opacity: 1, duration: parametros.inventarioAparece, ease: curvas.saida },
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

  /** Onde a chave precisa estar na tela para a ponta tocar a fechadura (e antes de entrar). */
  function mirarNaFechadura(p: Partes): {
    partida: { x: number; y: number };
    aproximada: { x: number; y: number };
    encaixada: { x: number; y: number };
    escala: number;
  } {
    const { bau, corpo, chave } = p;
    const caixaDaChave = chave.getBoundingClientRect();
    const partida = {
      x: caixaDaChave.left + caixaDaChave.width / 2,
      y: caixaDaChave.top + caixaDaChave.height / 2,
    };
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
    // A chave é medida na caixa da imagem (a mesma em que a ponta foi medida): com a escala escolhida
    // para ela medir `comprimentoNoBau` do baú, o centro da caixa fica à distância da ponta.
    const largura = chave.offsetWidth;
    const altura = chave.offsetHeight;
    const escala =
      (medidas.comprimentoNoBau * caixaDoCorpo.width) / (medidas.comprimento * largura);
    const encaixada = {
      x: fechadura.x - (medidas.ponta.x - 0.5) * largura * escala,
      y: fechadura.y - (medidas.ponta.y - 0.5) * altura * escala,
    };
    const comprimento = medidas.comprimentoNoBau * caixaDoCorpo.width;
    const aproximada = {
      x: encaixada.x + medidas.aproximacao.recuo * comprimento,
      y: encaixada.y - medidas.aproximacao.elevacao * comprimento,
    };
    return { partida, aproximada, encaixada, escala };
  }

  function abrir(): Promise<void> {
    const p = montar();
    const {
      corpo,
      aura,
      contorno,
      realce,
      brilhantes,
      aberto: tampa,
      luz,
      moldura,
      chave,
      botao,
      dica,
    } = p;
    aberto = true;
    botao.disabled = true;
    estado.definirFase('bau');
    limparAgendamentos();
    pararOciosas();
    ouvintes?.abort();
    gsap.killTweensOf([aura, contorno, realce]);

    const { partida, aproximada, encaixada, escala } = mirarNaFechadura(p);
    const x0 = Number(gsap.getProperty(chave, 'x'));
    const y0 = Number(gsap.getProperty(chave, 'y'));
    const voo = parametros.chaveVoa;
    const encaixe = parametros.chaveEncaixa;
    const girar = voo + encaixe;

    const petalasPorAbertura = Math.round(
      gsap.utils.random(parametros.petalas.minimo, parametros.petalas.maximo),
    );

    return new Promise<void>((resolver) => {
      linhaDoTempo = gsap
        .timeline({ onComplete: resolver })
        // 0 s: a dica e a aura somem; o inventário fica vazio assim que a chave sai.
        .to(dica, { opacity: 0, duration: parametros.dicaSome, ease: curvas.saida }, 0)
        .to(
          [aura, contorno, realce, ...brilhantes],
          { opacity: 0, duration: parametros.dicaSome, ease: curvas.saida },
          0,
        )
        .to(
          moldura,
          { opacity: 0, duration: parametros.inventarioSome, ease: curvas.saida },
          voo / 3,
        )
        // A chave voa em arco (x e y com curvas diferentes), endireita e cresce até a escala do baú.
        .to(
          chave,
          {
            x: x0 + aproximada.x - partida.x,
            rotation: 0,
            scale: escala,
            duration: voo,
            ease: curvas.viaDupla,
          },
          0,
        )
        .to(chave, { y: y0 + aproximada.y - partida.y, duration: voo, ease: curvas.saida }, 0)
        // A ponta entra na fechadura, na horizontal.
        .to(
          chave,
          {
            x: x0 + encaixada.x - partida.x,
            y: y0 + encaixada.y - partida.y,
            duration: encaixe,
            ease: curvas.entrada,
          },
          voo,
        )
        // A chave gira em torno do próprio eixo e a fechadura faz o som.
        .call(
          () => {
            eventos.emit('bau:girou');
          },
          [],
          girar,
        )
        .to(
          chave,
          {
            rotationX: parametros.grausDoGiro,
            duration: parametros.giroDaChave,
            ease: parametros.curvaDoGiro,
          },
          girar,
        )
        // 1,0 s: pequeno salto do baú, e a chave, presa na fechadura, salta com ele.
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
          chave,
          {
            y: `-=${String(parametros.alturaDoSalto)}`,
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
        .to(
          chave,
          {
            y: `+=${String(parametros.alturaDoSalto)}`,
            duration: parametros.duracaoDoSalto,
            ease: curvas.entrada,
          },
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
      const { bau, botao, aura, contorno, realce, brilhantes, inventario, chave, brilho } =
        montar();
      carregarImagensTardias(bau);
      // Pede as pétalas agora, para estarem prontas quando a tampa abrir (RF-04.9), e não no `init`.
      petalas = (['petalaA', 'petalaB', 'petalaC'] as const).map((chavePetala) => {
        const petala = new Image();
        petala.src = urlDaImagem(config.imagens[chavePetala], 'vertical');
        return petala;
      });
      return new Promise<void>((resolver) => {
        ouvintes = new AbortController();
        const { signal } = ouvintes;

        // O inventário sobe até a tela com a chave balançando e brilhando; o baú respira a aura e
        // cintila (RF-04.3, ADR-0012). Só `transform` e `opacity`.
        const base = parametros.chave.inclinacaoNoInventario;
        const balanco = parametros.balancoNoInventario;
        gsap.fromTo(
          inventario,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: parametros.inventarioAparece, ease: curvas.saida },
        );
        ociosas.push(
          gsap.fromTo(
            chave,
            { rotation: base - balanco.rotacao },
            {
              rotation: base + balanco.rotacao,
              duration: balanco.duracao,
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
          gsap.fromTo(
            aura,
            { opacity: parametros.aura.minimo, scale: 1 },
            {
              opacity: parametros.aura.maximo,
              scale: parametros.aura.escala,
              duration: parametros.aura.periodo / 2,
              ease: curvas.suave,
              yoyo: true,
              repeat: -1,
            },
          ),
        );
        // O contorno dourado respira junto com a aura (só a opacidade: a escala o descolaria do baú).
        ociosas.push(
          gsap.fromTo(
            contorno,
            { opacity: parametros.aura.minimo },
            {
              opacity: parametros.aura.maximo,
              duration: parametros.aura.periodo / 2,
              ease: curvas.suave,
              yoyo: true,
              repeat: -1,
            },
          ),
        );
        brilhantes.forEach((brilhante, indice) => {
          ociosas.push(
            gsap.fromTo(
              brilhante,
              { opacity: 0, scale: 0.2 },
              {
                opacity: 1,
                scale: 1,
                duration: parametros.brilhantes.periodo / 2,
                delay: indice * parametros.brilhantes.intervalo,
                ease: curvas.suave,
                yoyo: true,
                repeat: -1,
              },
            ),
          );
        });
        reiniciarReforco();
        botao.disabled = false;
        // O foco vai para o baú quando ele passa a aceitar o toque (SPEC-09, RF-09.6).
        botao.focus({ preventScroll: true });

        // Com mouse, o realce da aura acende quando o ponteiro passa por cima do baú.
        if (!estado.toque) {
          botao.addEventListener(
            'pointerenter',
            () => {
              gsap.to(realce, { opacity: 1, duration: parametros.auraAparece, ease: curvas.saida });
            },
            { signal },
          );
          botao.addEventListener(
            'pointerleave',
            () => {
              gsap.to(realce, { opacity: 0, duration: parametros.auraAparece, ease: curvas.saida });
            },
            { signal },
          );
        }
        // Toque fora do baú: a chave e a onda pulsam uma vez; qualquer interação adia o reforço.
        window.addEventListener(
          'pointerdown',
          (evento) => {
            if (aberto) return;
            const noBau = evento.target === botao || inventario.contains(evento.target as Node);
            if (!noBau) pulsar(parametros.pulso.escala, parametros.pulso.duracao);
            reiniciarReforco();
          },
          { signal },
        );
        window.addEventListener('keydown', reiniciarReforco, { signal });

        // Tocar no baú (Enter e Espaço também) ou na chave do inventário usa a chave. Só o primeiro toque conta.
        const usarAChave = () => {
          if (aberto) return;
          void abrir().then(resolver);
        };
        botao.addEventListener('click', usarAChave, { signal });
        inventario.addEventListener('click', usarAChave, { signal });
      });
    },

    skip() {
      const {
        aberto: tampa,
        luz,
        aura,
        contorno,
        realce,
        brilhantes,
        inventario,
        chave,
        dica,
        botao,
        corpo,
      } = montar();
      aberto = true;
      linhaDoTempo?.kill();
      limparAgendamentos();
      pararOciosas();
      ouvintes?.abort();
      gsap.killTweensOf([aura, contorno, realce, inventario]);
      botao.disabled = true;
      // Baú aberto, luz assentada e sem chave, inventário, aura nem dica (RF-04.8).
      removerPetalas(corpo);
      gsap.set(tampa, { opacity: 1 });
      gsap.set(luz, { opacity: parametros.opacidadeFinalDaLuz });
      gsap.set([chave, aura, contorno, realce, dica, inventario, ...brilhantes], { opacity: 0 });
    },

    destroy() {
      linhaDoTempo?.kill();
      limparAgendamentos();
      pararOciosas();
      ouvintes?.abort();
      partes?.corpo.remove();
      partes?.inventario.remove();
      partes = undefined;
      aberto = false;
      reforcos = 0;
    },
  };
}
