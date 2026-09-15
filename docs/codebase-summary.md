# Codebase Summary

## Thống kê
- 2 project độc lập trong 1 repo: `server/` (Bun+Hono+Drizzle), `web/` (Vite+React+Tailwind v4).
- ~20 file nguồn. Không auth, không landing — 1 trang search duy nhất.

## Server (`server/src`)
| File | Vai trò |
|---|---|
| `env.ts` | đọc env (Bun auto-load .env), fail-fast thiếu DATABASE_URL |
| `ai/zai.ts` | fetch `/chat/completions` OpenAI-compatible, zod-validate response |
| `services/enrich.ts` | SYSTEM_PROMPT Gemini-style, `extractJson`, `AiTermSchema` |
| `services/terms.ts` | searchTerms (pg_trgm raw SQL), getBySlug, findByTerm, upsertEnriched, getOrEnrich |
| `db/schema.ts` / `client.ts` / `migrate.ts` | bảng terms, drizzle+postgres.js, migration idempotent |
| `app.ts` | routes: /health, /search, /:slug, /enrich (cors bật) |
| `index.ts` | Bun.serve entry |
| `scripts/seed.ts` | đọc wordlist → enrich tuần tự → upsert (`--force` ghi đè) |
| `scripts/mock-zai.ts` | mock OpenAI-compatible cho dev/test |

## Web (`web/src`)
| File | Vai trò |
|---|---|
| `lib/api.ts` | typed client (searchTerms/getTerm/enrichTerm), VITE_API_URL base |
| `App.tsx` | state search debounced 300ms, list kết quả, enrich-on-miss card, layout 2 cột |
| `components/TermDetail.tsx` | react-markdown + remark-gfm, related-term chips |
| `components/ui/*` | Button/Input/Card/Badge/Skeleton shadcn-style |
| `index.css` | Tailwind v4 `@theme inline` tokens + `.markdown-body` styles |

## Lệnh
`server`: `bun run dev|migrate|seed|typecheck` · `web`: `bun run dev|build|typecheck`
Root README có đầy đủ setup.
