# Codebase Summary

## Thống kê
- 2 project độc lập trong 1 repo: `server/` (Bun+Hono+Drizzle), `web/` (Vite+React+Tailwind v4).
- ~20 file nguồn. Không auth, không landing — 1 trang search duy nhất.

## Server (`server/src`)
| File | Vai trò |
|---|---|
| `env.ts` | đọc env (Bun auto-load .env), fail-fast thiếu DATABASE_URL |
| `ai/zai.ts` | fetch `/chat/completions` OpenAI-compatible; `chat` (non-stream) + `chatStream` (SSE delta) |
| `services/enrich.ts` | SYSTEM_PROMPT format stream-friendly (`KEY: value` head + `---` + markdown), `parseEnrichOutput`, `enrichTerm` non-stream cho seed |
| `services/terms.ts` | searchTerms (pg_trgm raw SQL), getBySlug, findByTerm, upsertEnriched |
| `db/schema.ts` / `client.ts` / `migrate.ts` | bảng terms, drizzle+postgres.js, migration idempotent |
| `app.ts` | routes: /health, /search, /:slug, /enrich (SSE: delta/done/error, cors bật) |
| `index.ts` | Bun.serve entry |
| `scripts/seed.ts` | đọc wordlist → enrich tuần tự → upsert (`--force` ghi đè) |
| `scripts/mock-zai.ts` | mock OpenAI-compatible cho dev/test |

## Web (`web/src`)
| File | Vai trò |
|---|---|
| `lib/api.ts` | typed client (searchTerms/getTerm/enrichTermStream — đọc SSE bằng fetch reader) |
| `App.tsx` | search debounced 300ms, enrich stream + throttle render 100ms, StreamDetail preview khi AI đang viết |
| `components/TermDetail.tsx` | term đã lưu: react-markdown + remark-gfm, related-term chips |
| `components/StreamDetail.tsx` | preview render dần output AI (head parse + caret volt) |
| `components/ui/*` | Button/Input/Card/Badge/Skeleton shadcn-style |
| `index.css` | Tailwind v4 `@theme inline` tokens + `.markdown-body` styles |

## Lệnh
`server`: `bun run dev|migrate|seed|typecheck` · `web`: `bun run dev|build|typecheck`
Root README có đầy đủ setup.
