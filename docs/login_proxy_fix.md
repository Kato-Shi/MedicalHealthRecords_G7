# Proposed Fix: Avoid Next.js API Proxy Loop

## Summary of the Problem
When the Next.js development server and the Express backend are both started on port `3000`, the rewrite rule in `frontend/next.config.js` forwards `\`/api/*\`` calls back to the Next.js server instead of the Express API. That causes the browser (or Postman) to see `ECONNRESET` / "socket hang up" errors for login and registration requests.

## Recommended Code Change
Update the proxy target so that, by default, the frontend forwards to a backend running on **port 3001**. This prevents accidental port conflicts while still letting teams override the destination via `NEXT_PUBLIC_BACKEND_ORIGIN`.

```diff
-const API_PROXY_TARGET =
-  process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://localhost:3000";
+const API_PROXY_TARGET =
+  process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://localhost:3001";
```

After this change, either:
- run the Express backend on port **3001** (`PORT=3001 npm run dev`) and leave the Next.js dev server on port 3000, or
- set `NEXT_PUBLIC_BACKEND_ORIGIN` explicitly in `frontend/.env.local` when using a different backend host/port.

No other files need to be modified for the proxy to stop looping.
