import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env.js';
import * as schema from './schema.js';

// On Vercel each function instance keeps a tiny pool; use a pooled DATABASE_URL
// (Neon pooler / Supabase :6543). prepare:false keeps transaction poolers happy.
const serverless = Boolean(process.env.VERCEL);
export const sql = postgres(env.DATABASE_URL, {
  max: serverless ? 1 : 10,
  prepare: !serverless,
});
export const db = drizzle(sql, { schema });
