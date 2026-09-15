# Plan: Footwear Words — thuật ngữ ngành footwear development

## Mục tiêu
Website search thuật ngữ footwear. Từ có trong DB → hiển thị. Không có → dùng AI (ZAI
`glm-5.3-flash`) enrich (EN + giải thích tiếng Việt kiểu Gemini, markdown có bảng) rồi lưu Postgres.
Không landing, không auth. Main page = trang search.

## Kiến trúc
Monorepo, 2 package:
- `server/` — Hono (TS, @hono/node-server) + Drizzle ORM + postgres.js. REST API + seed script.
- `web/` — Vite + React + TS + Tailwind + shadcn/ui + react-markdown/remark-gfm.

```
web  ──HTTP──►  server  ──►  Postgres (pg_trgm)
                   └──►  ZAI (OpenAI-compatible /chat/completions, model glm-5.3-flash)
```

## Data model (bảng `terms`)
| col | type | note |
|---|---|---|
| id | serial pk | |
| term | text unique | tiếng Anh, khóa chính logic |
| slug | text unique | dùng cho URL |
| ipa | text null | phát âm |
| category | text null | cutting/stitching/lasting... |
| short_vi | text | định nghĩa ngắn tiếng Việt |
| content_md | text | markdown giàu (intro + bảng kỹ thuật + biến thể) |
| related_terms | text[] | cross-link |
| source | text | 'seed' \| 'ai' |
| created_at/updated_at | timestamptz | |

Index: `pg_trgm` GIN trên `term`, `short_vi`. Search = similarity + ILIKE, match cả EN lẫn VN.

## API
- `GET /api/terms/search?q=` → fuzzy list (id, term, slug, short_vi, category, similarity).
- `GET /api/terms/:slug` → full term.
- `POST /api/terms/enrich` `{term}` → có sẵn trả về; chưa có → gọi AI, lưu, trả về.
- `GET /health`.

## Enrichment (kiểu Gemini)
AI trả JSON: `{ term, ipa, category, short_vi, related_terms[], content_md }`.
`content_md` gồm: đoạn intro nhấn mạnh (bold thuật ngữ EN + VN), bảng GFM 2 cột
"Hạng mục phát triển | Chi tiết kỹ thuật", bullet các biến thể. Prompt ép song ngữ + markdown.

## Seed
`server/scripts/seed.ts` đọc `wordlist.txt` (1 từ EN/dòng) → enrich từng từ → upsert. Rate-limit tuần tự.

## Env (`.env.example`)
`DATABASE_URL`, `ZAI_API_KEY`, `ZAI_BASE_URL`, `ZAI_MODEL=glm-5.3-flash`, `PORT`, `VITE_API_URL`.

## Frontend UX
Trang search dark-theme. Input debounce → gọi search. List kết quả → click mở panel render markdown.
Không kết quả → nút "Enrich '<q>' bằng AI" → POST enrich → hiển thị + cache vào list.

## Phases
- phase-01: Foundation (scaffold + DB + env)
- phase-02: Backend (ZAI client, enrich, routes, seed)
- phase-03: Frontend (search + markdown detail + enrich flow)
- phase-04: Verification (smoke test e2e + docs/onboarding)

## Rủi ro / tradeoff
- ZAI base URL/API key do user cấp lúc onboarding → seed/enrich chạy được sau khi có key.
- `glm-5.3-flash` giả định OpenAI-compatible `/chat/completions`; nếu ZAI khác format sẽ chỉnh `ai/zai.ts`.
- pg_trgm cần quyền `CREATE EXTENSION` trên instance của user.

## Unresolved
- ZAI_BASE_URL chính xác? (chờ onboarding)
- Từ 1 từ EN, AI tự suy category — có cần user chỉnh tay sau không?
