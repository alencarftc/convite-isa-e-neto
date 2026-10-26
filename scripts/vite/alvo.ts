/**
 * Alvo do build derivado do `browserslist` do `package.json` (SPEC-15, RF-15.1 e RF-15.5): uma
 * fonte só para o que o convite promete atender. Aceita apenas consultas "navegador >= versão",
 * sem `last 2 versions` e afins, para não depender de uma biblioteca de consulta (e do banco
 * de dados do caniuse) só por causa de cinco linhas.
 */
const NOMES_NO_BUILD: Readonly<Record<string, string>> = {
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
  safari: 'safari',
  ios_saf: 'ios',
};

/** Converte `["chrome >= 90", "ios_saf >= 15.1"]` em `["chrome90", "ios15.1"]`, o formato de `build.target`. */
export function alvosDoBuild(consultas: readonly string[]): string[] {
  return consultas.map((consulta) => {
    const partes = /^([a-z_]+) >= (\d+(?:\.\d+)?)$/.exec(consulta.trim());
    const navegador = NOMES_NO_BUILD[partes?.[1] ?? ''];
    const versao = partes?.[2];
    if (navegador === undefined || versao === undefined) {
      throw new RangeError(
        `Consulta do browserslist não suportada: "${consulta}". Use "navegador >= versão" com ` +
          `${Object.keys(NOMES_NO_BUILD).join(', ')}.`,
      );
    }
    return `${navegador}${versao}`;
  });
}
