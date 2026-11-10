# ADR-0025 · Mini-galeria do casal abaixo da mensagem

- **Status:** aceita em 2026-11-02
- **Contexto:** o casal mandou seis fotos para uma mini-galeria abaixo da "Mensagem do casal", no convite aberto.

## O que mudou

| Peça             | Mudança                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fotos            | `public/photos/galeria-1.webp` a `galeria-6.webp`, feitas dos originais da pasta `fotos/` (ao lado de `src/`, fora do repositório): no máximo 800 px no lado maior, WebP de qualidade 74 (a do balanço, 64), de 16 a 94 kB cada (limite de 110 kB em `orcamento.ts`). A selfie que veio de lado (`…12 (2).jpeg`, sem EXIF) foi girada 90° para a esquerda. A pasta tem uma sétima foto, a mesma selfie do restaurante em tamanho menor (`…12 (4).jpeg`), que não entrou. |
| Conteúdo         | `content.galeria`: cada foto leva o caminho, o texto alternativo e o tamanho do arquivo (`largura` e `altura`); `content.rotulos.galeria` ("Fotos do casal") nomeia o grupo para o leitor de tela. Os textos alternativos descrevem as cenas (o pedido na praia, o balanço do parque, as selfies); revisar com o casal.                                                                                                                                                  |
| Cartão           | Novo cartão `.cartao--galeria` logo depois da mensagem e antes do traje, que aparece ao rolar como os outros. `montarGaleria` (`presentation/informacoes/galeria.ts`) monta duas colunas; `repartirEmColunas` põe cada foto na coluna mais baixa até ali (pela proporção do arquivo), então as colunas terminam quase iguais mesmo com fotos em pé e deitadas. Sem fotos em `content.galeria`, o cartão some.                                                            |
| Aparência        | Fotos inteiras (nada de recorte, para não cortar rostos), filete dourado, cantos de 12 px, sombra dos cartões e uma leve inclinação alternada (−1,2° e +1°). Os atributos `width` e `height` reservam o lugar de cada foto antes de ela chegar, e `loading="lazy"` só baixa as que o convidado se aproxima: quem não rola até lá não gasta dados.                                                                                                                        |
| `pnpm verificar` | Confere que as seis fotos existem (`arquivo-ausente`), que cada uma pesa até 110 kB e as soma à conta da experiência inteira (limite de 8 MB).                                                                                                                                                                                                                                                                                                                           |

## Consequências

- A galeria não aparece no modo de segurança estático nem no `<noscript>` (eles só têm texto); aparece em todo o resto, inclusive
  para quem pula direto ao convite.
- Sem tocar para ampliar: é uma mini-galeria. Se o casal quiser ver cada foto grande, é um acréscimo à parte.
- Há fotos sobrando para os cinco balões, que ainda estão sem foto (`foto-pendente` no `pnpm verificar`).
- Visto só no celular emulado (375 × 812).
