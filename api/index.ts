// Vercel Function entry (Node runtime). Reuses the portable Hono app; Vercel
// calls the default export's `fetch`. vercel.json rewrites /api/* and /health
// here, and the original request path is preserved for Hono routing.
import app from '../server/src/app.js';

export default app;
