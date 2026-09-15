import { pgTable, serial, text, timestamp, index } from 'drizzle-orm/pg-core';

export const terms = pgTable(
  'terms',
  {
    id: serial('id').primaryKey(),
    term: text('term').notNull().unique(),
    slug: text('slug').notNull().unique(),
    ipa: text('ipa'),
    category: text('category'),
    shortVi: text('short_vi').notNull(),
    contentMd: text('content_md').notNull(),
    relatedTerms: text('related_terms').array().notNull().default([]),
    source: text('source').notNull().default('ai'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    termTrgm: index('terms_term_trgm').using('gin', t.term.op('gin_trgm_ops')),
    shortViTrgm: index('terms_short_vi_trgm').using('gin', t.shortVi.op('gin_trgm_ops')),
  }),
);

export type Term = typeof terms.$inferSelect;
export type NewTerm = typeof terms.$inferInsert;
