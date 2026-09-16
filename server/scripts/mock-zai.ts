// Mock ZAI server for local smoke tests. Mirrors OpenAI-compatible /chat/completions.
// Usage: bun run scripts/mock-zai.ts  (listens on :9911)
function extractTerm(url: URL, body: { messages?: { role: string; content: string }[] }): string {
  const qp = url.searchParams.get('term');
  if (qp) return decodeURIComponent(qp);
  const last = body.messages?.at(-1)?.content ?? 'Unknown';
  const match = last.match(/"([^"]+)"/);
  return match ? match[1] : last;
}

Bun.serve({
  port: 9911,
  async fetch(req) {
    const url = new URL(req.url);
    if (!url.pathname.endsWith('/chat/completions')) {
      return new Response('not found', { status: 404 });
    }
    const body = (await req.json().catch(() => ({}))) as { messages?: { role: string; content: string }[] };
    const term = extractTerm(url, body);

    const content = [
      `TERM: ${term}`,
      'IPA: /ˈmɒk/',
      'CATEGORY: Construction',
      `SHORT: Định nghĩa ngắn (mock) cho thuật ngữ ${term}.`,
      'RELATED: Welt, Last, Outsole',
      '---',
      `**${term}** (nghĩa Việt: *${term}*) là một **thuật ngữ kỹ thuật** trong ngành phát triển giày dép, dùng để chỉ *một bộ phận/quy trình* quan trọng trên dây chuyền sản xuất.`,
      '',
      '## Key Technical Aspects',
      '',
      '| Hạng mục phát triển | Chi tiết kỹ thuật |',
      '| --- | --- |',
      `| **Upper Pattern** (Cấu trúc mui giày) | Vai trò của **${term}** trong cấu trúc mui, *so sánh với Oxford*. |`,
      '| **Lasting** (Quy trình bó phom) | Ảnh hưởng đến độ ôm chân và **fit** tổng thể. |',
      '| **Durability** (Độ bền) | Yếu tố quyết định tuổi thọ sản phẩm. |',
      '',
      '## Variations',
      '',
      '- **Plain:** biến thể tối giản, không đường may trang trí.',
      '- **Cap Toe:** có lớp da bổ sung ở mũi giày.',
      '',
      '_(Nội dung mock cho smoke test.)_',
    ].join('\n');

    return Response.json({ choices: [{ message: { content } }] });
  },
});

console.log('Mock ZAI on http://localhost:9911');
