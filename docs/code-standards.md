# Code Standards

- **Runtime/PM:** Bun (server chạy TS trực tiếp; Bun tự nạp `.env` — không dùng dotenv).
- **TypeScript strict cả server & web.** Boundary ngoài (AI response, request body,
  ZAI HTTP response) validate bằng **zod** (`safeParse`) — không `any`, không inline-cast
  member access; lỗi narrow bằng `instanceof Error`.
- **Server**: Hono app thuần trong `app.ts` (portable), entry runtime tách biệt
  (`index.ts` cho Bun). Services tách khỏi routes (`services/*.ts`).
- **DB**: access qua Drizzle (typed) hoặc `sql` template (postgres.js) cho truy vấn
  trgm raw. Migration idempotent trong `src/db/migrate.ts`.
- **Slug**: `slugify` (NFKD, bỏ dấu, kebab-case) — chuẩn Anh, không slug tiếng Việt.
- **Web**: shadcn-style components tay (`components/ui/*`), Tailwind v4 tokens qua
  `@theme inline`, theme dark duy nhất. API client typed trong `lib/api.ts`.
- **Markdown nội dung**: tiếng Việt, giữ thuật ngữ EN; bảng GFM 2 cột là contract
  giữa prompt (`SYSTEM_PROMPT`) và renderer (`.markdown-body` styles).
- **Commit**: không commit `.env`, `node_modules`, `dist` (đã gitignore).
