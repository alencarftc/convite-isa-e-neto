import { describe, expect, it } from 'vitest';

import { config } from '@/config/config';
import { content } from '@/config/content';
import {
  dobrarLinhaDeAgenda,
  escaparTextoDeAgenda,
  formatarInstanteParaAgenda,
  gerarEventoDeAgenda,
  gerarIcs,
  gerarLinkDoGoogleAgenda,
  montarEventoDeAgenda,
  URL_BASE_DO_GOOGLE_AGENDA,
} from '@/domain/agenda/evento-de-agenda';

const arquivo = gerarEventoDeAgenda(config, content);
const linhas = (ics: string) => ics.split('\r\n');

describe('formatarInstanteParaAgenda', () => {
  it('escreve o instante em UTC, sem separadores', () => {
    expect(formatarInstanteParaAgenda(Date.UTC(2027, 0, 22, 20, 0, 0))).toBe('20270122T200000Z');
  });
});

describe('montarEventoDeAgenda (RF-17.1)', () => {
  it('17h de Brasília (-03:00) são 20h em UTC, e o fim vem da duração da config', () => {
    const evento = montarEventoDeAgenda(config, content);

    expect(formatarInstanteParaAgenda(evento.inicio)).toBe('20270122T200000Z');
    expect(evento.fim - evento.inicio).toBe(config.agenda.duracaoEmHoras * 3_600_000);
  });

  it('só usa textos que o convite já tem: nomes, cerimônia, local, endereço, endereço do convite e mapa', () => {
    const evento = montarEventoDeAgenda(config, content);
    const { nomes, cerimonia, local, endereco } = content.carta;

    expect(evento.titulo).toBe(`${nomes.noiva} ${nomes.e} ${nomes.noivo} · ${cerimonia}`);
    expect(evento.local).toBe(`${local}, ${endereco}`);
    expect(evento.descricao).toContain(config.publicacao.url);
    expect(evento.descricao).toContain(config.links.mapa);
    expect(evento.descricao).toContain(content.botoes.comoChegar);
  });

  it('mudar config.casamento muda o evento (CT-17.3)', () => {
    const outro = gerarEventoDeAgenda(
      { ...config, casamento: '2027-03-05T18:30:00-03:00' },
      content,
    );

    expect(outro.ics).toContain('DTSTART:20270305T213000Z');
    expect(outro.ics).not.toContain('20270122');
    expect(
      new URL(outro.linkDoGoogle).searchParams.get('dates')?.startsWith('20270305T213000Z/'),
    ).toBe(true);
  });

  it('mudar a duração muda o fim', () => {
    const curto = gerarEventoDeAgenda(
      { ...config, agenda: { ...config.agenda, duracaoEmHoras: 2 } },
      content,
    );

    expect(curto.ics).toContain('DTEND:20270122T220000Z');
  });

  it('recusa data sem fuso, como o resto do convite (as datas são sempre de Brasília)', () => {
    expect(() =>
      gerarEventoDeAgenda({ ...config, casamento: '2027-01-22T17:00:00' }, content),
    ).toThrow(/sem fuso/);
  });
});

