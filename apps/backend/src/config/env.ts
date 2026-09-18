import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  /**
   * Which interface to listen on. 0.0.0.0 by default, because the demo phones reach
   * this laptop over the venue wifi by its LAN address, not through localhost.
   */
  HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),
  /** Comma-separated list of allowed browser origins. The mobile apps send none. */
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081,http://localhost:8082'),
  /** Set to `quiet` to silence the dispatch console, as the tests do. */
  DISPATCH_LOG: z.enum(['pretty', 'quiet']).default('pretty'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export type Env = typeof env;
