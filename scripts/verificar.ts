/**
 * Gate de publicação (SPEC-12): `pnpm verificar`. Falha enquanto houver texto
 * pendente, data sem fuso ou link sem https. Roda antes de publicar, não a cada commit.
 */
import { config } from '../src/config/config';
import { content } from '../src/config/content';
import { verificarTudo } from './verificar/regras';

const problemas = verificarTudo(config, content);

if (problemas.length > 0) {
  for (const { regra, mensagem } of problemas) console.error(`✗ [${regra}] ${mensagem}`);
  console.error(`\n${problemas.length} problema(s). Nada deve ser publicado.`);
  process.exit(1);
}

console.log('Tudo certo para publicar.');
