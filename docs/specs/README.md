# Specs

> Espelho local da aba "Specs" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon

Cada épico tem uma spec, nas sub-abas desta aba. A spec diz como construir o que as histórias pedem: comportamento passo a passo, requisitos, desenho técnico, casos de borda e casos de teste. Os critérios de aceite ficam nas histórias; as specs apontam para eles e não os repetem.

## Índice

| Spec | Assunto | Histórias | Depende de |
| --- | --- | --- | --- |
| [SPEC-01](./SPEC-01-fundacao-tecnica.md) | Fundação técnica | US-01.1 a US-01.4 | — |
| [SPEC-02](./SPEC-02-entrada-e-carregamento.md) | Entrada e carregamento | US-02.1 a US-02.4 | SPEC-01, SPEC-08 |
| [SPEC-03](./SPEC-03-cena-do-bosque.md) | Cena do bosque | US-03.1 a US-03.4 | SPEC-01, SPEC-02 |
| [SPEC-04](./SPEC-04-bau-e-chave.md) | Baú e chave | US-04.1 a US-04.4 | SPEC-03, SPEC-08 |
| [SPEC-05](./SPEC-05-historia-em-baloes.md) | História em balões | US-05.1 a US-05.5 | SPEC-03, SPEC-04, SPEC-08 |
| [SPEC-06](./SPEC-06-carta-e-convite.md) | Carta e convite | US-06.1 a US-06.5 | SPEC-03, SPEC-05, SPEC-08 |
| [SPEC-07](./SPEC-07-informacoes-e-acoes.md) | Informações e ações | US-07.1 a US-07.5 | SPEC-06, SPEC-11 |
| [SPEC-08](./SPEC-08-audio.md) | Áudio | US-08.1 a US-08.5 | SPEC-01 |
| [SPEC-09](./SPEC-09-acessibilidade-e-alternativas.md) | Acessibilidade e alternativas | US-09.1 a US-09.5 | todas as de experiência |
| [SPEC-10](./SPEC-10-compartilhamento-e-publicacao.md) | Compartilhamento e publicação | US-10.1 a US-10.4 | SPEC-01 |
| [SPEC-11](./SPEC-11-confirmacao-de-presenca.md) | Confirmação de presença | US-11.1 a US-11.4 | — (já publicado) |
| [SPEC-12](./SPEC-12-desempenho-e-qualidade.md) | Desempenho e qualidade | US-12.1 a US-12.3 | todas |

## Modelo de cada spec

1. **Resumo:** o que a spec entrega, em duas ou três frases.
2. **Escopo:** o que está dentro e o que fica de fora.
3. **Comportamento:** a sequência vista pelo convidado, com tempos e gatilhos.
4. **Requisitos funcionais (RF) e não funcionais (RNF).**
5. **Desenho técnico:** arquivos, funções, eventos, parâmetros de animação e CSS.
6. **Conteúdo e assets:** o que a spec consome de `content.js`, `config.js` e das pastas de assets.
7. **Casos de borda:** o que pode dar errado e como o convite reage.
8. **Casos de teste (CT):** passos que verificam os critérios de aceite.
9. **Questões em aberto:** o que ainda precisa de decisão.

## Convenções

- **IDs:** `RF-04.3` é o terceiro requisito funcional da SPEC-04; `RNF-` e `CT-` seguem a mesma regra.
- **Tempos:** em segundos, como na timeline do GSAP (`0.6` = 600 ms). Os valores de referência ficam em `config.duracoes`; o código nunca escreve um tempo solto.
- **Proposta:** qualquer escolha técnica ainda não confirmada por você está marcada como *proposta*.
- **Horário:** todas as datas usam o horário de Brasília, UTC−3 (o mesmo de Benevides, PA).
