# Journal — 2026-09-16: Bootstrap Footwear Words

## What happened
Bootstrap từ 0 website tra từ điển thuật ngữ footwear development cho Khoa Lê
(vite+react+shadcn UI, Bun+Hono API, Postgres, AI enrich ZAI glm-5.3-flash).

## Key decisions
- **Bỏ monorepo** (user chốt giữa chừng): server/web là 2 project npm độc lập — backend
  sẽ deploy Supabase Edge Functions hoặc CF Workers tùy ngân sách. Bù lại `app.ts` giữ
  portable (Hono thuần), entry Bun tách riêng; `index.ts` là điểm thay duy nhất.
- **npm → Bun** (user): bỏ tsx/dotenv/@hono/node-server; Bun.serve native + auto .env.
- **Enrich style**: dựa screenshot Gemini user đưa → contract `content_md` =
  intro bold/italic + bảng GFM 2 cột "Hạng mục phát triển|Chi tiết kỹ thuật" + Variations.
  Prompt ép JSON schema → zod `AiTermSchema` validate (rule ts-no-any).
- **pg_trgm** cho fuzzy (user chọn): hoạt động trên Neon/Supabase (đã verify CREATE EXTENSION
  không superuser trong smoke test với docker postgres:17-alpine).
- **glmx-5.3-flash**: giữ tên user cung cấp, OpenAI-compatible qua env `ZAI_BASE_URL`
  (= https://api.z.ai/api/coding/paas/v4). Chưa test key thật — smoke test dùng mock.

## Impacts
- E2E pass: migrate → seed 20/20 idempotent → typo search `derbi`→Derby → enrich-on-miss
  "Vibram Sole" → DB + render markdown đúng design dark.
- Search match cả tiếng Việt (short_vi trong GIN trgm index).

## Lessons / gotchas
- `import.meta.dir` chỉ Bun — vite.config chạy bằng Node khi build → dùng
  `fileURLToPath(import.meta.url)`.
- Chỉnh edit theo line number: 2 lần sai hunk làm hỏng file (App.tsx, tsconfig) —
  re-read trước khi sửa lại, mọi thứ sau đó sạch typecheck+build.
