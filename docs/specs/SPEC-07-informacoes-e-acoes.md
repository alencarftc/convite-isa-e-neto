# SPEC-07 · Informações e ações

> Espelho local da sub-aba "SPEC-07 · Informações e ações" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon
> Onde esta spec diz `.js`, leia `.ts` ([ADR-0001](../decisions/0001-typescript-e-clean-architecture.md)). A lógica de estado e contagem é **domínio puro** (`src/domain/`), testável sem DOM.

**Histórias:** US-07.1 a US-07.5 · **Prioridade:** Must · **Pontos:** 11

## Resumo

Abaixo da carta, quatro cartões trazem o que o convidado precisa para agir: contagem regressiva, mensagem do casal, dress code e os botões "Confirmar presença" e "Como chegar". O que aparece depende da data: antes do prazo, depois do prazo, no dia e depois do casamento. Todas as datas usam o horário de Brasília, seja qual for o fuso do aparelho.

## Escopo

**Dentro:** os quatro cartões, o cálculo da contagem, os estados por data, os dois botões e a data simulada em desenvolvimento.

**Fora:** o formulário e a planilha (SPEC-11), a carta acima (SPEC-06) e a prévia do link (SPEC-10).

## Comportamento

Os cartões aparecem na rolagem, nesta ordem, logo abaixo da carta: contagem, mensagem do casal, dress code e ações.

**Estados por data (UTC−3)**

| Estado | Período | Contagem | Confirmação | Outros cartões |
| --- | --- | --- | --- | --- |
| Antes do prazo | Até 31/12/2026 às 23h59 | "Faltam [dd] dias, [hh] horas e [mm] minutos para o nosso sim" | Botão ativo e "Confirme até 31 de dezembro de 2026." | Mensagem, dress code, Como chegar |
| Depois do prazo | 01/01/2027 a 21/01/2027 | Contagem | "As confirmações foram encerradas em 31 de dezembro de 2026." no lugar do botão | Iguais |
| No dia | 22/01/2027, o dia todo | "É hoje! Nos vemos às 17h." | Aviso de encerramento | Iguais |
| Depois do casamento | A partir de 23/01/2027 às 00h | Some | Some | Primeiro cartão: "Obrigado por fazer parte da nossa história. Com amor, Isabella & David"; seguem mensagem e dress code; "Como chegar" some |

O estado é recalculado ao carregar, a cada minuto e quando o convidado volta ao convite depois de sair do aplicativo. Assim, quem deixa o convite aberto na virada do prazo vê a mudança sem recarregar.

## Requisitos funcionais

- **RF-07.1** A contagem usa `config.casamento` (`2027-01-22T17:00:00-03:00`); como a data tem fuso explícito, o resultado não depende do fuso do aparelho.
- **RF-07.2** Dias, horas e minutos são inteiros (`Math.floor`), com singular e plural corretos: "1 dia", "2 dias", "1 hora", "0 horas", "1 minuto".
- **RF-07.3** A atualização acontece na virada de cada minuto (um `setTimeout` até o próximo minuto e depois a cada 60 s) e em `visibilitychange`.
- **RF-07.4** "No dia" compara a data em UTC−3 com `2027-01-22`; vale do primeiro ao último minuto desse dia, mesmo depois das 17h.
- **RF-07.5** "Confirmar presença" é um link (`<a>`) para `config.links.formulario`, com `target="_blank"` e `rel="noopener"`; fica ativo enquanto agora ≤ `config.prazoConfirmacao`.
- **RF-07.6** "Como chegar" é um link para `config.links.mapa`, com `target="_blank"` e `rel="noopener"`.
- **RF-07.7** A mensagem do casal e o dress code vêm de `content.mensagem` e `content.dressCode`, exatamente como aprovados.
- **RF-07.8** O build falha se `content.js` ainda tiver texto pendente entre colchetes, como o verso do louvor (SPEC-12).
- **RF-07.9** Em desenvolvimento, `?data=AAAA-MM-DDTHH:MM` substitui a data atual em todos os cálculos desta spec.

## Requisitos não funcionais

- **RNF-07.1** Botões com pelo menos 48 px de altura e largura total do cartão até 360 px.
- **RNF-07.2** Contraste do botão principal: texto marfim sobre azul-noite, 9,1:1; foco visível com contorno dourado de 3 px.
- **RNF-07.3** A contagem não é anunciada a cada minuto ao leitor de tela (`aria-live="off"`), para não interromper a leitura.

## Desenho técnico

**Cálculo de estado e contagem**

```js
// src/countdown.js (esboço)
const HORA = 3600e3, DIA = 24 * HORA, OFFSET = -3 * HORA;   // UTC−3

export function agora() {
  const simulada = import.meta.env.DEV && new URLSearchParams(location.search).get('data');
  return simulada ? Date.parse(simulada + ':00-03:00') : Date.now();
}

const diaLocal = t => new Date(t + OFFSET).toISOString().slice(0, 10);  // 'AAAA-MM-DD' em UTC−3

export function estado(t = agora()) {
  const casamento = Date.parse(config.casamento);
  const prazo = Date.parse(config.prazoConfirmacao);
  const dia = diaLocal(t), diaCasamento = diaLocal(casamento);
  if (dia > diaCasamento) return 'depois';
  if (dia === diaCasamento) return 'no-dia';
  return t <= prazo ? 'antes-do-prazo' : 'depois-do-prazo';
}

export function contagem(t = agora()) {
  const resto = Math.max(0, Date.parse(config.casamento) - t);
  return {
    dias: Math.floor(resto / DIA),
    horas: Math.floor((resto % DIA) / HORA),
    minutos: Math.floor((resto % HORA) / 60e3),
  };
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
// "Faltam " + plural(d,'dia','dias') + ", " + plural(h,'hora','horas') + " e " + plural(m,'minuto','minutos') + " para o nosso sim"
```

