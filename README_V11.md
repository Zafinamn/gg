# V11 — G&G International PDF Catalog Viewer

This version keeps the Mongolian UI and G&G International branding, and replaces the old Vercel Blob client-token upload flow with the current OIDC-compatible presigned upload flow.

## Vercel Blob setup

1. Keep the `gg-blob` store **Public**.
2. Connect `gg-blob` to the `gg` Vercel project.
3. Redeploy the project.
4. No manual `BLOB_READ_WRITE_TOKEN` is required for the connected Vercel deployment. Vercel provides `BLOB_STORE_ID` and a short-lived `VERCEL_OIDC_TOKEN` for the Blob SDK.

## Share flow

The Share button uses:
- `uploadPresigned()` in the browser
- `handleUploadPresigned()` + `issueSignedToken()` on the Vercel API route
- OIDC authentication from the connected Blob store
- public Blob storage for the final catalog PDF

It then creates `/share/<catalog-id>` and the shared viewer loads the public Blob URL.
