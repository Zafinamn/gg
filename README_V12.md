# V12 — Vercel Blob direct presigned PUT fix

This version keeps the Mongolian UI, G&G International branding, original G&G logo, Share icon, and shared `/share/:id` viewer.

## Blob upload change
The Share action no longer uses `@vercel/blob/client`'s `uploadPresigned()` wrapper. It requests a short-lived presigned PUT URL from `/api/blob-upload`, generated server-side with Vercel OIDC (`BLOB_STORE_ID` + `VERCEL_OIDC_TOKEN`), then uploads the PDF directly from the browser to the Public Blob store.

No `BLOB_READ_WRITE_TOKEN` needs to be manually added for a connected Vercel Blob store.

The server route limits uploads to PDF and 100 MB and returns a useful error message if Vercel rejects token/URL creation.
