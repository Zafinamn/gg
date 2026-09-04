# V25 – Self-contained shared catalog links

V25 keeps the previous UI/features and changes the shared-link architecture:

- After a successful Blob PUT, the share link includes the exact public Blob URL in `?src=`.
- A `/share/:id?src=...` link opens the PDF directly in the catalog viewer without calling `/api/catalog`.
- Older `/share/:id` links still fall back to `/api/catalog`.
- Shared view remains read-only and does not show the new-PDF upload flow.

This avoids the previous failure where the PDF had been uploaded but the metadata/index lookup could not resolve it.
