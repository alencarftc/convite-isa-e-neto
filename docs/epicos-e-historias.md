# Épicos e histórias

> Espelho local do documento "Épicos e histórias" (Claude Docs), exportado em 2026-10-26.
> Fonte da verdade: https://claude.ai/artifact/ECT6cdhzXhaC2bxqjdEhon (aba Épicos e histórias)
> Ao divergir, vale o documento de origem; atualize este arquivo e registre a mudança em `docs/decisions/` se for uma decisão.

O convite está dividido em 12 épicos e 52 histórias de usuário, cada uma com critérios de aceite verificáveis. Tudo aqui deriva do roteiro aprovado (rascunho 2), dos textos aprovados e das decisões registradas no documento de requisitos. Nada introduz requisito novo sem marcar.

## Personas

| Persona | Quem é | O que precisa | Contexto de uso |
| --- | --- | --- | --- |
| **Convidado** | Um membro de cada família convidada, de qualquer idade, inclusive pessoas pouco acostumadas com tecnologia | Sentir-se verdadeiramente convidado, entender o convite sem esforço e confirmar a presença da família | Recebe o link pelo WhatsApp e abre no celular, muitas vezes no navegador interno do aplicativo, às vezes sem fone, em lugar barulhento ou com o aparelho no silencioso |
| **Casal** | Isabella Vaz e David Neto | Que cada família sinta o amor, a alegria e a gratidão que eles estão vivendo, e saber quem vai | Acompanha as confirmações pela planilha até 31/12/2026 |
| **Desenvolvedor** | Felipe, que constrói, publica e mantém o convite | Uma base organizada para montar a experiência, trocar textos e links sem quebrar a animação e publicar com segurança | Desenvolve entre 03 e 08/11/2026, testa até 10/11 e envia até 15/11 |

## Como ler

- **IDs:** os épicos são `EP-01` a `EP-12`; as histórias são `US-<épico>.<número>` (por exemplo, `US-04.2`); os critérios de aceite são `CA-<história>.<número>`. Cada épico tem a spec de mesmo número (`EP-04` → `SPEC-04`).
- **Prioridade (MoSCoW):**
    - **Must:** sem isso o convite não vai para o ar.
    - **Should:** importante; entra se o prazo permitir.
    - **Could:** melhoria; sai sem prejuízo se faltar tempo.
- **Pontos:** esforço relativo em Fibonacci (1, 2, 3, 5, 8). 1 ponto é uma tarefa pequena de poucas horas; 8 pontos é o maior bloco que ainda cabe numa história.
- **Critérios de aceite:** no formato Dado / Quando / Então. Uma história só está pronta quando todos os critérios passam no celular (iPhone e Android, pelo WhatsApp) e no computador.
- **Definição de pronto (vale para todas):** critérios de aceite passando; sem erros no console; textos iguais aos aprovados; funciona com animação reduzida e sem som; código no repositório e publicado na prévia.

## Mapa dos épicos

Os épicos seguem a ordem em que o convidado vive a experiência, com a fundação técnica antes e a qualidade depois. Somam 132 pontos; 40 histórias são Must.

| ID | Épico | Objetivo | Persona | Prioridade | Histórias | Pontos | Spec |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EP-01 | Fundação técnica | Base de código que encadeia as cenas e separa conteúdo de animação | Desenvolvedor | Must | 4 | 12 | SPEC-01 |
| EP-02 | Entrada e carregamento | Primeira impressão imediata, carregamento invisível e liberação do som | Convidado | Must | 4 | 13 | SPEC-02 |
| EP-03 | Cena do bosque | Um bosque pintado, com profundidade e luz que passa ao pôr do sol | Convidado | Must | 4 | 14 | SPEC-03 |
| EP-04 | Baú e chave | O primeiro gesto do convidado: usar a chave para abrir o baú | Convidado | Must | 4 | 9 | SPEC-04 |
| EP-05 | História em balões | Contar a história do casal em cinco balões com fotos e frases | Convidado, Casal | Must | 5 | 12 | SPEC-05 |
| EP-06 | Carta e convite | Abrir o envelope e revelar a carta de amor com o convite | Convidado | Must | 5 | 15 | SPEC-06 |
| EP-07 | Informações e ações | Contagem, mensagem, dress code, confirmar presença e como chegar | Convidado | Must | 5 | 11 | SPEC-07 |
| EP-08 | Áudio | Ambiente, efeitos e as duas músicas, com controle do convidado | Convidado | Must | 5 | 11 | SPEC-08 |
| EP-09 | Acessibilidade e alternativas | Funcionar para todos: sem animação, sem som, com leitor de tela, em caso de falha | Convidado | Must | 5 | 13 | SPEC-09 |
| EP-10 | Compartilhamento e publicação | Prévia bonita no WhatsApp e publicação segura | Convidado, Desenvolvedor | Must | 4 | 8 | SPEC-10 |
| EP-11 | Confirmação de presença | Coletar e acompanhar as confirmações por família até 31/12/2026 | Convidado, Casal | Must | 4 | 6 | SPEC-11 |
| EP-12 | Desempenho e qualidade | Abrir rápido em 4G e funcionar no navegador do WhatsApp | Convidado, Desenvolvedor | Must | 3 | 8 | SPEC-12 |

