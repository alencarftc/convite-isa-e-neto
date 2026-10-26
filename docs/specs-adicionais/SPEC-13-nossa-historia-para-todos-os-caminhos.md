# SPEC-13 · Nossa história para todos os caminhos

> **Aprovada em 26/10/2026.** Spec adicional do repositório (ainda fora do Claude Docs). Origem: B1 da [revisão](./README.md).

**Histórias:** US-13.1, US-13.2, US-13.3 · **Prioridade:** Must (recomendada) · **Pontos:** 5 · **Depende de:** SPEC-05, SPEC-07, SPEC-09

## Resumo

As fotos do casal e a história só existem na animação dos balões. Quem usa animação reduzida, toca em "Pular
para o convite", cai no modo de segurança ou abre sem JavaScript recebe a carta e as informações **sem nenhuma
foto**, embora "Fotografias" seja informação essencial no briefing e a noiva tenha pedido que o convite "conte um
pouco da história". Esta spec acrescenta, para esses caminhos, uma seção estática "A nossa história" logo abaixo da
carta, com as mesmas cinco fotos e frases dos balões.

## Escopo

**Dentro:** a seção estática, a regra de quando ela aparece, a falha de foto, o `<noscript>` e os testes.

**Fora:** os balões (SPEC-05), a escolha das fotos e das frases (conteúdo do casal) e qualquer texto novo visível
(ver "Questões em aberto").

## Comportamento

| Caminho                                   | Balões animados | "A nossa história" estática                          |
| ----------------------------------------- | --------------- | ---------------------------------------------------- |
| Completo (o convidado viu os balões)      | Sim             | **Não** (evita repetir)                              |
| Animação reduzida                         | Não             | **Sim**                                              |
| "Pular para o convite", atalho de teclado | Não             | **Sim**                                              |
| Modo de segurança                         | Não             | **Sim**, se as fotos carregarem; senão, só as frases |
| Sem JavaScript (`<noscript>`)             | Não             | **Sim**                                              |

Posição: depois da assinatura da carta e antes da contagem regressiva, dentro do mesmo `.conteudo` que rola sobre a
cena. Cada item é um cartão marfim (como os das informações): foto em círculo (160 a 200 px), a frase abaixo, na ordem
de `content.baloes`. Os cartões surgem ao entrar na tela, exceto com animação reduzida (SPEC-07, "Estilo").

## Requisitos funcionais

- **RF-13.1** A seção usa `content.baloes` (frase, foto, alt, foco): nenhum texto novo, nenhuma foto nova.
- **RF-13.2** Ela é montada pela cena final (informações) quando a história **não** rodou: `skip()` da cena final e
  o modo de segurança. No `run()` do caminho completo, não é montada.
- **RF-13.3** Foto ausente ou com erro: o cartão perde o círculo e fica só com a frase (mesma regra do RF-05.9).
- **RF-13.4** A foto do cartão recebe o mesmo tratamento fixo da dos balões (tom quente, borda esfumada, sem animar
  filtro) e o `alt` de `content.baloes[n].alt`.
- **RF-13.5** As imagens abaixo da dobra usam `loading="lazy"` e `decoding="async"`: quem pulou a história não paga os
  600 KB das cinco fotos de uma vez.
- **RF-13.6** O `<noscript>` gerado (SPEC-09, RF-09.9) inclui as cinco fotos e frases.
- **RF-13.7** A seção é uma região nomeada (`aria-label`) com `h3` por cartão **só para leitor de tela**; não há título
  visível novo.
- **RF-13.8** `pnpm verificar` não muda: as fotos e os textos já passam pelas regras de peso, arte provisória e texto
  pendente da SPEC-12.

## Requisitos não funcionais

- **RNF-13.1** Não aumenta o JavaScript crítico além de 1 kB gzip: reaproveita `criarFoto` e o estilo dos balões.
- **RNF-13.2** Não rouba o foco nem muda a ordem do Tab: os cartões não são interativos.

## Desenho técnico