Como o texto aprovado começa com "Faltam", com 1 dia restante fica "Faltam 1 dia…"; a concordância do verbo pode virar "Falta 1 dia" se você preferir (questão em aberto).

**Marcação**

```html
<section class="informacoes" aria-label="Informações do casamento">
  <div class="cartao cartao--contagem"><p aria-live="off">Faltam <strong>87</strong> dias, …</p></div>
  <div class="cartao cartao--agradecimento" hidden>…</div>
  <div class="cartao cartao--mensagem"><h3>Mensagem do casal</h3>…</div>
  <div class="cartao cartao--traje"><h3>Traje</h3><p>Esporte fino</p></div>
  <div class="cartao cartao--acoes">
    <a class="botao botao--principal" href="https://forms.gle/yviZrELgrH2zrRGc7" target="_blank" rel="noopener">Confirmar presença</a>
    <p class="acoes__prazo">Confirme até 31 de dezembro de 2026.</p>
    <p class="acoes__encerrado" hidden>As confirmações foram encerradas em 31 de dezembro de 2026.</p>
    <a class="botao botao--secundario" href="…" target="_blank" rel="noopener">Como chegar</a>
  </div>
</section>
```

Os títulos dos cartões ("Mensagem do casal", "Traje") são rótulos para leitura e navegação; se você preferir cartões sem título visível, eles ficam só para o leitor de tela.

**Estilo dos cartões e botões**

| Elemento | Estilo |
| --- | --- |
| Cartão | Largura `min(92vw, 560px)`, fundo `--cor-marfim`, raio de 16 px, margem interna de 24 px, sombra suave; 24 px entre cartões; 48 px de espaço no fim mais a área segura do aparelho |
| Números da contagem | Cormorant semibold, 28 px, `--cor-texto` |
| Botão principal | Fundo `--cor-texto`, texto `--cor-marfim`, 52 px de altura, raio total, Cormorant 18 px semibold; ao tocar, escala 0,98 |
| Botão secundário | Fundo transparente, borda de 1,5 px `--cor-texto`, texto `--cor-texto`, mesma altura |
| Foco | Contorno de 3 px `--cor-dourado`, afastado 3 px |

Os cartões surgem conforme entram na tela (`opacity` 0→1, `y` 16→0, 0,5 s, `power2.out`), exceto com animação reduzida.

## Conteúdo e assets

- `content.contagem.antes`, `.noDia`, `.depois`; `content.mensagem` (parágrafos, verso do louvor e assinatura); `content.dressCode`; `content.botoes.confirmar`, `.prazo`, `.comoChegar`, `.encerrado`.
- `config.casamento`, `config.prazoConfirmacao` e `config.links`.

## Casos de borda

| Situação | Reação |
| --- | --- |
| Aparelho em outro fuso (convidado viajando) | Contagem e estados iguais aos de Brasília |
| Relógio do aparelho errado | A contagem segue o relógio do aparelho; não há hora de servidor num site estático. Risco aceito |
| Convite aberto durante a virada do prazo | Na virada do minuto, o botão dá lugar ao aviso |
| Link aberto dentro do WhatsApp | O formulário e o mapa abrem em outra aba ou no navegador; voltar mantém o convite onde estava |
| Convite aberto na virada de 21 para 22/01/2027 | À meia-noite, na virada do minuto, a contagem dá lugar a "É hoje! Nos vemos às 17h."; a contagem nunca mostra zeros, porque o dia do casamento já é o estado "no dia" |

## Casos de teste

- **CT-07.1** Com `?data=2026-11-15T10:00`, conferir "Faltam 68 dias, 7 horas e 0 minutos". *(CA-07.1.1)*
- **CT-07.2** Mudar o fuso do computador para Lisboa e recarregar: mesma contagem. *(CA-07.1.2)*
- **CT-07.3** Com `?data=2027-01-21T16:59`, conferir "Faltam 1 dia, 0 horas e 1 minuto" (ou "Falta", conforme a decisão). *(CA-07.1.3)*
- **CT-07.4** Ler a mensagem e o traje e comparar com os textos aprovados. *(CA-07.2.1, CA-07.2.2)*
- **CT-07.5** Tocar em "Confirmar presença" no iPhone e no Android, pelo WhatsApp: o formulário abre e, ao voltar, o convite continua lá. *(CA-07.3.1, CA-07.3.2)*
- **CT-07.6** Tocar em "Como chegar": o endereço certo abre no mapa. *(CA-07.4.1)*
- **CT-07.7** Com `?data=` em 2026-12-31T23:59, 2027-01-01T00:00, 2027-01-22T10:00, 2027-01-22T20:00 e 2027-01-23T00:00, conferir os quatro estados. *(CA-07.5.1 a CA-07.5.5)*

## Questões em aberto

- "Faltam 1 dia" ou "Falta 1 dia" quando restar um só dia.
- Se os cartões têm título visível.