## Histórias de usuário

### EP-01 · Fundação técnica

| ID | História | Prioridade | Pontos |
| --- | --- | --- | --- |
| US-01.1 | Como desenvolvedor, quero um repositório com Vite, a estrutura de pastas definida e os comandos de desenvolvimento e build, para desenvolver no computador e testar no celular desde o primeiro dia. | Must | 3 |
| US-01.2 | Como desenvolvedor, quero todos os textos em `content.js` e datas, links e durações em `config.js`, para mudar um texto, um link ou um tempo sem mexer na animação. | Must | 2 |
| US-01.3 | Como desenvolvedor, quero tokens de design (cores, fontes, tamanhos, espaçamentos e camadas) em variáveis CSS, para manter a identidade igual em todas as cenas. | Must | 2 |
| US-01.4 | Como desenvolvedor, quero um orquestrador que encadeie as cenas como etapas e eventos nomeados, para esperar toques, pular etapas e tratar falhas num só lugar. | Must | 5 |

**Critérios de aceite**

- **CA-01.1.1** Dado o repositório clonado, quando rodo `npm install` e `npm run dev`, então o site abre em `localhost:5173` sem erros no console.
- **CA-01.1.2** Dado `npm run dev -- --host`, quando abro o endereço de rede no celular, na mesma rede Wi-Fi, então vejo a mesma página.
- **CA-01.1.3** Dado `npm run build`, então a pasta `dist/` é gerada com caminhos que funcionam numa subpasta do GitHub Pages.
- **CA-01.2.1** Dado um texto alterado em `content.js`, quando recarrego a página, então o texto novo aparece e nenhuma animação muda.
- **CA-01.2.2** Dada uma duração alterada em `config.js`, então a timeline correspondente usa o novo valor.
- **CA-01.2.3** Nenhum texto visível ao convidado está escrito direto no HTML ou no código das cenas, exceto o conteúdo de `<noscript>`.
- **CA-01.3.1** Todas as cores, fontes e camadas (`z-index`) usam variáveis CSS; nenhum código de cor aparece fora do arquivo de tokens.
- **CA-01.3.2** As fontes carregam do próprio site, em WOFF2, sem pedido a servidores externos.
- **CA-01.4.1** No fluxo normal, as etapas rodam nesta ordem: entrada, bosque, baú, história, carta, convite, informações.
- **CA-01.4.2** Dado o comando de pular, o orquestrador leva ao estado final (carta aberta e informações) sem tocar as etapas intermediárias.
- **CA-01.4.3** Dado um erro em qualquer etapa, o orquestrador mostra a carta e as informações (modo de segurança) e registra o erro no console.

### EP-02 · Entrada e carregamento

| ID | História | Prioridade | Pontos |
| --- | --- | --- | --- |
| US-02.1 | Como convidado, quero ver a névoa e os nomes do casal assim que abro o link, para saber logo que é o convite e que está funcionando. | Must | 3 |
| US-02.2 | Como convidado, quero um convite claro para tocar e aumentar o volume, para começar no meu tempo e ouvir o som. | Must | 2 |
| US-02.3 | Como convidado, quero que as imagens carreguem por trás da névoa, para nunca ver o bosque pela metade. | Must | 5 |
| US-02.4 | Como convidado com internet lenta, quero que o convite siga mesmo assim, para não ficar preso na névoa. | Should | 3 |

**Critérios de aceite**

