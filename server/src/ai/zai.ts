import { z } from 'zod';
import { env } from '../env.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const ChatResponse = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().optional() }).optional() }))
    .optional(),
});

// Vercel function budget is maxDuration 60 (see vercel.json). Abort the AI call
// at 50s so DB writes + SSE teardown still fit inside the function window —
// Vercel killing the function mid-request burns tokens AND returns no error.
const AI_TIMEOUT_MS = 50_000;
/**
 * Minimal OpenAI-compatible chat client for ZAI (coding plan).
 * Endpoint: `${ZAI_BASE_URL}/chat/completions`, model `ZAI_MODEL`.
 */
export async function chat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; signal?: AbortSignal } = {},
): Promise<string> {
  if (!env.ZAI_API_KEY) {
    throw new Error('ZAI_API_KEY is not set. Add it to .env before enriching.');
  }

  const res = await fetch(`${env.ZAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.ZAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.ZAI_MODEL,
      temperature: opts.temperature ?? 0.4,
      messages,
      max_tokens: opts.maxTokens,
      // GLM thinking is on by default and roughly doubles latency (measured 46s vs 22s),
      // which blows past serverless time limits; plain JSON output doesn't need it.
      thinking: { type: 'disabled' },
    }),
    signal: opts.signal ?? AbortSignal.timeout(AI_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ZAI request failed (${res.status}): ${body.slice(0, 500)}`);
  }

  const parsed = ChatResponse.safeParse(await res.json());
  const content = parsed.success ? parsed.data.choices?.[0]?.message?.content : undefined;
  if (!content) throw new Error('ZAI returned empty content.');
  return content;
}

/**
 * Streaming variant: forwards `delta.content` chunks to `onDelta` as they arrive
 * (SSE, OpenAI-compatible). Resolves with the full concatenated content.
 */
export async function chatStream(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; signal?: AbortSignal } = {},
  onDelta: (text: string) => void | Promise<void>,
): Promise<string> {
  if (!env.ZAI_API_KEY) {
    throw new Error('ZAI_API_KEY is not set. Add it to .env before enriching.');
  }

  const res = await fetch(`${env.ZAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.ZAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.ZAI_MODEL,
      temperature: opts.temperature ?? 0.4,
      messages,
      stream: true,
      max_tokens: opts.maxTokens,
      thinking: { type: 'disabled' },
    }),
    signal: opts.signal ?? AbortSignal.timeout(AI_TIMEOUT_MS),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => '');
    throw new Error(`ZAI request failed (${res.status}): ${body.slice(0, 500)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          await onDelta(delta);
        }
      } catch {
        // Dòng không parse được (keep-alive/comment) — bỏ qua.
      }
    }
  }
  if (!full) throw new Error('ZAI stream returned empty content.');
  return full;
}
