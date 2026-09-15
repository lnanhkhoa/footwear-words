# Design Guidelines — Footwear Words

Tham chiếu: phong cách trình bày của Gemini (ảnh user cung cấp). Dark, đọc dài, giàu cấu trúc.

## Theme
- Nền tối: `#0e0f13` (bg), panel `#15171d`, border `#262a33`.
- Text: chính `#e6e7ea`, phụ `#a2a6ad`, nhấn `#f5f6f7` bold.
- Accent: xanh footwear industrial `#5b9dff` cho link/term liên quan.
- Citation chip: nền `#20242d`, chữ `#9aa0a8`, bo tròn nhỏ (như "Gentleman's Gazette").

## Typography
- Body/UI: `Inter` (Google Fonts).
- Heading section: `Space Grotesk` — kỹ thuật, hiện đại.
- Term EN in bài: **bold**; tên gọi khác: *italic*.

## Layout search page
- Trên: ô search lớn, bo tròn, icon kính lúp, placeholder "Tìm thuật ngữ footwear...".
- Giữa: kết quả. 1 kết quả active → panel chi tiết bên phải (desktop) / dưới (mobile).
- Panel chi tiết render markdown:
  - Intro paragraph.
  - Heading "Key Technical Aspects".
  - **Bảng GFM 2 cột**: trái = hạng mục (bold), phải = chi tiết (bold term + italic ghi chú + bullet biến thể).
  - Related terms = hàng chip bấm được → search luôn.
- Không kết quả: card "Chưa có trong bộ từ" + nút primary "✨ Enrich bằng AI".

## Markdown render
- `react-markdown` + `remark-gfm` (bảng, bullet).
- Style bảng: header nền `#1b1e25`, viền hàng mảnh, padding thoáng như ảnh.
- Loading enrich: skeleton + text "Đang hỏi AI...".

## Components (shadcn)
Input, Button, Card, Badge (chip), Skeleton, Separator, ScrollArea.