- **CA-02.1.1** Dada uma conexão 4G, quando abro o link, então a névoa e "Isabella & David" aparecem em até 1,5 s.
- **CA-02.1.2** A névoa se move devagar desde o primeiro quadro; a tela nunca fica parada nem branca (o fundo inicial é marfim no próprio HTML).
- **CA-02.2.1** Quando as imagens críticas terminam de carregar, aparecem "Toque para entrar" e "Para uma experiência completa, aumente o volume.".
- **CA-02.2.2** Um toque em qualquer ponto da tela inicia a experiência; no computador, Enter ou Espaço também iniciam.
- **CA-02.3.1** "Toque para entrar" só aparece depois que as imagens críticas (lista na SPEC-02) carregaram e foram decodificadas.
- **CA-02.3.2** As demais imagens e os áudios carregam em segundo plano, na ordem em que são usados; nenhuma imagem aparece sendo desenhada aos pedaços.
- **CA-02.4.1** Dado que as imagens críticas levam mais de 8 s, "Toque para entrar" aparece mesmo assim, e a névoa só se dissipa quando o bosque estiver pronto.
- **CA-02.4.2** Dado que, 20 s depois do toque, o bosque ainda não carregou, o convite vai para o modo de segurança (carta e informações).

### EP-03 · Cena do bosque

| ID | História | Prioridade | Pontos |
| --- | --- | --- | --- |
| US-03.1 | Como convidado, quero ver a névoa se dissipar e o bosque surgir, para sentir que entrei num lugar. | Must | 3 |
| US-03.2 | Como convidado, quero perceber profundidade na cena, para que ela pareça viva. | Should | 3 |
| US-03.3 | Como convidado, quero ver a luz passar de baunilha para dourada durante a história, para sentir o tempo correr até o pôr do sol. | Must | 3 |
| US-03.4 | Como convidado, quero a cena bem composta no meu aparelho, em pé ou deitado, para nada ficar cortado. | Must | 5 |

**Critérios de aceite**

- **CA-03.1.1** Dado o toque de entrada, a névoa some em 3 s e revela céu, lago, árvores, primeiro plano e baú.
- **CA-03.1.2** Durante esses 3 s, a cena se aproxima levemente (escala de 1,06 para 1) e termina com o baú em destaque.
- **CA-03.2.1** No computador, as camadas acompanham o mouse até 24 px; as mais próximas se movem mais.
- **CA-03.2.2** No celular, as camadas fazem uma deriva lenta e automática de até 6 px.
- **CA-03.2.3** Com animação reduzida ativada, não há movimento de profundidade.
- **CA-03.3.1** Durante os 15 s da história, o céu de pôr do sol aparece aos poucos e as camadas ganham um tom quente.
- **CA-03.3.2** Quando a carta abre, a cena já está no pôr do sol.
- **CA-03.4.1** Na vertical, a cena usa as artes 9:16; na horizontal, as 16:9.
- **CA-03.4.2** O baú fica sempre visível e inteiro em larguras de 320 a 1920 px.
- **CA-03.4.3** A altura da cena acompanha a área visível do navegador do celular; girar o aparelho recompõe a cena sem recarregar.

### EP-04 · Baú e chave

| ID | História | Prioridade | Pontos |
| --- | --- | --- | --- |
| US-04.1 | Como convidado no computador, quero que o cursor vire uma chave, para entender que posso abrir algo. | Must | 2 |
| US-04.2 | Como convidado no celular, quero ver a chave flutuando junto à fechadura e a dica "Toque na chave", para saber onde tocar. | Must | 3 |
| US-04.3 | Como convidado, quero ver a chave girar e o baú abrir quando toco, para sentir que fui eu que abri o convite. | Must | 3 |
| US-04.4 | Como convidado que não percebeu o que fazer, quero uma dica mais evidente, para não ficar parado na cena. | Could | 1 |

**Critérios de aceite**

