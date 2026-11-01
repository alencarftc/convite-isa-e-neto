# Documentação do projeto

Convite digital interativo de Isabella Vaz e David Neto (casamento em 22/01/2027, 17h, Sítio Olinda,
Benevides–PA). Esta pasta é o **contexto de trabalho** do repositório: ler aqui é mais rápido que abrir
o Claude Docs, e é o que humanos e LLMs devem carregar antes de mexer no código.

## Mapa

| Arquivo                                            | Origem         | Use para                                                                                                          |
| -------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| [requisitos.md](./requisitos.md)                   | espelho        | briefing, decisões (27), roteiro aprovado, **textos do convite**, prompts de imagem, script do formulário         |
| [documentacao.md](./documentacao.md)               | espelho        | stack, pastas originais, animações, assets, integrações, testes, pendências                                       |
| [epicos-e-historias.md](./epicos-e-historias.md)   | espelho        | 12 épicos, 52 histórias, critérios de aceite (CA-xx.y.z), plano de entrega                                        |
| [specs/](./specs/README.md)                        | espelho        | uma spec por épico: comportamento, RF/RNF, desenho técnico, casos de teste                                        |
| [arquitetura.md](./arquitetura.md)                 | **neste repo** | camadas, regras de dependência, onde cada spec vai, receitas                                                      |
| [qualidade.md](./qualidade.md)                     | **neste repo** | gates, testes, dev server, commits, changesets, ignores                                                           |
| [operacao/](./operacao/confirmacao-de-presenca.md) | **neste repo** | passos que dependem de uma pessoa (formulário, planilha, acionadores): lista de conferência                       |
| [specs-adicionais/](./specs-adicionais/README.md)  | **neste repo** | revisão de consistência com o briefing e as SPEC-13 a SPEC-17 (aprovadas em 26/10/2026)                           |
| [decisions/](./decisions)                          | **neste repo** | ADRs: o que mudou em relação à documentação original e por quê                                                    |
| [specs-cena-viva/](./specs-cena-viva/README.md)    | **neste repo** | épico 13 em teste na branch `feat/cena-viva`: água, folhas, pássaros e esquilo (SPEC-18 a 21; a 22 foi revertida) |

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
  **SPEC-04**: baú, chave no inventário (usada no toque no baú), dica, reforço, abertura em 2 s com pétalas;
  **SPEC-05**: cinco balões com foto e frase, luz do pôr do sol na mesma linha do tempo, sem aceleração por toque, anúncio ao leitor de tela — fotos e descrições provisórias;
  **SPEC-06**: envelope que pousa sobre o baú, selo que se parte, carta que se desdobra com o casal ao fundo, pétalas e rolagem liberada; a carta e as informações no mesmo conteúdo;
  **SPEC-12**: orçamento de peso por arquivo e por grupo no `verificar`, arquivos citados em CSS/HTML conferidos, fluxo completo sem erro no console, Lighthouse medido (desempenho 89, acessibilidade 100, boas práticas 100, CLS 0) e matriz de testes em aparelhos;
  **SPEC-10**: metadados e prévia gerados de `content`/`config`, workflow de publicação no GitHub Pages, gate com endereço e serviços externos — faltam a imagem da prévia e os ícones;
  **SPEC-09**: animação reduzida, atalho de teclado, foco ao longo do caminho, modo de segurança, `<noscript>` gerado e contraste testado;
  **SPEC-11**: o botão e o encerramento já existiam; agora o `verificar` confere que os textos de prazo e de data batem com `config`, e há uma lista de conferência para a planilha e o formulário (passos manuais);
  **SPEC-07 completa**: contagem com números em destaque, mensagem do casal, traje e botões, cartões que surgem ao rolar;
  `verificar` com 3 regras;
  **specs adicionais 13 a 17** ([specs-adicionais](./specs-adicionais/README.md)): história estática para quem não vê os balões, "Pular" fixo na segunda visita, "Role para ler" sobre a carta, verso opcional, compatibilidade com aparelhos antigos e plano B (ADR-0009), deslizar o selo, selo na entrada e "Salvar na agenda" (texto novo a aprovar);
  **revisão do código** ([ADR-0010](./decisions/0010-revisao-do-codigo.md)): 14 defeitos corrigidos (baú e botões alcançáveis por leitor de tela, foco, pétalas, selo no Chrome 90, plano B, imagens só depois do toque…), com guardas de teste e lint para não voltarem.
- **Arte final** ([ADR-0011](./decisions/0011-arte-final-e-pipeline-de-imagens.md), 2026-10-27): as imagens geradas entraram (`pnpm arte` as prepara a partir de `arte/originais/`, dentro do orçamento de peso), com a imagem de prévia e os ícones; o `pnpm verificar` caiu de 45 para 17 pendências.
- **Ajustes depois dos testes no celular** ([ADR-0012](./decisions/0012-ajustes-de-experiencia-apos-testes-no-celular.md), 2026-10-27): tema só claro, selo com siglas na arte e transição ao tocar, baú com sombra e aura, chave no inventário entrando na horizontal, árvores menores, legenda dos balões, nada acelera por toque e "Pular" desde a primeira visita, casal maior na margem, papel em três partes, texto em tinta marrom, "Role para ler" animado e carta revelada bloco a bloco. Os espelhos das specs 04, 05, 06 e 14 e os dois Claude Docs ainda descrevem o comportamento antigo.
- **Teste da cena viva no celular** ([ADR-0014](./decisions/0014-ajustes-da-cena-viva-no-celular.md), 2026-10-31, só na branch `feat/cena-viva`): selo inteiro (não parte ao meio), envelope que espera o toque, papel da carta só ao abrir e com textura do início ao fim, balões em cascata de cerca de 5 s sem as fotos provisórias (frase dentro da nuvem), cena vertical com árvores, lago e rosas próprios, baú na grama, casal em pé de volta (SPEC-22 revertida) e o "&" dos nomes em linha própria.
- **Cena vertical e tema** ([ADR-0015](./decisions/0015-cena-vertical-da-pintura-mestre-e-aviso-de-tema.md), 2026-11-01, só na branch `feat/cena-viva`): no celular a cena é a pintura mestre 9:16 (jardim organizado, baú e casal no gramado), balões de 5 s um de cada vez com a frase em placa marfim, nomes da entrada em uma linha, papel dobrado sem fundo, casal que acompanha o mouse e `color-scheme: dark` contra o escurecimento forçado do celular.
- **Próximo:** o que depende do casal e de aparelhos reais: fotos dos balões (e as descrições), MP3, verso do louvor, matriz de testes ([lançamento](./operacao/lancamento.md)).
- **Pendências de conteúdo** (bloqueiam `pnpm verificar` e o envio): fotos dos balões, imagens geradas,
  músicas licenciadas e os 6 MP3 em `public/audio/`, **fotos dos balões** (hoje `assets/provisorio/foto-*.svg`) **e suas descrições**, **verso do louvor** (entre colchetes em `content.mensagem`), URL publicada. Lista completa no fim de [documentacao.md](./documentacao.md).
