/**
 * Gate de publicação (SPEC-12): `pnpm verificar`. Falha enquanto houver texto
 * pendente, data sem fuso, link sem https, arte provisória ou arquivo ausente. Roda antes de publicar, não a cada commit.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { config } from '../src/config/config';
import { content } from '../src/config/content';
import { ARQUIVOS_DE_AUDIO } from '../src/infrastructure/audio/audio-howler';
import { verificarTudo } from './verificar/regras';

const publico = join(import.meta.dirname, '..', 'public');

const problemas = verificarTudo({
  config,
  conteudo: content,
  arquivosDeAudio: ARQUIVOS_DE_AUDIO,
  existe: (caminho) => existsSync(join(publico, caminho)),
});

if (problemas.length > 0) {
  for (const { regra, mensagem } of problemas) console.error(`✗ [${regra}] ${mensagem}`);
  console.error(`\n${problemas.length} problema(s). Nada deve ser publicado.`);
  process.exit(1);
}

console.log('Tudo certo para publicar.');
