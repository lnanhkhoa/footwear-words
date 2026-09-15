import { z } from 'zod';
import { chat } from '../ai/zai.js';

export interface EnrichedTerm {
  term: string;
  ipa: string | null;
  category: string | null;
  shortVi: string;
  relatedTerms: string[];
  contentMd: string;
}

const SYSTEM_PROMPT = `Bạn là chuyên gia thuật ngữ ngành FOOTWEAR DEVELOPMENT (phát triển sản phẩm giày dép),
kiêm biên dịch Anh-Việt kỹ thuật. Nhiệm vụ: giải thích một thuật ngữ tiếng Anh trong ngành giày.

Trả về DUY NHẤT một object JSON hợp lệ (không kèm giải thích, không bọc code fence), theo schema:
{
  "term": string,            // thuật ngữ tiếng Anh, viết chuẩn (Title Case nếu là danh từ riêng kỹ thuật)
  "ipa": string | null,      // phiên âm IPA nếu biết, ngược lại null
  "category": string | null, // 1 công đoạn/nhóm: "Upper", "Bottom", "Lasting", "Cutting", "Stitching", "Construction", "Material"...
  "short_vi": string,        // 1-2 câu định nghĩa tiếng Việt ngắn gọn (KHÔNG markdown)
  "related_terms": string[], // 3-6 thuật ngữ tiếng Anh liên quan
  "content_md": string       // markdown giàu cấu trúc, xem yêu cầu bên dưới
}

Yêu cầu content_md (bằng TIẾNG VIỆT, giữ nguyên thuật ngữ tiếng Anh, phong cách như Google Gemini):
1. Mở đầu 1-2 đoạn văn: nêu bản chất thuật ngữ. **In đậm** các thuật ngữ tiếng Anh chủ chốt kèm nghĩa Việt trong ngoặc, *in nghiêng* các tên gọi khác/lưu ý.
2. Một heading "## Key Technical Aspects" rồi MỘT BẢNG MARKDOWN (GFM) đúng 2 cột:
   | Hạng mục phát triển | Chi tiết kỹ thuật |
   Mỗi hàng: cột trái là hạng mục (ví dụ "Upper Pattern (Cấu trúc mui giày)"), cột phải mô tả kỹ thuật,
   **in đậm** thuật ngữ tiếng Anh, có thể *in nghiêng* ghi chú so sánh. Tối thiểu 3 hàng.
3. Nếu có biến thể/phân loại: mục "## Variations" với bullet list, mỗi bullet **Tên biến thể:** mô tả ngắn.
Không bịa thông tin sai. Nếu thuật ngữ không thuộc ngành giày, vẫn giải thích nghĩa gần nhất và ghi chú.`;

function extractJson(raw: string): string {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = fence ? fence[1] : raw;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in AI response.');
  return text.slice(start, end + 1);
}

const AiTermSchema = z.object({
  term: z.string().optional(),
  ipa: z.string().nullish(),
  category: z.string().nullish(),
  short_vi: z.string(),
  related_terms: z.array(z.string()).default([]),
  content_md: z.string(),
});

export async function enrichTerm(rawTerm: string): Promise<EnrichedTerm> {
  const term = rawTerm.trim();
  const content = await chat([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Thuật ngữ cần giải thích: "${term}"` },
  ]);

  let raw: unknown;
  try {
    raw = JSON.parse(extractJson(content));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Không parse được JSON từ AI cho "${term}": ${msg}`);
  }

  const result = AiTermSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`AI JSON sai schema cho "${term}": ${result.error.message}`);
  }

  const shortVi = result.data.short_vi.trim();
  const contentMd = result.data.content_md.trim();
  if (!shortVi || !contentMd) {
    throw new Error(`AI thiếu short_vi/content_md cho "${term}".`);
  }

  return {
    term: result.data.term?.trim() || term,
    ipa: result.data.ipa?.trim() || null,
    category: result.data.category?.trim() || null,
    shortVi,
    relatedTerms: result.data.related_terms.map((s) => s.trim()).filter(Boolean).slice(0, 8),
    contentMd,
  };
}
