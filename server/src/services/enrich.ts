import { z } from 'zod';
import { chat, type ChatMessage } from '../ai/zai.js';

export interface EnrichedTerm {
  term: string;
  ipa: string | null;
  category: string | null;
  shortVi: string;
  relatedTerms: string[];
  contentMd: string;
}

/**
 * Output format stream-friendly: head dạng `KEY: value`, delimiter `---`, rồi
 * content markdown. Client render dần phần markdown; server parse + validate
 * khi stream xong mới ghi DB.
 */
const SYSTEM_PROMPT = `Bạn là chuyên gia thuật ngữ ngành FOOTWEAR DEVELOPMENT (phát triển sản phẩm giày dép),
kiêm biên dịch Anh-Việt kỹ thuật. Nhiệm vụ: giải thích một thuật ngữ tiếng Anh trong ngành giày.

Trả về ĐÚNG định dạng sau (plain text, KHÔNG code fence, KHÔNG giải thích thêm):
TERM: <thuật ngữ tiếng Anh viết chuẩn (Title Case nếu là danh từ riêng kỹ thuật)>
IPA: <phiên âm IPA nếu biết, ngược lại gõ ->
CATEGORY: <1 công đoạn/nhóm: "Upper", "Bottom", "Lasting", "Cutting", "Stitching", "Construction", "Material"... hoặc gõ ->
SHORT: <1-2 câu định nghĩa tiếng Việt ngắn gọn, KHÔNG markdown>
RELATED: <3-6 thuật ngữ tiếng Anh liên quan, phân cách bằng dấu phẩy>
---
<markdown giàu cấu trúc theo yêu cầu bên dưới. KHÔNG dùng thêm dòng --- trong phần này.>

Yêu cầu markdown (bằng TIẾNG VIỆT, giữ nguyên thuật ngữ tiếng Anh, TỔNG THỂ ~300 từ — ưu tiên cô đọng):
1. Mở đầu MỘT đoạn 2-4 câu: nêu bản chất thuật ngữ. **In đậm** thuật ngữ tiếng Anh chủ chốt kèm nghĩa Việt trong ngoặc, *in nghiêng* tên gọi khác/lưu ý.
2. Một heading "## Key Technical Aspects" rồi MỘT BẢNG MARKDOWN (GFM) đúng 2 cột:
   | Hạng mục phát triển | Chi tiết kỹ thuật |
   Đúng 3-5 hàng; mỗi ô tối đa 1-2 câu, **in đậm** thuật ngữ tiếng Anh, *in nghiêng* ghi chú so sánh.
3. Chỉ khi thuật ngữ có biến thể/phân loại rõ ràng: mục "## Variations", tối đa 4 bullet, mỗi bullet **Tên biến thể:** 1 câu ngắn.
Không bịa thông tin sai. Nếu thuật ngữ không thuộc ngành giày, vẫn giải thích nghĩa gần nhất và ghi chú.`;

export function buildEnrichMessages(term: string): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Thuật ngữ cần giải thích: "${term.trim()}"` },
  ];
}

/** Parse head `KEY: value` + delimiter `---` + markdown body thành EnrichedTerm. */
export function parseEnrichOutput(raw: string, fallbackTerm: string): EnrichedTerm {
  const text = raw.trim();

  // Model thỉnh thoảng viền đậm `**SHORT:**` hoặc viết hoa khác — nới lỏng regex,
  // tìm trên TOÀN BỘ text chứ không chỉ head (chống lệch vị trí dòng).
  const field = (name: string) =>
    text.match(new RegExp(`^[*_ \\t]*${name}[*_ \\t]*:(.*)$`, 'im'))?.[1]?.trim() ?? '';

  // Ưu tiên delimiter `---`; nếu model quên, markdown = phần sau dòng head cuối.
  const sepMatch = text.match(/^---[ \t]*\r?$/m);
  let md = '';
  if (sepMatch) {
    const nl = text.indexOf('\n', sepMatch.index ?? 0);
    md = nl === -1 ? '' : text.slice(nl + 1).trim();
  } else {
    const heads = ['TERM', 'IPA', 'CATEGORY', 'SHORT', 'RELATED']
      .map((n) => text.match(new RegExp(`^[*_ \\t]*${n}[*_ \\t]*:.*$`, 'im')))
      .filter((m): m is RegExpMatchArray => m !== null);
    const lastEnd = heads.length
      ? Math.max(...heads.map((m) => (m.index ?? 0) + m[0].length))
      : -1;
    if (lastEnd === -1) {
      md = text; // không có head nào — SHORT sẽ fail bên dưới kèm snippet
    } else {
      const nl = text.indexOf('\n', lastEnd);
      md = nl === -1 ? '' : text.slice(nl + 1).trim();
    }
  }

  const clean = (v: string) => (v === '-' || v === '—' ? '' : v);
  // Model thỉnh thoảng để lộ artifact emphasis (`**TERM:**`) — bỏ `*`/`_` thừa.
  const tidy = (v: string) => clean(v).replace(/[*_]/g, '').trim();

  const shortVi = tidy(field('SHORT'));
  if (!shortVi || !md) {
    const snippet = text.slice(0, 160).replace(/\s+/g, ' ');
    throw new Error(
      `AI output sai định dạng (thiếu SHORT hoặc markdown) cho "${fallbackTerm}": "${snippet}…"`,
    );
  }

  return {
    term: tidy(field('TERM')) || fallbackTerm,
    ipa: tidy(field('IPA')) || null,
    category: tidy(field('CATEGORY')) || null,
    shortVi,
    relatedTerms: field('RELATED')
      .split(',')
      .map((s) => tidy(s))
      .filter(Boolean)
      .slice(0, 8),
    contentMd: md,
  };
}

/** Non-stream variant (dùng bởi seed script). */
export async function enrichTerm(rawTerm: string): Promise<EnrichedTerm> {
  const term = rawTerm.trim();
  const content = await chat(buildEnrichMessages(term), { maxTokens: 2048 });
  return parseEnrichOutput(content, term);
}
