import { sql } from './client.js';

// Idempotent schema setup. Works on self-hosted Postgres, Neon, and Supabase
// (all support CREATE EXTENSION pg_trgm without superuser).
async function migrate() {
  await sql.unsafe(`
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    CREATE TABLE IF NOT EXISTS terms (
      id             serial PRIMARY KEY,
      term           text NOT NULL UNIQUE,
      slug           text NOT NULL UNIQUE,
      ipa            text,
      category       text,
      short_vi       text NOT NULL,
      content_md     text NOT NULL,
      related_terms  text[] NOT NULL DEFAULT '{}',
      source         text NOT NULL DEFAULT 'ai',
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS terms_term_trgm
      ON terms USING gin (term gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS terms_short_vi_trgm
      ON terms USING gin (short_vi gin_trgm_ops);
  `);
  console.log('✓ Migration applied (pg_trgm + terms table + indexes).');
  await sql.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
