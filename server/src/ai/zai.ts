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

/**
 * Minimal OpenAI-compatible chat client for ZAI (coding plan).
 * Endpoint: `${ZAI_BASE_URL}/chat/completions`, model `ZAI_MODEL`.
 */
export async function chat(messages: ChatMessage[], opts: { temperature?: number } = {}): Promise<string> {
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
    }),
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