- **CA-04.1.1** Dado um aparelho com mouse, quando o bosque termina de surgir, o cursor sobre a cena vira a chave (48 px).
- **CA-04.1.2** Com o cursor sobre o baú, a chave brilha e o baú ganha um contorno de luz suave; sobre botões e textos, o cursor volta ao normal.
- **CA-04.2.1** Dada uma tela de toque, a chave flutua junto à fechadura, subindo e descendo até 6 px, com brilho pulsando.
- **CA-04.2.2** A dica "Toque na chave" aparece 1,5 s depois que o bosque termina de surgir.
- **CA-04.2.3** A área de toque inclui a chave e o baú inteiro, com pelo menos 48 × 48 px.
- **CA-04.3.1** Dado um toque ou clique no baú ou na chave, a chave entra na fechadura e gira 90° em 0,6 s, com som.
- **CA-04.3.2** Em seguida, a tampa se abre com um pequeno salto e sai uma luz dourada; o passo inteiro leva 2 s.
- **CA-04.3.3** Toques repetidos durante a abertura são ignorados.
- **CA-04.4.1** Dados 8 s sem interação no bosque, a chave e o baú pulsam mais forte e a dica aparece de novo ("Use a chave para abrir" no computador, "Toque na chave" no celular).

### EP-05 · História em balões

| ID | História | Prioridade | Pontos |
| --- | --- | --- | --- |
| US-05.1 | Como convidado, quero ver cinco balões subindo do baú, cada um com uma foto e uma frase, para conhecer a história do casal. | Must | 5 |
| US-05.2 | Como convidado, quero tempo para ler cada frase, para não perder nada. | Must | 2 |
| US-05.3 | Como convidado, quero acelerar a história com um toque, para seguir quando já li. | Should | 2 |
| US-05.4 | Como casal, quero que as fotos combinem com a pintura, para a cena não parecer uma colagem. | Should | 2 |
| US-05.5 | Como convidado que usa leitor de tela, quero ouvir as frases, para acompanhar a história. | Should | 1 |

**Critérios de aceite**

- **CA-05.1.1** Dado o baú aberto, cinco balões saem um depois do outro, na ordem de `content.js`.
- **CA-05.1.2** Cada balão mostra uma foto recortada em círculo no centro e a frase logo abaixo; as frases são idênticas às aprovadas.
- **CA-05.1.3** Os balões alternam as três variações de nuvem, sem repetir a mesma em seguida.
- **CA-05.2.1** Cada frase fica inteira, parada e legível por pelo menos 2 s; cada balão ocupa 3 s; a história inteira leva 15 s.
- **CA-05.3.1** Dado um toque durante a história, a velocidade triplica até o fim do balão atual e depois volta ao normal; nenhuma frase é pulada.
- **CA-05.3.2** A dica "Toque para avançar" aparece no primeiro balão e some depois de 3 s.
- **CA-05.4.1** As fotos recebem um leve tom quente e borda esfumada dentro do balão, sem alterar rostos.
- **CA-05.4.2** Cada foto pesa até 120 KB.
- **CA-05.5.1** A área da história anuncia cada frase uma vez ao leitor de tela, e cada foto tem texto alternativo vindo de `content.js`.

### EP-06 · Carta e convite

| ID | História | Prioridade | Pontos |
| --- | --- | --- | --- |
| US-06.1 | Como convidado, quero ver um envelope pousar sobre o baú, com selo de cera azul, para perceber que o convite chegou. | Must | 3 |
| US-06.2 | Como convidado, quero tocar no selo e abrir eu mesmo o envelope, para sentir que estou abrindo um convite entregue a mim. | Must | 3 |
| US-06.3 | Como convidado que não tocou, quero que a carta abra sozinha, para não ficar esperando sem saber o que fazer. | Must | 1 |
| US-06.4 | Como convidado, quero ver a carta se desdobrar com o casal ao pôr do sol ao fundo, para viver o momento mais emocionante. | Must | 5 |
| US-06.5 | Como convidado, quero ler a carta completa, para saber de quem é o convite, quando e onde será o casamento. | Must | 3 |

**Critérios de aceite**

- **CA-06.1.1** Quando o último balão some, o envelope desce e pousa sobre o baú em 1,2 s, endireitando uma leve inclinação.
- **CA-06.1.2** O envelope mostra "Para você e sua família" e o selo azul com as iniciais I&D em dourado; a dica "Toque no selo" aparece 0,5 s depois que ele pousa.
- **CA-06.2.1** Dado um toque no selo ou em qualquer parte do envelope, o selo se rompe (0,4 s, com som), a aba abre (0,6 s) e a carta sai do envelope.
- **CA-06.2.2** A área de toque do selo tem pelo menos 64 × 64 px.
- **CA-06.3.1** Dados 4 s sem toque depois que o envelope pousa, a abertura começa sozinha, igual à do toque.
- **CA-06.4.1** A carta se desdobra em 1,2 s, com a cena ao fundo já no pôr do sol.
- **CA-06.4.2** O casal pintado aparece de costas ao fundo em 1,5 s, e a música 2 entra com transição de cerca de 2 s; o passo inteiro leva cerca de 7 s.
- **CA-06.5.1** A carta mostra, nesta ordem: Eclesiastes 4:9,12; a bênção dos pais com os quatro nomes; Isabella Vaz & David Neto; o texto do convite; data e horário; local e endereço; Mateus 19:6; "Com amor, Isabella & David".
- **CA-06.5.2** Os textos são idênticos aos aprovados; nomes em Great Vibes, textos em Cormorant Garamond, na cor #32425D, com corpo de pelo menos 18 px no celular.

