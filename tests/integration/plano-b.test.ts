import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/config/config';
import { PLANO_B } from '@/domain/plano-b/plano-b';
import { marcarInicioDoConvite } from '@/presentation/acessibilidade/plano-b';

import { gerarScriptDoPlanoB } from '../../scripts/vite/plano-b';

const html = document.documentElement;
const limiteEmMs = config.duracoes.limitePlanoB * 1000;
const janela = window as unknown as Record<string, unknown>;

/** Executa o script inline como o navegador faria: depois do HTML, antes do pacote. */
function rodarOScriptDoHead(): void {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- o que se testa é justamente a string inline que vai no <head>
  const executar = new Function(gerarScriptDoPlanoB(config.duracoes.limitePlanoB)) as () => void;
  executar();
}

const planoBLigado = () => html.classList.contains(PLANO_B.classe);

describe('plano B no navegador (SPEC-15, RF-15.6)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    html.classList.remove(PLANO_B.classe);
    Reflect.deleteProperty(janela, PLANO_B.variavel);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('o pacote não inicia dentro do limite: a classe liga (CT-15.1)', () => {
    rodarOScriptDoHead();

    vi.advanceTimersByTime(limiteEmMs - 1);
    expect(planoBLigado()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(planoBLigado()).toBe(true);
  });

  it('o pacote inicia a tempo: a classe nunca liga', () => {
    rodarOScriptDoHead();

    marcarInicioDoConvite(window, document);
    vi.advanceTimersByTime(limiteEmMs * 3);

    expect(planoBLigado()).toBe(false);
  });

  it('o <script type="module"> falha ao carregar: a classe liga na hora, sem esperar o limite', () => {
    rodarOScriptDoHead();
    const pacote = document.createElement('script');
    pacote.type = 'module';
    document.head.append(pacote);

    pacote.dispatchEvent(new Event('error'));

    expect(planoBLigado()).toBe(true);
    pacote.remove();
  });

  it('falha em outro recurso (uma imagem) não liga o plano B', () => {
    rodarOScriptDoHead();
    const imagem = document.createElement('img');
    document.body.append(imagem);

    imagem.dispatchEvent(new Event('error'));

    expect(planoBLigado()).toBe(false);
    imagem.remove();
  });

  it('rede lenta: o plano B entra e, quando o pacote chega, o convite assume e ele some (CT-15.2)', () => {
    rodarOScriptDoHead();
    vi.advanceTimersByTime(limiteEmMs);
    expect(planoBLigado()).toBe(true);

    marcarInicioDoConvite(window, document);

    expect(planoBLigado()).toBe(false);
    expect(janela[PLANO_B.variavel]).toBe(PLANO_B.marca);
  });
});
