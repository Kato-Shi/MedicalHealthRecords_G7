# Proposed Fix: Avoid Next.js API Proxy Loop

## Summary of the Problem
When the Next.js development server and the Express backend are both started on port `3000`, the rewrite rule in `frontend/next.config.js` forwards `\`/api/*\`` calls back to the Next.js server instead of the Express API. That causes the browser (or Postman) to see `ECONNRESET` / "socket hang up" errors for login and registration requests.

## Recommended Code Change
Pin the Next.js development server to port **3001** so that the rewrite in
`frontend/next.config.js` keeps forwarding to the Express backend on
`http://localhost:3000`. This removes the chance of the two servers sharing a
port and inadvertently proxying requests back into the Next.js process.

```diff
-    "dev": "next dev",
+    "dev": "next dev -p 3001",
```

After this change:
- Run the Express backend with `npm run dev` (still listens on port 3000).
- Start the frontend via `npm run dev` inside the `frontend` directory; it will
  listen on port 3001 and proxy `/api/*` to the backend.

You can still override the proxy destination via
`NEXT_PUBLIC_BACKEND_ORIGIN` if your API runs elsewhere.
