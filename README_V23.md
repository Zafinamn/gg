# V23 – OIDC presigned Blob upload

This version removes the Vercel Blob client-token flow that was failing in production.

Share flow:
1. Browser requests `/api/blob-upload` with a generated `catalogs/<uuid>.pdf` pathname.
2. The Vercel Function authenticates to the connected Blob store using OIDC + `BLOB_STORE_ID`.
3. The function issues a short-lived, pathname-scoped presigned PUT URL.
4. The browser uploads the PDF directly to Vercel Blob with `PUT`.
5. The app creates `/share/<uuid>`; shared links open the viewer directly.

No `BLOB_READ_WRITE_TOKEN` is required for this flow.
