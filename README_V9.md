# PDF AI Analyzer & Catalog Viewer — V9

This version preserves the Mongolian homepage/UI text and keeps the catalog Share button visible in the viewer toolbar.

## Vercel Blob
1. Connect the Blob store to this Vercel project.
2. The store must be **Public** because shared catalog URLs are public.
3. Make sure `BLOB_READ_WRITE_TOKEN` exists for Production.
4. Redeploy after connecting the store / changing environment variables.

The app uses direct client uploads to Vercel Blob with multipart uploads, so the PDF does not pass through a Vercel Function request body.

If Blob configuration is missing, `/api/blob-upload` now returns a clearer setup error instead of a generic token failure.
