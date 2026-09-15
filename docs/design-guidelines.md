# Design Guidelines — Footwear Words

Design system: **"Streetwear Zine"** — flat poster neo-brutal, trẻ trung Gen-Z, dark/light mode
đầy đủ. Tham chiếu triển khai: `web/src/index.css` (tokens) + `web/index.html` (fonts, theme init).

## Theme

Class `.dark` trên `<html>`; light là default (`:root`). Script inline trong `index.html` set class
**trước paint** (localStorage `fw-theme` > `prefers-color-scheme`) — chống FOUC. Toggle qua
`useTheme()` (`web/src/lib/use-theme.ts`).

| Token | Light | Dark | Dùng |
|---|---|---|---|
| `--background` | `#f4f2ea` giấy ấm | `#101014` | nền app |
| `--panel` | `#fbfaf4` | `#17181d` | card, input, panel |
| `--panel-strong` | `#eeece1` | `#1f2127` | table header, skeleton, hover |
| `--border` | `#16171b` ink | `#2d3038` | viền 2px mọi surface |
| `--foreground` | `#16171b` | `#f0f0ec` | text chính |
| `--muted` | `#565a63` | `#9aa0ab` | text phụ (≥4.5:1) |
| `--accent` | `#c9f04d` volt | `#c9f04d` | fill primary, highlight, selection |
| `--accent-foreground` | `#16171b` | `#16171b` | text trên nền volt |
| `--accent-ink` | `#4d7c0f` | `#c9f04d` | accent dạng *text* an toàn contrast |
| `--chip-bg/-fg` | ink / paper (invert) | `#262932` / `#c7cbd4` | badge sticker |
| `--shadow-ink` | `#16171b` | `#000000` | hard shadow |
| `--danger` | `#b3261e` | `#ff7a70` | error text |

Cấm hex cứng trong component — mọi màu đi qua token. `color-scheme` set theo theme (scrollbar,
form controls native đúng).

## Typography

- Display: **Anton** (uppercase, tracking-wide) — logo, hero, term title, markdown h2/h3.
- Body/UI: **Epilogue** (400–800) — toàn bộ nội dung còn lại.
- Cả hai có subset vietnamese. Mono hệ thống cho IPA.
- Hero: `clamp(2.6rem, 7vw, 4.75rem)`, leading 0.95.

## Ngôn ngữ hình ảnh

- **Viền 2px** `border-border` trên mọi surface; radius 8–16px; pill cho search/badge/chip.
- **Hard offset shadow** (`@utility shadow-hard` = 5px, `shadow-hard-sm` = 3px, màu
  `--shadow-ink`) — flat poster, không blur/3D.
- **Press feedback**: primary/secondary hover → `translate(3px,3px)` + shadow về 0 (nút "đè
  xuống"); duration 150ms; chỉ transform/box-shadow.
- **Sticker**: badge/chip uppercase 11px bold tracking-wider; hero badge nghiêng `-rotate-2`;
  từ khoá hero highlight `bg-accent` nghiêng `-rotate-1`.
- Selected result card: nền volt + hard shadow (sticker nổi khỏi list).

## Layout

- Sticky header (blur `bg-background/85`): logo volt vuông + Anton wordmark + toggle Sun/Moon.
- Idle (không query, không selection): hero center + search pill + suggestion chips.
- Workspace: search pill trên, grid `320px | 1fr` (desktop) / 1 cột (mobile). Search là CTA chính —
  luôn thấy được khi có query.
- Container `max-w-6xl`; `min-h-dvh`; footer border-t 2px.

## Markdown detail (Gemini-style, đã theme hoá)

- `react-markdown` + `remark-gfm`. Strong = bold ink; em = muted; h2/h3 = Anton uppercase.
- Bảng: header `--panel-strong`, uppercase nhỏ, border-bottom 2px ink; hàng chia bởi
  `color-mix(border 35%)`. Cột trái 32% bold.
- Blockquote: border-left 3px volt. Code: nền chip (invert ở light).

## Accessibility

- Focus: `focus-visible:ring-2 ring-accent-ink/60 ring-offset-2` (button) / border-accent +
  hard shadow (input).
- Contrast: body/muted ≥ 4.5:1 ở cả hai theme; volt luôn đi với `--accent-foreground` ink.
- `prefers-reduced-motion` → tắt animation/transition (block cuối `index.css`).
- Toggle theme có `aria-label` đổi theo trạng thái; icon-only button đủ 36px.

## Components (shadcn-lite)

Button (default volt / secondary panel / ghost — 3 variant + press feedback), Input (pill option,
focus hard shadow), Badge (sticker), Card, Skeleton. Anti-pattern cấm: soft blur shadow, 3D,
gradient nền, emoji làm icon (dùng Lucide: Footprints, Search, Sparkles, Sun/Moon, BookOpen).
