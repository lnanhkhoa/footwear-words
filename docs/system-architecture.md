# System Architecture

```
┌────────────────────┐  HTTP /api/*   ┌──────────────────────┐
│  web (Vite+React)  │ ─────────────► │  server (Bun + Hono) │
│  :5173             │                │  :8787               │
└────────────────────┘                └──────────┬───────────┘
                                                 │
                              ┌──────────────────┴───────────────┐
                              ▼                                  ▼
                  ┌──────────────────────┐          ┌──────────────────────────┐
                  │ Postgres (pg_trgm)   │          │ ZAI glm-5.3-flash        │
                  │ terms + GIN indexes  │          │ /chat/completions (OAI)  │
                  └──────────────────────┘          └──────────────────────────┘
```

## Luồng chính

1. **Search**: UI debounce 300ms → `GET /api/terms/search?q=` → pg_trgm
   `similarity()` + `%` operator trên `term`/`short_vi` → xếp theo similarity.
2. **Xem chi tiết**: `GET /api/terms/:slug` → render `content_md` bằng react-markdown + GFM.
3. **Enrich-on-miss (streaming)**: `POST /api/terms/enrich` trả **SSE**. Có trong DB →
   event `done` ngay (không gọi AI). Chưa có → `chatStream` forward delta ZAI thành event
   `delta` (client render dần markdown qua `StreamDetail`); khi stream xong:
   `parseEnrichOutput` (head `TERM/IPA/CATEGORY/SHORT/RELATED` + delimiter `---` + markdown)
   → upsert `terms` (ON CONFLICT term) → event `done` với term đã lưu. Lỗi → event `error`.
   DB chỉ ghi khi nội dung trọn vẹn; seed script dùng path non-stream cùng format.

## Data model — `terms`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| term | text UNIQUE | khóa logic, conflict-target cho upsert |
| slug | text UNIQUE | URL (slugify: NFKD + bỏ dấu + kebab) |
| ipa, category | text NULL | do AI suy |
| short_vi | text NOT NULL | định nghĩa ngắn (search được) |
| content_md | text NOT NULL | markdown giàu (bảng GFM) |
| related_terms | text[] | chip bấm được trên UI |
| source | text | `seed` \| `ai` |

Index GIN (`gin_trgm_ops`) trên `term`, `short_vi`.

## Portability (tương lai Cloudflare/Supabase)

- `app.ts` thuần Hono, không_binding runtime → `export default app` cho Workers/Supabase.
- Điểm phải thay: `index.ts` (Bun.serve) và `db/client.ts` (postgres.js TCP →
  Hyperdrive/pglite/neon-http tùy nhà cung cấp). Prompt/enrich/services không đổi.

## Mock AI

`server/scripts/mock-zai.ts` — OpenAI-compatible server cục bộ trả JSON mẫu
(cùng schema thật) để dev/test UI và seed không cần API key.
