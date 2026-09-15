import app from './app.js';
import { env } from './env.js';

// Bun entry. Bun serves the default export's `fetch`.
console.log(`▶ Footwear Words API on http://localhost:${env.PORT}`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
