# Footwear Words

Từ điển thuật ngữ **footwear development**: search fuzzy (Anh/Việt), xem giải thích
markdown phong cách Gemini; từ chưa có → enrich bằng AI (ZAI `glm-5.3-flash`) rồi lưu Postgres.

## Kiến trúc

```
web/   Vite + React + TS + Tailwind v4 + shadcn-style UI   → http://localhost:5173
server/ Bun + Hono + Drizzle + postgres.js                 → http://localhost:8787
            ├── Postgres (pg_trgm fuzzy search)
            └── ZAI  (OpenAI-compatible /chat/completions)
```

Hai project độc lập (không workspaces). `server/src/app.ts` là Hono app thuần — portable
sang Cloudflare Workers / Supabase Edge Functions sau này (chỉ đổi entry + driver DB).

## Yêu cầu

- [Bun](https://bun.sh) ≥ 1.1
- PostgreSQL (local / Neon / Supabase — cần được `CREATE EXTENSION pg_trgm`)

## Setup

```bash
# 1. Env
cp .env.example .env        # rồi điền DATABASE_URL, ZAI_API_KEY

# 2. Server
cd server && bun install
bun run migrate             # tạo pg_trgm + bảng terms + GIN indexes
bun run dev                 # API ở :8787

# 3. Web (terminal khác)
cd web && bun install
bun run dev                 # UI ở :5173
```

## Seed bộ từ

Đặt từ vào `wordlist.txt` (mỗi dòng 1 thuật ngữ tiếng Anh, `#` = comment):

```bash
cd server
bun run seed                # đọc ../wordlist.txt, enrich từng từ, upsert
bun run seed path/to/words.txt --force   # ghi đè cả từ đã có
```

## API

| Method | Path | Mô tả |
|---|---|---|
| GET | `/health` | healthcheck |
| GET | `/api/terms/search?q=` | fuzzy search (pg_trgm similarity + ILIKE, match EN & VN) |
| GET | `/api/terms/:slug` | chi tiết 1 thuật ngữ |
| POST | `/api/terms/enrich` | `{ "term": "Derby" }` — có sẵn trả về, chưa có → AI enrich + lưu |

## Mock AI (test không cần key)

```bash
cd server
bun run scripts/mock-zai.ts &                # :9911
ZAI_BASE_URL=http://localhost:9911 ZAI_API_KEY=mock bun run dev
```

## Cấu trúc chính

```
server/src/
  ai/zai.ts            OpenAI-compatible client cho ZAI
  services/enrich.ts   Prompt Gemini-style → zod-validate JSON → EnrichedTerm
  services/terms.ts    search / get / upsert / getOrEnrich
  db/                  schema (terms), client (drizzle), migrate (idempotent)
  app.ts               Hono routes (portable)
  index.ts             Bun.serve entry
web/src/
  lib/api.ts           typed API client
  App.tsx              search + debounced query + enrich-on-miss
  components/          TermDetail (react-markdown + remark-gfm), ui/ (shadcn-style)
```

## Env vars

| Var | Bắt buộc | Mặc định |
|---|---|---|
| `DATABASE_URL` | ✓ | — |
| `ZAI_API_KEY` | để enrich | — |
| `ZAI_BASE_URL` | | `https://api.z.ai/api/coding/paas/v4` |
| `ZAI_MODEL` | | `glm-5.3-flash` |
| `PORT` | | `8787` |
| `VITE_API_URL` | | `''` (dev dùng proxy `/api` → `:8787`) |

## Deploy Vercel

1 project Vercel duy nhất (Root Directory = repo root), config ở `vercel.json`:
- `web/` build static → `web/dist` (cùng origin nên **không** set `VITE_API_URL`).
- `api/index.ts` = Vercel Function (Node) bọc `server/src/app.ts`; `/api/*`, `/health` rewrite vào đây.

```bash
# 1. DB: dùng URL pooled (Neon pooler / Supabase :6543), migrate 1 lần từ máy local
cd server && DATABASE_URL="<prod-url>" bun run migrate

# 2. Link + env (Production & Preview)
bunx vercel link
bunx vercel env add DATABASE_URL
bunx vercel env add ZAI_API_KEY      # + ZAI_BASE_URL / ZAI_MODEL nếu khác mặc định

# 3. Deploy (hoặc import repo trên vercel.com để auto-deploy mỗi lần push)
bunx vercel            # preview
bunx vercel --prod     # production
```

Seed data prod: `cd server && DATABASE_URL="<prod-url>" bun run seed`.

## Đã verify

- `bun run typecheck` + `bun run build` sạch cả 2 project.
- E2E smoke (Postgres docker + mock ZAI): migrate (pg_trgm) → seed 20/20 idempotent →
  typo search `derbi` → Derby (similarity 0.5) → enrich-on-miss "Vibram Sole" → lưu + render
  markdown GFM bảng 2 cột trên UI dark.
