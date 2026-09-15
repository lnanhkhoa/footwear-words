// Bun auto-loads .env relative to cwd; this project keeps .env at repo root,
// so load it explicitly (without overriding vars already set in the environment).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// No-op on Vercel (no .env file shipped) — env vars come from project settings.
try {
  // import.meta.url instead of Bun-only import.meta.dir so this also runs on Node.
  const rootEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
  for (const line of readFileSync(rootEnv, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
} catch {
  // no root .env — fall back to real environment variables
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  ZAI_API_KEY: process.env.ZAI_API_KEY ?? '',
  ZAI_BASE_URL: process.env.ZAI_BASE_URL ?? 'https://api.z.ai/api/coding/paas/v4',
  ZAI_MODEL: process.env.ZAI_MODEL ?? 'glm-5.3-flash',
  PORT: Number(process.env.PORT ?? 8787),
};
