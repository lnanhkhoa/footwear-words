// Bun tự động nạp biến từ .env, không cần dotenv.
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  ZAI_API_KEY: process.env.ZAI_API_KEY ?? '',
  ZAI_BASE_URL: process.env.ZAI_BASE_URL ?? 'https://api.z.ai/api/coding/paas/v4',
  ZAI_MODEL: process.env.ZAI_MODEL ?? 'glm-5.3-flash',
  PORT: Number(process.env.PORT ?? 8787),
};