### EP-07 · Informações e ações

| ID | História | Prioridade | Pontos |
| --- | --- | --- | --- |
| US-07.1 | Como convidado, quero ver quanto falta para o casamento, para sentir a expectativa e não esquecer a data. | Must | 3 |
| US-07.2 | Como convidado, quero ler a mensagem do casal e o dress code, para entender o tom da festa e como me vestir. | Must | 2 |
| US-07.3 | Como convidado, quero confirmar a presença da família com um toque, para responder sem procurar outro lugar. | Must | 2 |
| US-07.4 | Como convidado, quero abrir o endereço no meu aplicativo de mapas, para chegar ao Sítio Olinda sem errar. | Must | 1 |
| US-07.5 | Como convidado que abre o link mais tarde, quero ver informações certas para aquele momento, para não tentar confirmar fora do prazo nem ver uma contagem errada. | Must | 3 |

**Critérios de aceite**

- **CA-07.1.1** Abaixo da carta aparece "Faltam [dd] dias, [hh] horas e [mm] minutos para o nosso sim".
- **CA-07.1.2** O cálculo usa 22/01/2027 às 17h no horário de Brasília (UTC−3), seja qual for o fuso do aparelho.
- **CA-07.1.3** A contagem atualiza a cada minuto e usa singular e plural corretos (1 dia, 1 hora, 1 minuto).
- **CA-07.2.1** A mensagem do casal é idêntica à aprovada, com o verso do louvor já inserido.
- **CA-07.2.2** O dress code aparece como "Traje: esporte fino".
- **CA-07.3.1** O botão principal "Confirmar presença" tem abaixo "Confirme até 31 de dezembro de 2026." e altura de pelo menos 48 px.
- **CA-07.3.2** O botão abre forms.gle/yviZrELgrH2zrRGc7 fora do convite (nova aba ou navegador), sem perder o convite.
- **CA-07.4.1** O botão "Como chegar" abre R. Nações Unidas, 407, Benevides (PA) no aplicativo de mapas do aparelho ou no Google Maps.
- **CA-07.5.1** Até 31/12/2026 às 23h59 (UTC−3), o botão de confirmação está ativo.
- **CA-07.5.2** De 01/01/2027 até o casamento, o botão dá lugar a "As confirmações foram encerradas em 31 de dezembro de 2026.".
- **CA-07.5.3** Em 22/01/2027, a contagem dá lugar a "É hoje! Nos vemos às 17h.".
- **CA-07.5.4** A partir de 23/01/2027, aparece "Obrigado por fazer parte da nossa história. Com amor, Isabella & David", sem contagem nem botão de confirmação.
- **CA-07.5.5** Os quatro estados podem ser testados com uma data simulada, só no ambiente de desenvolvimento.

### EP-08 · Áudio

| ID | História | Prioridade | Pontos |
| --- | --- | --- | --- |
| US-08.1 | Como convidado, quero ouvir o som do bosque assim que entro, para me sentir dentro da cena. | Must | 2 |
| US-08.2 | Como convidado, quero ouvir a chave, a tampa e o selo, para que cada gesto tenha resposta. | Should | 2 |
| US-08.3 | Como convidado, quero uma música na história e outra na revelação do convite, para a emoção crescer até a carta. | Must | 3 |
| US-08.4 | Como convidado, quero ligar e desligar o som quando quiser, para abrir o convite em qualquer lugar. | Must | 2 |
| US-08.5 | Como convidado, quero que o som pare quando saio do convite, para não ouvir música com o aplicativo em segundo plano. | Must | 2 |

**Critérios de aceite**

