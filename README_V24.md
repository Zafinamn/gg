# PDF AI Analyzer & Catalog Viewer — V24

V24 keeps the existing V23 functionality and fixes shared catalog resolution.

## What changed
- Shared `/share/:id` pages now resolve the uploaded Blob using `list()` instead of pathname-only `head()`.
- The API returns the actual public Blob URL from the matching object.
- This avoids the shared-link failure that was sending visitors back to the homepage with “Каталогийн холбоос олдсонгүй.”
- Existing Mongo UI, G&G International header, original logo, page turn, spread mode, zoom, loupe, search, bookmarks, fullscreen, and Share/Copy UI are preserved.
- Shared viewers remain read-only and do not expose the new-upload control.
