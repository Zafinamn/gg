# PDF AI Analyzer — V22

Vercel Blob share upload fix.

## Root-cause fix

The previous `/api/blob-upload.ts` was written as a Web Request handler (`request.json()`), but Vercel's plain `/api/*.ts` Node.js runtime invoked it with Node-style `req, res`. Vercel logs showed `TypeError: request.json is not a function`.

V22 uses a standard Vercel Node.js handler and adapts the incoming request body/headers to a Web `Request` before calling `handleUpload`. The viewer now uses one direct Blob client upload path for every PDF size.
