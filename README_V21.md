# V21 - Unified Share Upload

Share now uses one user-facing flow for every PDF size:
- <= 4 MB: server-side `@vercel/blob` `put()` using the connected Vercel Blob store/OIDC.
- > 4 MB: direct Vercel Blob client multipart upload via `/api/blob-upload`.

The user only presses Share once; the upload strategy is automatic.
