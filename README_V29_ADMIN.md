# V29 Admin Analytics

Admin dashboard: `/admin`

Set one Vercel environment variable before deploying:

`ADMIN_PASSWORD=your-strong-admin-password`

The app records shared-catalog opens as append-only encrypted analytics objects in Vercel Blob. It does not store raw client IP addresses. Location is approximate and derived from Vercel geolocation headers (country, region, city, latitude, longitude).

The dashboard shows total opens, catalog-level opens, country/city breakdown, an OpenStreetMap map, and recent daily opens.