describe('arquivo .ics (RF-17.2)', () => {
  it('é um calendário com um evento, com início, fim, local, descrição e título', () => {
    const l = linhas(arquivo.ics);

    expect(l[0]).toBe('BEGIN:VCALENDAR');
    expect(l).toContain('VERSION:2.0');
    expect(l).toContain('BEGIN:VEVENT');
    expect(l).toContain('DTSTART:20270122T200000Z');
    expect(l).toContain('DTEND:20270123T020000Z');
    expect(l.some((linha) => linha.startsWith('SUMMARY:'))).toBe(true);
    expect(l.some((linha) => linha.startsWith('LOCATION:'))).toBe(true);
    expect(l.some((linha) => linha.startsWith('DESCRIPTION:'))).toBe(true);
    expect(l).toContain('END:VEVENT');
    expect(l.at(-2)).toBe('END:VCALENDAR');
  });

  it('usa só CRLF como fim de linha e termina com um', () => {
    expect(arquivo.ics.endsWith('\r\n')).toBe(true);
    expect(arquivo.ics.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/);
  });

  it('traz o lembrete na véspera (1 dia antes), como alarme na tela', () => {
    const l = linhas(arquivo.ics);

    expect(l).toContain('BEGIN:VALARM');
    expect(l).toContain('TRIGGER:-P1D');
    expect(l).toContain('ACTION:DISPLAY');
    expect(l).toContain('END:VALARM');
  });

  it('nenhuma linha passa de 75 bytes (UTF-8), e a dobra não parte um caractere', () => {
    const encoder = new TextEncoder();

    for (const linha of linhas(arquivo.ics)) {
      expect(encoder.encode(linha).length, linha).toBeLessThanOrEqual(75);
    }
    // desdobrando, o texto volta inteiro, com os acentos
    const desdobrado = arquivo.ics.replaceAll('\r\n ', '');
    expect(desdobrado).toContain('Cerimônia e recepção');
    expect(desdobrado).toContain(config.publicacao.url);
  });

  it('o UID é estável (o mesmo evento, o mesmo identificador): salvar duas vezes não duplica na maioria das agendas', () => {
    expect(arquivo.ics).toContain('UID:casamento-20270122T200000Z@convite');
    expect(gerarEventoDeAgenda(config, content).ics).toBe(arquivo.ics);
  });

  it('escapa vírgula, ponto e vírgula, barra e quebra de linha nos valores (RFC 5545)', () => {
    expect(escaparTextoDeAgenda('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
    const evento = { ...arquivo.evento, titulo: 'Festa, com; tudo', local: 'Rua A, 1' };

    const ics = gerarIcs(evento, 1);

    expect(ics).toContain('SUMMARY:Festa\\, com\\; tudo');
    expect(ics).toContain('LOCATION:Rua A\\, 1');
  });

  it('o nome do arquivo vem da config', () => {
    expect(arquivo.nomeDoArquivo).toBe(config.agenda.nomeDoArquivo);
    expect(arquivo.nomeDoArquivo.endsWith('.ics')).toBe(true);
  });
});

describe('dobrarLinhaDeAgenda', () => {
  it('deixa uma linha curta como está', () => {
    expect(dobrarLinhaDeAgenda('SUMMARY:curto')).toBe('SUMMARY:curto');
  });

  it('dobra uma linha longa em pedaços, cada continuação começando com um espaço', () => {
    const longa = `X:${'a'.repeat(200)}`;

    const dobrada = dobrarLinhaDeAgenda(longa);

    expect(dobrada.split('\r\n').length).toBeGreaterThan(2);
    expect(
      dobrada
        .split('\r\n')
        .slice(1)
        .every((parte) => parte.startsWith(' ')),
    ).toBe(true);
    expect(dobrada.replaceAll('\r\n ', '')).toBe(longa);
  });

  it('não parte um caractere de vários bytes ao meio', () => {
    const longa = `X:${'ç'.repeat(80)}${'😀'.repeat(20)}`;

    const dobrada = dobrarLinhaDeAgenda(longa);

    expect(dobrada.replaceAll('\r\n ', '')).toBe(longa);
    for (const parte of dobrada.split('\r\n')) {
      expect(new TextEncoder().encode(parte).length).toBeLessThanOrEqual(75);
    }
  });
});

describe('link do Google Agenda (RF-17.3, RNF-17.2)', () => {
  const link = new URL(arquivo.linkDoGoogle);

  it('é o endereço de criar evento do Google, com ação, título, datas, local e detalhes', () => {
    expect(arquivo.linkDoGoogle.startsWith(`${URL_BASE_DO_GOOGLE_AGENDA}?`)).toBe(true);
    expect(link.searchParams.get('action')).toBe('TEMPLATE');
    expect(link.searchParams.get('text')).toBe(arquivo.evento.titulo);
    expect(link.searchParams.get('dates')).toBe('20270122T200000Z/20270123T020000Z');
    expect(link.searchParams.get('location')).toBe(arquivo.evento.local);
    expect(link.searchParams.get('details')).toBe(arquivo.evento.descricao);
  });

  it('só carrega o que já está no convite: nenhum parâmetro além dos cinco', () => {
    expect([...link.searchParams.keys()].sort()).toEqual([
      'action',
      'dates',
      'details',
      'location',
      'text',
    ]);
  });

  it('é gerado do mesmo evento', () => {
    expect(gerarLinkDoGoogleAgenda(arquivo.evento)).toBe(arquivo.linkDoGoogle);
  });
});