- `presentation/informacoes/cartoes-da-historia.ts`: `montarHistoriaEstatica({ raiz, conteudo, config })`, que devolve
  o elemento e uma função de remoção. A foto em círculo vira um componente compartilhado
  (`presentation/historia/foto-em-circulo.ts`), extraído de `criarFoto` da cena da história.
- `cena-informacoes.ts`: `skip()` monta o bloco antes dos cartões de contagem; `run()` não monta.
- `scripts/vite/noscript.ts`: acrescenta as cinco `<img>` e frases.
- CSS: `styles/historia-estatica.css`, só com os tokens, classes BEM (`historia-estatica__cartao`).

## Casos de borda

| Situação                                       | Reação                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| As cinco fotos ainda são provisórias           | Aparecem (o `verificar` já bloqueia a publicação)                                                |
| Foto lenta                                     | O cartão aparece com a frase e a foto entra quando chegar, sem pular o layout (altura reservada) |
| Convidado do caminho completo vê só os balões  | Nada muda para ele                                                                               |
| Animação reduzida ligada **depois** de começar | O caminho escolhido continua (SPEC-09)                                                           |

## Casos de teste

- **CT-13.1** Com `prefers-reduced-motion`, abrir e tocar: a carta aparece e, abaixo dela, os cinco cartões com foto e frase.
- **CT-13.2** Na segunda visita, "Pular para o convite": os cinco cartões aparecem.
- **CT-13.3** Caminho completo: os cinco cartões **não** aparecem abaixo da carta.
- **CT-13.4** Renomear uma foto: o cartão fica só com a frase, sem espaço vazio.
- **CT-13.5** `?erro=historia`: modo de segurança com a carta, os cartões e as informações.
- **CT-13.6** Desligar o JavaScript: o `<noscript>` mostra fotos e frases.
- **CT-13.7** Leitor de tela: cada foto é lida com a descrição, e a frase vem depois.

## Questões em aberto

- Só para quem não viu os balões (recomendado) **ou para todos**, no fim da carta? A segunda opção garante que ninguém
  perca uma foto por ter acelerado a história, ao custo de repetir o conteúdo.
- Pode haver um título visível ("A nossa história")? Hoje não existe texto aprovado para isso.

## Implementação (26/10/2026)

Implementada na branch `feat/spec-13-historia-para-todos-os-caminhos`. Respostas adotadas para as questões em
aberto e desvios do desenho acima:

- **Só para quem não viu os balões**, sem título visível (as duas recomendações da spec).
- **`figure` e `figcaption` em vez de `h3` só para leitor de tela (RF-13.7):** não existe texto aprovado para um
  título, e inventar um só para o leitor de tela seria texto novo. A região continua nomeada (`aria-label` com
  `content.rotulos.historia`) e cada cartão é lido como "descrição da foto, depois a frase" (CT-13.7).
- **Sem animação ao rolar:** os cartões nascem visíveis, como os das informações no `skip()`. Todos os caminhos que
  mostram a história estática passam pelo `skip()` da cena final, então "animação reduzida" e "pular" ficam
  iguais, e o JavaScript crítico cresce só 0,2 kB gzip (RNF-13.1).
- **Componente compartilhado:** `foto-em-circulo.ts` (e a classe `.foto-em-circulo`, com o tom quente, a borda
  esfumada e o gradiente) serve aos balões e aos cartões; `.balao__foto` ficou só com a posição.
- **`<noscript>` e plano B:** o bloco de texto simples (`scripts/vite/texto-simples.ts`) ganhou as cinco `<img>`
  (`loading="lazy"`, mesmo recorte `object-position`) e frases, entre a carta e o traje.
- **Peso (RF-13.5):** só a partir da revisão do código (ADR-0010) quem pula deixa de baixar as fotos: os
  balões as pediam já na abertura da página. Agora elas ficam em `data-src` até a história começar, entram
  na fila secundária depois do toque e, no estado final, os cartões estáticos as pedem sob demanda.
- **Ordem no `.conteudo`:** carta, história estática, informações (teste em `composicao.test.ts`).
