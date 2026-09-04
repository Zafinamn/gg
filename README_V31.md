# V31 — Admin route fix

This version preserves the existing V29 project and fixes the admin entry point.

- `/admin` rewrites to `admin.html` instead of the main app `index.html`.
- `src/admin.tsx` is a real Vite entry that renders `AdminDashboard`.
- Main catalog/share app is unchanged.
- Add `ADMIN_PASSWORD` in Vercel Environment Variables and redeploy.
