# src/infrastructure

Adaptadores que implementam as portas de `application` usando o navegador e bibliotecas (Howler,
`localStorage`, `Image.decode()`, relógio real).

- Pode importar `application`, `domain` e pacotes npm. **Nunca** `presentation`.
- Um adaptador por porta; recebe suas dependências externas por parâmetro (ex.: o `Storage`), para
  testar sem navegador. Quem os instancia é `src/main.ts`.
- Falha do ambiente (armazenamento bloqueado, áudio recusado, imagem 404) **não propaga**: o adaptador
  cai num padrão seguro e o convite segue (SPEC-01, 02, 08).
- Teste de unidade ao lado, com falsos do ambiente (`vi.stubGlobal`, `vi.useFakeTimers`).
- Coisas só de desenvolvimento (como `?data=`) dependem de `import.meta.env.DEV` passado de fora.
