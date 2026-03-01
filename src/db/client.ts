import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Missing required environment variable: DATABASE_URL');
  process.exit(1);
}

export const sql = postgres(databaseUrl, {
  ssl: "require"
});
export const db = drizzle(sql, { schema });
