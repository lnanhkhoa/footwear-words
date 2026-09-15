import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { enrichTerm } from '../src/services/enrich.js';
import { findByTerm, upsertEnriched } from '../src/services/terms.js';
import { sql } from '../src/db/client.js';

// Usage: bun run scripts/seed.ts [wordlist.txt] [--force]
// Default wordlist path: <repo-root>/wordlist.txt
const args = process.argv.slice(2);
const force = args.includes('--force');
const fileArg = args.find((a) => !a.startsWith('--'));
const wordlistPath = fileArg
  ? path.resolve(fileArg)
  : path.resolve(import.meta.dir, '../../wordlist.txt');

async function main() {
  const raw = await readFile(wordlistPath, 'utf8');
  const words = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  console.log(`Seeding ${words.length} terms from ${wordlistPath}${force ? ' (--force)' : ''}`);

  let done = 0;
  let skipped = 0;
  let failed = 0;

  for (const word of words) {
    try {
      if (!force && (await findByTerm(word))) {
        skipped++;
        console.log(`↷ skip (đã có): ${word}`);
        continue;
      }
      const enriched = await enrichTerm(word);
      const saved = await upsertEnriched(enriched, 'seed');
      done++;
      console.log(`✓ [${done + skipped + failed}/${words.length}] ${saved.term} (${saved.category ?? '?'})`);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`✗ ${word}: ${msg}`);
    }
  }

  console.log(`\nDone. enriched=${done} skipped=${skipped} failed=${failed}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
