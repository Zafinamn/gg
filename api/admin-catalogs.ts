import type { VercelRequest, VercelResponse } from '@vercel/node';
import { del, list } from '@vercel/blob';
import crypto from 'node:crypto';

function sign(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function verifyToken(token: string, secret: string) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || sign(payload, secret) !== signature) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}

function auth(req: VercelRequest) {
  const secret = process.env.ADMIN_PASSWORD || '';
  const header = String(req.headers.authorization || '');
  return !!(secret && header.startsWith('Bearer ') && verifyToken(header.slice(7), secret));
}

function validCatalogId(id: string) {
  return /^[a-f0-9-]{20,64}$/i.test(id);
}

async function listAll(prefix: string) {
  const blobs: any[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 50; page += 1) {
    const result = await list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
    blobs.push(...result.blobs);
    if (!result.hasMore || !result.cursor) break;
    cursor = result.cursor;
  }
  return blobs;
}

async function readJson(url: string) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  try { return await response.json(); } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const [catalogBlobs, events, namedLinks] = await Promise.all([
        listAll('catalogs/'),
        listAll('analytics/'),
        listAll('share-links/named/'),
      ]);

      const openCounts = new Map<string, number>();
      for (const blob of events) {
        const event = await readJson(blob.url);
        const id = String(event?.catalogId || '');
        if (validCatalogId(id)) openCounts.set(id, (openCounts.get(id) || 0) + 1);
      }

      const linkCounts = new Map<string, number>();
      for (const blob of namedLinks) {
        const record = await readJson(blob.url);
        const id = String(record?.catalogId || '');
        if (validCatalogId(id)) linkCounts.set(id, (linkCounts.get(id) || 0) + 1);
      }

      const catalogs = catalogBlobs
        .filter((blob: any) => /^catalogs\/[a-f0-9-]{20,64}\.pdf$/i.test(String(blob.pathname || '')))
        .map((blob: any) => {
          const id = String(blob.pathname).replace(/^catalogs\//i, '').replace(/\.pdf$/i, '');
          return {
            id,
            filename: `Каталог — ${id}.pdf`,
            size: Number(blob.size || 0),
            uploadedAt: blob.uploadedAt || null,
            url: blob.url,
            opens: openCounts.get(id) || 0,
            links: linkCounts.get(id) || 0,
          };
        })
        .sort((a: any, b: any) => {
          const at = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
          const bt = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
          return bt - at;
        });

      return res.status(200).json({ catalogs });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!validCatalogId(id)) return res.status(400).json({ error: 'Каталогийн ID буруу байна.' });

      const catalogBlobs = await listAll(`catalogs/${id}`);
      const pdf = catalogBlobs.find((blob: any) =>
        String(blob.pathname || '').toLowerCase() === `catalogs/${id}.pdf`.toLowerCase()
      );
      if (!pdf?.url) return res.status(404).json({ error: 'PDF файл олдсонгүй.' });

      // Delete the PDF itself first.
      await del(pdf.url);

      // Delete every named share-link record pointing to this catalog so admin does not keep dead links.
      const named = await listAll('share-links/named/');
      const toDelete: string[] = [];
      for (const blob of named) {
        const record = await readJson(blob.url);
        if (String(record?.catalogId || '') === id) toDelete.push(blob.url);
      }
      if (toDelete.length) await del(toDelete);

      // Also remove older share metadata records that reference this catalog.
      const legacy = await listAll('share-links/');
      const legacyToDelete: string[] = [];
      for (const blob of legacy) {
        const pathname = String(blob.pathname || '');
        if (pathname.startsWith('share-links/named/')) continue;
        const record = await readJson(blob.url);
        if (String(record?.catalogId || '') === id) legacyToDelete.push(blob.url);
      }
      if (legacyToDelete.length) await del(legacyToDelete);

      return res.status(200).json({ ok: true, id, deletedShareLinks: toDelete.length + legacyToDelete.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Admin catalogs error:', error);
    return res.status(500).json({ error: error?.message || 'Catalog storage operation failed' });
  }
}
