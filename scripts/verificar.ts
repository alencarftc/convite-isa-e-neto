/**
 * Gate de publicação (SPEC-12): `pnpm verificar`. Falha enquanto houver texto
 * pendente, data sem fuso, link sem https, endereço publicado incompleto, serviço externo,
 * arte provisória ou arquivo ausente. Roda antes de publicar, não a cada commit.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { config } from '../src/config/config';
import { content } from '../src/config/content';
import { ARQUIVOS_DE_AUDIO } from '../src/infrastructure/audio/audio-howler';
import { verificarTudo } from './verificar/regras';

const raiz = join(import.meta.dirname, '..');
const publico = join(raiz, 'public');

/** `index.html` e o código do site (sem os testes): onde um endereço externo seria um risco. */
const arquivosDoCodigo = [
  'index.html',
  ...readdirSync(join(raiz, 'src'), { recursive: true, encoding: 'utf8' })
    .map((caminho) => `src/${caminho.replaceAll('\\', '/')}`)
    .filter((caminho) => /\.(ts|css)$/.test(caminho) && !caminho.endsWith('.test.ts')),
].map((caminho) => ({ caminho, texto: readFileSync(join(raiz, caminho), 'utf8') }));

const problemas = verificarTudo({
  config,
  conteudo: content,
  arquivosDeAudio: ARQUIVOS_DE_AUDIO,
  existe: (caminho) => existsSync(join(publico, caminho)),
  arquivosDoCodigo,
});

if (problemas.length > 0) {
  for (const { regra, mensagem } of problemas) console.error(`✗ [${regra}] ${mensagem}`);
  console.error(`\n${problemas.length} problema(s). Nada deve ser publicado.`);
  process.exit(1);
}

console.log('Tudo certo para publicar.');
