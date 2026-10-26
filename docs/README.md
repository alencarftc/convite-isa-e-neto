# Documentação do projeto

Convite digital interativo de Isabella Vaz e David Neto (casamento em 22/01/2027, 17h, Sítio Olinda,
Benevides–PA). Esta pasta é o **contexto de trabalho** do repositório: ler aqui é mais rápido que abrir
o Claude Docs, e é o que humanos e LLMs devem carregar antes de mexer no código.

## Mapa

| Arquivo                                            | Origem         | Use para                                                                                                  |
| -------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| [requisitos.md](./requisitos.md)                   | espelho        | briefing, decisões (27), roteiro aprovado, **textos do convite**, prompts de imagem, script do formulário |
| [documentacao.md](./documentacao.md)               | espelho        | stack, pastas originais, animações, assets, integrações, testes, pendências                               |
| [epicos-e-historias.md](./epicos-e-historias.md)   | espelho        | 12 épicos, 52 histórias, critérios de aceite (CA-xx.y.z), plano de entrega                                |
| [specs/](./specs/README.md)                        | espelho        | uma spec por épico: comportamento, RF/RNF, desenho técnico, casos de teste                                |
| [arquitetura.md](./arquitetura.md)                 | **neste repo** | camadas, regras de dependência, onde cada spec vai, receitas                                              |
| [qualidade.md](./qualidade.md)                     | **neste repo** | gates, testes, dev server, commits, changesets, ignores                                                   |
| [operacao/](./operacao/confirmacao-de-presenca.md) | **neste repo** | passos que dependem de uma pessoa (formulário, planilha, acionadores): lista de conferência               |
| [decisions/](./decisions)                          | **neste repo** | ADRs: o que mudou em relação à documentação original e por quê                                            |

**Espelho** = cópia do Claude Docs exportada em 2026-10-26; a fonte da verdade continua lá:

- Requisitos: <https://claude.ai/artifact/QStqWfkhab9otx2GTPFvGW>
- Documentação, épicos e specs: <https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon>

Os espelhos têm só um cabeçalho de proveniência e **não são reformatados** (`.prettierignore`). O
diagrama "Fluxo da experiência" da documentação é um widget e não foi exportado; o fluxo está descrito
nas tabelas das SPEC-01 e do roteiro (requisitos).

## Qual documento carregar para cada tarefa

| Tarefa                                               | Carregue                                                                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Qualquer mudança de código                           | [arquitetura.md](./arquitetura.md) + [qualidade.md](./qualidade.md)                                                                      |
| Implementar uma cena ou épico                        | a spec do épico + as histórias dele em [epicos-e-historias.md](./epicos-e-historias.md) + [SPEC-01](./specs/SPEC-01-fundacao-tecnica.md) |
| Escrever ou revisar um texto                         | seção "Textos do convite" de [requisitos.md](./requisitos.md)                                                                            |
| Cores, fontes, tokens                                | SPEC-01 (tokens) e "Paleta proposta" em requisitos                                                                                       |
| Som e música                                         | [SPEC-08](./specs/SPEC-08-audio.md)                                                                                                      |
| Datas, contagem, confirmação                         | [SPEC-07](./specs/SPEC-07-informacoes-e-acoes.md) e [SPEC-11](./specs/SPEC-11-confirmacao-de-presenca.md)                                |
| Acessibilidade, animação reduzida, modo de segurança | [SPEC-09](./specs/SPEC-09-acessibilidade-e-alternativas.md)                                                                              |
| Publicar, prévia do WhatsApp                         | [SPEC-10](./specs/SPEC-10-compartilhamento-e-publicacao.md), [SPEC-12](./specs/SPEC-12-desempenho-e-qualidade.md)                        |
| Gerar imagens                                        | "Imagens a gerar" em [requisitos.md](./requisitos.md)                                                                                    |
| Dúvida sobre "por que é assim"                       | "Decisões do roteiro" em requisitos e [decisions/](./decisions)                                                                          |

## Regras para manter a documentação

1. **Conteúdo e decisões de produto** mudam primeiro no Claude Docs (é a fonte); depois atualize o
   espelho. Se o espelho e a fonte divergirem, vale a fonte.
2. **Decisões técnicas do repositório** (arquitetura, ferramentas, convenções) moram em `arquitetura.md`,
   `qualidade.md` e `decisions/`. Mudou uma decisão? Escreva um ADR novo em vez de editar o antigo.
3. Mudou comportamento descrito numa spec? Atualize a spec **e** o caso de teste correspondente (CT-xx.y).
4. Textos do convite: `src/config/content.ts` deve bater, palavra por palavra, com
   "Textos do convite" em [requisitos.md](./requisitos.md).

## Estado atual (2026-10-26)

- **Feito:** fundação de ferramentas e CI; fatia vertical de referência — SPEC-07 (estados por data,
  contagem, botões) atravessando `domain` → `application` → `infrastructure` → `presentation`;
  **SPEC-01 completa** (barramento, fases, estado, orquestrador, contrato `Cena`, modo de segurança);
  **SPEC-08 (código)**: porta de áudio, Howler, botão de som, pausa em segundo plano — faltam os MP3;
  **SPEC-02**: entrada (névoa, nomes, toque), pré-carregamento crítico e secundário, fontes do próprio
  site — com arte provisória;
  **SPEC-03**: bosque em camadas, revelação da névoa e profundidade (mouse no computador, deriva no celular);
  **SPEC-04**: baú, chave (cursor ou flutuante), dica, reforço, abertura em 2 s com pétalas;
  **SPEC-05**: cinco balões com foto e frase, luz do pôr do sol na mesma linha do tempo, aceleração por toque, anúncio ao leitor de tela — fotos e descrições provisórias;
  **SPEC-06**: envelope que pousa sobre o baú, selo que se parte, carta que se desdobra com o casal ao fundo, pétalas e rolagem liberada; a carta e as informações no mesmo conteúdo;
  **SPEC-10**: metadados e prévia gerados de `content`/`config`, workflow de publicação no GitHub Pages, gate com endereço e serviços externos — faltam a imagem da prévia e os ícones;
  **SPEC-09**: animação reduzida, atalho de teclado, foco ao longo do caminho, modo de segurança, `<noscript>` gerado e contraste testado;
  **SPEC-11**: o botão e o encerramento já existiam; agora o `verificar` confere que os textos de prazo e de data batem com `config`, e há uma lista de conferência para a planilha e o formulário (passos manuais);
  **SPEC-07 completa**: contagem com números em destaque, mensagem do casal, traje e botões, cartões que surgem ao rolar;
  `verificar` com 3 regras.
- **Próximo:** SPEC-12 (desempenho e qualidade: orçamento de peso, matriz de testes, checagens de publicação).
- **Pendências de conteúdo** (bloqueiam `pnpm verificar` e o envio): fotos dos balões, imagens geradas,
  músicas licenciadas e os 6 MP3 em `public/audio/`, **troca da arte provisória** (`config.imagens`, fotos dos balões e suas descrições), **verso do louvor** (entre colchetes em `content.mensagem`), URL publicada. Lista completa no fim de [documentacao.md](./documentacao.md).