- **CA-08.1.1** Dado o toque de entrada, o som ambiente (vento leve, grama, aves) começa com esmaecimento de 2 s e toca em loop sem emenda audível.
- **CA-08.2.1** O som da fechadura acompanha o giro da chave, o da tampa acompanha a abertura e o do selo acompanha o rompimento, com diferença máxima de 100 ms.
- **CA-08.3.1** A música 1 ("Bondade de Deus") entra com esmaecimento de 2 s no início da história, e o ambiente baixa.
- **CA-08.3.2** Quando o envelope abre, há uma transição de cerca de 2 s para a música 2 ("Ousado Amor"), que toca uma vez; quando termina, o ambiente volta ao volume normal.
- **CA-08.4.1** O botão de som fica fixo no canto superior direito desde a entrada, com 44 × 44 px, e alterna entre "Som ligado" e "Som desligado".
- **CA-08.4.2** A escolha vale para todos os sons e é lembrada na próxima visita no mesmo aparelho.
- **CA-08.5.1** Dado que troco de aplicativo ou bloqueio a tela, todo o som pausa; ao voltar, retoma de onde parou, se estava ligado.

### EP-09 · Acessibilidade e alternativas

| ID | História | Prioridade | Pontos |
| --- | --- | --- | --- |
| US-09.1 | Como convidado com animação reduzida ativada no aparelho, quero ver o convite sem movimentos grandes, para não me sentir mal. | Must | 3 |
| US-09.2 | Como convidado que volta ao convite, quero pular a abertura, para ir direto ao mapa ou à confirmação. | Should | 2 |
| US-09.3 | Como convidado que usa leitor de tela ou teclado, quero percorrer o convite inteiro, para receber o mesmo convite que todos. | Should | 3 |
| US-09.4 | Como convidado com dificuldade de visão, quero textos com bom contraste e tamanho, e poder dar zoom, para ler sem esforço. | Must | 2 |
| US-09.5 | Como convidado, quero ver a carta e as informações mesmo se a animação falhar, para nunca ficar sem o convite. | Must | 3 |

**Critérios de aceite**

- **CA-09.1.1** Com animação reduzida ativada, a entrada mantém o toque (para liberar o som), a névoa some num esmaecimento de 0,4 s e a carta aparece já aberta, com as informações.
- **CA-09.1.2** Nesse modo não há profundidade, balões nem desdobramento; o som continua funcionando.
- **CA-09.2.1** Depois que o convite foi aberto uma vez no aparelho, a entrada mostra também "Pular para o convite".
- **CA-09.2.2** Ao tocar em "Pular para o convite", o convidado vai direto à carta aberta e às informações, com a música 2 se o som estiver ligado.
- **CA-09.3.1** Imagens decorativas ficam ocultas ao leitor de tela; cada etapa interativa é um botão com rótulo ("Entrar", "Abrir o baú", "Abrir o envelope").
- **CA-09.3.2** Ao abrir a carta, o foco vai para o título da carta; a ordem do Tab segue a ordem de leitura e o foco é sempre visível.
- **CA-09.4.1** Todo texto tem contraste de pelo menos 4,5:1 (o azul-noite sobre marfim tem 9,1:1) e corpo de pelo menos 18 px no celular.
- **CA-09.4.2** O zoom do navegador não é bloqueado, e todo texto é HTML, nunca imagem.
- **CA-09.5.1** Sem JavaScript, o `<noscript>` mostra a carta e os botões em texto simples.
- **CA-09.5.2** Com erro na animação ou imagem faltando, o modo de segurança mostra a carta e as informações em até 1 s depois do erro.

### EP-10 · Compartilhamento e publicação

| ID | História | Prioridade | Pontos |
| --- | --- | --- | --- |
| US-10.1 | Como convidado, quero ver uma prévia bonita do link no WhatsApp, para saber do que se trata antes de abrir. | Must | 2 |
| US-10.2 | Como convidado, quero reconhecer o convite na aba e na tela inicial, para encontrá-lo de novo. | Should | 1 |
| US-10.3 | Como desenvolvedor, quero publicar no GitHub Pages a cada envio de código, para corrigir algo rapidamente sem risco de derrubar o convite. | Must | 3 |
| US-10.4 | Como casal, quero o convite num endereço próprio, para o link parecer mais pessoal. | Could | 2 |

**Critérios de aceite**

