// Fixture de teste de arquitetura: viola uma regra de propósito. Nunca importe daqui.
import { b } from './b';

export const a = (): number => b();
