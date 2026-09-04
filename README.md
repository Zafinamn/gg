# G&G PDF Catalog Viewer

React + Vite PDF catalog viewer with Vercel Blob share/export links.

## Vercel
1. Connect the Vercel Blob store to this project.
2. The store should be **Public** because shared catalog PDFs are served directly by their Blob URLs.
3. Deploy/redeploy this project.

The Share button uploads the current PDF to Vercel Blob using the standard `@vercel/blob/client` flow, then creates a clean `/share/<id>` viewer link.

Shared links open directly in the catalog viewer and do not expose the upload-homepage flow.

V23 uses OIDC-authenticated presigned Blob PUT upload; it does not use @vercel/blob/client token exchange.