- **CA-10.1.1** Ao colar o link no WhatsApp, aparece a imagem 1200 × 630 (bosque com o selo I&D), o título "Isabella & David — Convite de casamento" e a descrição "Uma carta foi escrita para você. Toque para abrir.".
- **CA-10.1.2** A imagem da prévia pesa até 300 KB e é indicada por endereço completo com `https://`.
- **CA-10.2.1** A aba do navegador mostra o selo com I&D e o título do convite; ao salvar na tela inicial do iPhone, aparece o ícone de 180 px.
- **CA-10.3.1** Um envio para a branch `main` publica o site no GitHub Pages em até 5 min, por GitHub Actions, com endereço `https`.
- **CA-10.3.2** Se o build falhar, a versão anterior continua no ar.
- **CA-10.4.1** Se o domínio próprio for adotado, o convite abre nele com `https`, o endereço do GitHub redireciona para ele, e os metadados da prévia apontam para o domínio. A decisão precisa vir antes do primeiro envio, porque o WhatsApp guarda a prévia.

### EP-11 · Confirmação de presença

| ID | História | Prioridade | Pontos |
| --- | --- | --- | --- |
| US-11.1 | Como convidado, quero confirmar a presença da família informando quem vai, com nome e idade, para o casal se preparar para todos. | Must | 2 |
| US-11.2 | Como casal, quero ver cada confirmação numa planilha, para acompanhar quem vai. | Must | 1 |
| US-11.3 | Como casal, quero um resumo com os totais, para saber quantas pessoas esperar sem contar linha por linha. | Should | 2 |
| US-11.4 | Como casal, quero que o formulário pare de aceitar respostas depois do prazo, para fechar a lista sem esforço. | Must | 1 |

**Critérios de aceite**

- **CA-11.1.1** O formulário pede nome da família ou do responsável, WhatsApp, se a família vai, quantas pessoas vão e nome e idade de cada uma, com recado opcional. *Situação: formulário publicado em 26/10/2026; falta o teste.*
- **CA-11.1.2** Quem responde "Infelizmente não poderemos ir" vai direto para o recado.
- **CA-11.2.1** Cada resposta aparece como uma linha na planilha "Confirmações — Isabella & David" em poucos segundos, e o casal tem acesso a ela.
- **CA-11.3.1** A aba "Resumo" mostra quantas famílias vão, quantas não vão e o total de pessoas confirmadas.
- **CA-11.3.2** Respostas repetidas com o mesmo WhatsApp ficam destacadas para revisão.
- **CA-11.4.1** A partir de 01/01/2027 à meia-noite (UTC−3), o formulário não aceita respostas e mostra "As confirmações foram encerradas em 31 de dezembro de 2026.". *Situação: agendado pelo script.*

### EP-12 · Desempenho e qualidade

| ID | História | Prioridade | Pontos |
| --- | --- | --- | --- |
| US-12.1 | Como convidado com internet móvel, quero que o convite abra rápido, para não desistir antes de começar. | Must | 3 |
| US-12.2 | Como convidado, quero que tudo funcione quando abro o link dentro do WhatsApp, para não precisar trocar de navegador. | Must | 3 |
| US-12.3 | Como desenvolvedor, quero um checklist de testes cumprido antes do envio, para que nenhum convidado encontre erro. | Must | 2 |

**Critérios de aceite**

- **CA-12.1.1** Em 4G, a névoa e os nomes aparecem em até 1,5 s, e "Toque para entrar" em até 4 s.
- **CA-12.1.2** O carregamento crítico tem até 1,8 MB; o JavaScript, até 120 KB comprimido; o total, com áudio, até 8 MB.
- **CA-12.2.1** A experiência completa funciona no navegador interno do WhatsApp no iPhone e no Android: toques, som, abertura do formulário e do mapa.
- **CA-12.3.1** Todos os itens do checklist de testes estão marcados, com aparelho e data, até 10/11/2026.
- **CA-12.3.2** As respostas de teste foram apagadas da planilha antes do envio.

## Plano de entrega

> [Diagrama/gráfico interativo omitido na exportação: Plano de entrega · 26/10 a 15/11/2026]

Os dias de desenvolvimento seguem a ordem da experiência, e cada dia fecha um trecho que dá para testar no celular. Se o prazo apertar, as histórias Could saem primeiro (US-04.4 e US-10.4) e depois as Should, começando pela profundidade (US-03.2) e pela aceleração da história (US-05.3). Nenhuma história Must sai.
