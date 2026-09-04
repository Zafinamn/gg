import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list } from '@vercel/blob';

function validCatalogId(id: string): boolean {
  return /^[a-f0-9-]{20,64}$/i.test(id);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const id = String(req.query.id || '');
    if (!validCatalogId(id)) {
      return res.status(400).json({ error: 'Буруу каталогийн холбоос.' });
    }

    const prefix = `catalogs/${id}`;
    const result = await list({ prefix, limit: 100 });
    const candidates = result.blobs
      .filter((item: any) =>
        item.pathname.startsWith(prefix) &&
        item.pathname.toLowerCase().endsWith('.pdf')
      )
      .sort((a: any, b: any) =>
        (b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0) -
        (a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0)
      );

    const blob = candidates[0] as any;
    if (!blob?.url) {
      return res.status(404).json({ error: 'Каталогийн холбоос олдсонгүй.' });
    }

    return res.status(200).json({
      id,
      url: blob.url,
      fileSize: blob.size || 0,
      filename: 'G&G Catalog.pdf',
      contentType: blob.contentType || 'application/pdf',
      pathname: blob.pathname,
    }, {
      'Cache-Control': 'no-store',
    });
  } catch (error: any) {
    console.error('Catalog lookup error:', error);
    return res.status(500).json({
      error: error?.message || 'Каталогийн холбоос олдсонгүй.',
      'Cache-Control': 'no-store',
    });
  }
}
