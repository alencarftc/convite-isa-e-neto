import type { ConfigConvite } from '../config/config-convite';
import type { ConteudoConvite } from '../conteudo/conteudo-convite';
import { analisarInstante } from '../tempo/tempo';

/** Endereço do Google Agenda que cria um evento a partir dos parâmetros (SPEC-17, RF-17.3). */
export const URL_BASE_DO_GOOGLE_AGENDA = 'https://calendar.google.com/calendar/render';

const FIM_DE_LINHA = '\r\n';
const MILISSEGUNDOS_POR_HORA = 3_600_000;
/** Limite do RFC 5545 para uma linha, em bytes (sem contar o fim de linha). */
const LIMITE_DA_LINHA = 75;

/** O evento do casamento, montado só com o que o convite já tem (SPEC-17, RF-17.1). */
export interface EventoDeAgenda {
  readonly titulo: string;
  /** Instante de início e de fim, em ms desde 1970 (UTC). */
  readonly inicio: number;
  readonly fim: number;
  readonly local: string;
  readonly descricao: string;
}

export interface ArquivoDeAgenda {
  readonly evento: EventoDeAgenda;
  /** O arquivo `.ics`, com o lembrete na véspera. */
  readonly ics: string;
  /** Link que cria o mesmo evento no Google Agenda, para quem não pode baixar arquivos. */
  readonly linkDoGoogle: string;
  readonly nomeDoArquivo: string;
}

type DadosDaConfig = Pick<ConfigConvite, 'casamento' | 'publicacao' | 'links' | 'agenda'>;
type DadosDoConteudo = Pick<ConteudoConvite, 'carta' | 'botoes'>;

/**
 * Monta o evento: início em `config.casamento`, duração em `config.agenda`, título com os nomes e a
 * cerimônia, local e endereço da carta, e na descrição o endereço do convite e o mapa. Nenhum texto
 * novo: tudo vem de `config` e `content`.
 */
export function montarEventoDeAgenda(
  config: DadosDaConfig,
  conteudo: DadosDoConteudo,
): EventoDeAgenda {
  const { nomes, cerimonia, local, endereco } = conteudo.carta;
  const inicio = analisarInstante(config.casamento);
  return {
    titulo: `${nomes.noiva} ${nomes.e} ${nomes.noivo} · ${cerimonia}`,
    inicio,
    fim: inicio + config.agenda.duracaoEmHoras * MILISSEGUNDOS_POR_HORA,
    local: `${local}, ${endereco}`,
    descricao: `${config.publicacao.url}\n${conteudo.botoes.comoChegar}: ${config.links.mapa}`,
  };
}

/** `20270122T200000Z`: o instante em UTC, no formato que as agendas esperam. */
export function formatarInstanteParaAgenda(instante: number): string {
  return new Date(instante)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** Escapa um valor de texto do iCalendar: barra, ponto e vírgula, vírgula e quebra de linha. */
export function escaparTextoDeAgenda(texto: string): string {
  return texto
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\n', '\\n');
}

function bytesDe(caractere: string): number {
  const ponto = caractere.codePointAt(0) ?? 0;
  if (ponto < 0x80) return 1;
  if (ponto < 0x800) return 2;
  if (ponto < 0x10000) return 3;
  return 4;
}

/**
 * Dobra uma linha em pedaços de até 75 bytes (UTF-8), como o RFC 5545 exige; cada continuação
 * começa com um espaço. Não parte um caractere ao meio.
 */
export function dobrarLinhaDeAgenda(linha: string): string {
  const pedacos: string[] = [];
  let atual = '';
  let bytes = 0;
  for (const caractere of linha) {
    const tamanho = bytesDe(caractere);
    // a continuação gasta 1 byte com o espaço do início
    const limite = pedacos.length === 0 ? LIMITE_DA_LINHA : LIMITE_DA_LINHA - 1;
    if (bytes + tamanho > limite) {
      pedacos.push(atual);
      atual = '';
      bytes = 0;
    }
    atual += caractere;
    bytes += tamanho;
  }
  pedacos.push(atual);
  return pedacos.join(`${FIM_DE_LINHA} `);
}

/** O arquivo `.ics` de um evento, com o lembrete `lembreteEmDias` antes (SPEC-17, RF-17.2). */
export function gerarIcs(evento: EventoDeAgenda, lembreteEmDias: number): string {
  const inicio = formatarInstanteParaAgenda(evento.inicio);
  const titulo = escaparTextoDeAgenda(evento.titulo);
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Convite de casamento//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:casamento-${inicio}@convite`,
    // O instante de criação não pode vir do relógio (o domínio é determinístico): o do início serve.
    `DTSTAMP:${inicio}`,
    `DTSTART:${inicio}`,
    `DTEND:${formatarInstanteParaAgenda(evento.fim)}`,
    `SUMMARY:${titulo}`,
    `LOCATION:${escaparTextoDeAgenda(evento.local)}`,
    `DESCRIPTION:${escaparTextoDeAgenda(evento.descricao)}`,
    'BEGIN:VALARM',
    `TRIGGER:-P${String(lembreteEmDias)}D`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${titulo}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return linhas.map(dobrarLinhaDeAgenda).join(FIM_DE_LINHA) + FIM_DE_LINHA;
}

/** Link do Google Agenda para o mesmo evento; só carrega o que já está no convite (RNF-17.2). */
export function gerarLinkDoGoogleAgenda(evento: EventoDeAgenda): string {
  const parametros: readonly (readonly [string, string])[] = [
    ['action', 'TEMPLATE'],
    ['text', evento.titulo],
    [
      'dates',
      `${formatarInstanteParaAgenda(evento.inicio)}/${formatarInstanteParaAgenda(evento.fim)}`,
    ],
    ['details', evento.descricao],
    ['location', evento.local],
  ];
  const consulta = parametros
    .map(([chave, valor]) => `${chave}=${encodeURIComponent(valor)}`)
    .join('&');
  return `${URL_BASE_DO_GOOGLE_AGENDA}?${consulta}`;
}

/** Tudo que o botão "Salvar na agenda" precisa: o arquivo, o link do Google e o nome do arquivo. */
export function gerarEventoDeAgenda(
  config: DadosDaConfig,
  conteudo: DadosDoConteudo,
): ArquivoDeAgenda {
  const evento = montarEventoDeAgenda(config, conteudo);
  return {
    evento,
    ics: gerarIcs(evento, config.agenda.lembreteEmDias),
    linkDoGoogle: gerarLinkDoGoogleAgenda(evento),
    nomeDoArquivo: config.agenda.nomeDoArquivo,
  };
}
