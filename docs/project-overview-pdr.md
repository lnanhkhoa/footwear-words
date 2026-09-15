# Project Overview / PDR — Footwear Words

## Problem
Nhóm làm footwear development cần tra thuật ngữ ngành (Anh) kèm giải thích tiếng Việt
chất lượng, có cấu trúc kỹ thuật — tài liệu rải rác, không tra được theo typo/gần đúng.

## Product
Web app tra cứu từ điển thuật ngữ footwear, 1 trang duy nhất:
1. Search fuzzy tức thì (chấp nhận typo, match cả nghĩa tiếng Việt).
2. Giải thích dạng markdown chuẩn Gemini-style: intro nhấn mạnh + bảng
   "Hạng mục phát triển | Chi tiết kỹ thuật" + Variations + từ liên quan (chip).
3. Từ chưa có trong bộ từ → người dùng bấm 1 nút, AI (ZAI glm-5.3-flash) enrich
   và lưu vĩnh viễn vào Postgres — từ điển tự lớn dần theo usage.
4. Admin quản lý bộ từ ban đầu bằng `wordlist.txt` + seed script.

## Non-goals
Landing page, auth, đa ngôn ngữ UI, đánh giá/sửa nội dung inline, PWA.

## Người dùng & success metric
- User: dev/merchandiser trong team footwear.
- Success: tra từ < 2s; tỷ lệ từ được enrich thành công khi miss; bộ từ tăng trưởng qua enrich.

## Hạ tầng
- Dev: Bun + Vite local, Postgres 3rd party (Neon/Supabase — pg_trgm được hỗ trợ).
- Tương lai: backend deploy Supabase Edge Functions hoặc Cloudflare Workers tùy ngân sách
  (app.ts đã portable; chỉ thay entry + DB driver).
