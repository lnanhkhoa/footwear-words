import { sql as pg, db } from '../db/client.js';
import { terms, type Term } from '../db/schema.js';
import { sql } from 'drizzle-orm';
import { slugify } from '../lib/slug.js';
import type { EnrichedTerm } from './enrich.js';

export interface SearchRow {
  id: number;
  term: string;
  slug: string;
  shortVi: string;
  category: string | null;
  similarity: number;
}

/** Fuzzy search over term + short_vi using pg_trgm similarity and ILIKE. */
export async function searchTerms(q: string, limit = 20): Promise<SearchRow[]> {
  const query = q.trim();
  if (!query) return [];
  const like = `%${query}%`;
  const rows = await pg<SearchRow[]>`
    select id, term, slug, short_vi as "shortVi", category,
      greatest(similarity(term, ${query}), similarity(short_vi, ${query})) as similarity
    from terms
    where term ilike ${like}
       or short_vi ilike ${like}
       or term % ${query}
       or short_vi % ${query}
    order by similarity desc, term asc
    limit ${limit}
  `;
  return rows;
}

export async function getBySlug(slug: string): Promise<Term | undefined> {
  const [row] = await db.select().from(terms).where(sql`${terms.slug} = ${slug}`).limit(1);
  return row;
}

export async function findByTerm(term: string): Promise<Term | undefined> {
  const [row] = await db
    .select()
    .from(terms)
    .where(sql`lower(${terms.term}) = lower(${term.trim()})`)
    .limit(1);
  return row;
}

export async function upsertEnriched(e: EnrichedTerm, source: 'ai' | 'seed'): Promise<Term> {
  const slug = slugify(e.term);
  const [row] = await db
    .insert(terms)
    .values({
      term: e.term,
      slug,
      ipa: e.ipa,
      category: e.category,
      shortVi: e.shortVi,
      contentMd: e.contentMd,
      relatedTerms: e.relatedTerms,
      source,
    })
    .onConflictDoUpdate({
      target: terms.term,
      set: {
        slug,
        ipa: e.ipa,
        category: e.category,
        shortVi: e.shortVi,
        contentMd: e.contentMd,
        relatedTerms: e.relatedTerms,
        source,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

