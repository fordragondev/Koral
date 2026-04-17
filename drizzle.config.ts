import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';
config({ path: '.env.local' });

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
