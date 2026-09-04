import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list, put } from '@vercel/blob';
import crypto from 'node:crypto';

function sign(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}
function verify(token: string, secret: string) {
  const [p, s] = token.split('.');
  if (!p || !s || sign(p, secret) !== s) return false;
  try {
    return Number(JSON.parse(Buffer.from(p, 'base64url').toString('utf8')).exp) > Date.now();
  } catch {
    return false;
  }
}
function auth(req: VercelRequest) {
  const secret = process.env.ADMIN_PASSWORD || '';
  const h = String(req.headers.authorization || '');
  return !!(secret && h.startsWith('Bearer ') && verify(h.slice(7), secret));
}
const clean = (v: any, m = 160) => String(v ?? '').trim().slice(0, m);

function makeSlug(value: string) {
  const map: Record<string, string> = {
    'А':'A','а':'a','Б':'B','б':'b','В':'V','в':'v','Г':'G','г':'g','Д':'D','д':'d','Е':'E','е':'e','Ё':'Yo','ё':'yo','Ж':'J','ж':'j','З':'Z','з':'z','И':'I','и':'i','Й':'Y','й':'y','К':'K','к':'k','Л':'L','л':'l','М':'M','м':'m','Н':'N','н':'n','О':'O','о':'o','Ө':'OE','ө':'oe','П':'P','п':'p','Р':'R','р':'r','С':'S','с':'s','Т':'T','т':'t','У':'U','у':'u','Ү':'UE','ү':'ue','Ф':'F','ф':'f','Х':'H','х':'h','Ц':'Ts','ц':'ts','Ч':'Ch','ч':'ch','Ш':'Sh','ш':'sh','Щ':'Sch','щ':'sch','Ъ':'','ъ':'','Ы':'Y','ы':'y','Ь':'','ь':'','Э':'E','э':'e','Ю':'Yu','ю':'yu','Я':'Ya','я':'ya'
  };
  const normalized = Array.from(value).map(ch => map[ch] ?? ch).join('');
  return normalized.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || `link-${Date.now()}`;
}

async function listAll(prefix: string) {
  const out: any[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 20; i++) {
    const r = await list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
    out.push(...r.blobs);
    if (!r.hasMore || !r.cursor) break;
    cursor = r.cursor;
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const blobs = await listAll('share-links/');
      const links = [];
      for (const b of blobs) {
        try {
          const x = await fetch(b.url, { cache: 'no-store' });
          if (x.ok) {
            const j = await x.json();
            if (j?.linkId) links.push(j);
          }
        } catch {}
      }
      links.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return res.status(200).json({ links });
    }

    if (req.method === 'PATCH') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const linkId = clean(body?.linkId, 100);
      const newName = clean(body?.name, 100);
      if (!linkId || !newName) return res.status(400).json({ error: 'Холбоосын нэр оруулна уу.' });

      const blobs = await listAll('share-links/named/');
      for (const blob of blobs) {
        try {
          const response = await fetch(blob.url, { cache: 'no-store' });
          if (!response.ok) continue;
          const record = await response.json();
          if (String(record?.linkId || '') !== linkId) continue;

          const updated = { ...record, name: newName, updatedAt: new Date().toISOString() };
          await put(String(blob.pathname), JSON.stringify(updated), {
            access: 'public',
            contentType: 'application/json',
            addRandomSuffix: false,
            cacheControlMaxAge: 31536000,
          });
          return res.status(200).json({ ok: true, linkId, slug: record.slug, name: newName });
        } catch {}
      }
      return res.status(404).json({ error: 'Холбоос олдсонгүй.' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const catalogId = clean(body?.catalogId, 100);
    const name = clean(body?.name, 100);
    const filename = clean(body?.filename, 180) || 'G&G Catalog.pdf';

    if (!/^[a-f0-9-]{20,64}$/i.test(catalogId)) {
      return res.status(400).json({ error: 'Каталогийн ID буруу байна.' });
    }
    if (!name) return res.status(400).json({ error: 'Холбоосын нэр оруулна уу.' });

    const cr = await list({ prefix: `catalogs/${catalogId}`, limit: 50 });
    const catalog = cr.blobs.find((b: any) =>
      b.pathname.toLowerCase().startsWith(`catalogs/${catalogId}`) &&
      b.pathname.toLowerCase().endsWith('.pdf')
    ) as any;

    if (!catalog?.url) return res.status(404).json({ error: 'Тухайн каталог Blob дээр олдсонгүй.' });

    const linkId = crypto.randomBytes(9).toString('base64url');
    const baseSlug = makeSlug(name);
    let slug = baseSlug;
    const existing = await list({ prefix: 'share-links/named/', limit: 1000 });
    const existingNames = new Set(existing.blobs.map((b: any) => b.pathname.replace(/^share-links\/named\//, '').replace(/\.json$/i, '')));
    let suffix = 2;
    while (existingNames.has(slug)) slug = `${baseSlug}-${suffix++}`;

    const record = {
      linkId,
      slug,
      catalogId,
      name,
      filename,
      url: catalog.url,
      fileSize: catalog.size || 0,
      pathname: catalog.pathname || '',
      createdAt: new Date().toISOString(),
    };

    await put(`share-links/named/${slug}.json`, JSON.stringify(record), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });

    return res.status(201).json({
      link: `/share/${slug}`,
      slug,
      linkId,
      catalogId,
      name,
      filename,
    });
  } catch (error: any) {
    console.error('Admin share-links error:', error);
    return res.status(500).json({ error: error?.message || 'Холбоос үүсгэх үед алдаа гарлаа.' });
  }
}
