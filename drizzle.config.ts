import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './src/server/db/schema.ts',
  out: './src/server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://placeholder/placeholder',
  },
  strict: true,
  verbose: true,
} satisfies Config;
