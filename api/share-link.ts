import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list } from '@vercel/blob';

function validId(id: string) {
  return /^[a-zA-Z0-9_-]{6,96}$/.test(id);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const id = String(req.query.id || '');
    if (!validId(id)) {
      return res.status(400).json({ error: 'Буруу каталогийн холбоос.' });
    }

    const namedPath = `share-links/named/${id}.json`;
    const namedResult = await list({ prefix: namedPath, limit: 20 });
    let recordBlob = namedResult.blobs.find((b: any) => b.pathname === namedPath) as any;

    // Backward compatibility: old links used the random linkId as the filename.
    if (!recordBlob?.url) {
      const legacyPath = `share-links/${id}.json`;
      const legacyResult = await list({ prefix: legacyPath, limit: 20 });
      recordBlob = legacyResult.blobs.find((b: any) => b.pathname === legacyPath) as any;
    }

    if (!recordBlob?.url) {
      return res.status(404).json({ error: 'Каталогийн холбоос олдсонгүй.' });
    }

    const rr = await fetch(recordBlob.url, { cache: 'no-store' });
    if (!rr.ok) {
      return res.status(404).json({ error: 'Каталогийн холбоосын мэдээлэл уншигдсангүй.' });
    }

    const record = await rr.json();
    const catalogId = String(record.catalogId || '');
    if (!/^[a-f0-9-]{20,64}$/i.test(catalogId)) {
      return res.status(404).json({ error: 'Каталогийн ID буруу байна.' });
    }

    // New links contain the exact public Blob URL in the share record.
    // This avoids a second Blob listing request during every shared-page open.
    let catalogUrl = typeof record.url === 'string' ? record.url : '';
    let fileSize = Number(record.fileSize || 0);
    let pathname = String(record.pathname || '');

    // Backward compatibility for older links created before url was stored.
    if (!catalogUrl) {
      const catalogPrefix = `catalogs/${catalogId}`;
      const result = await list({ prefix: catalogPrefix, limit: 100 });
      const blob = result.blobs
        .filter((b: any) =>
          b.pathname.toLowerCase().startsWith(catalogPrefix.toLowerCase()) &&
          b.pathname.toLowerCase().endsWith('.pdf')
        )
        .sort((a: any, b: any) =>
          (b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0) -
          (a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0)
        )[0] as any;

      if (!blob?.url) {
        return res.status(404).json({ error: 'Каталогийн файл олдсонгүй.' });
      }
      catalogUrl = blob.url;
      fileSize = blob.size || 0;
      pathname = blob.pathname || '';
    }

    return res.status(200).json({
      id: catalogId,
      linkId: record.linkId || id,
      linkName: record.name || '',
      url: catalogUrl,
      fileSize,
      filename: record.filename || 'G&G Catalog.pdf',
      contentType: 'application/pdf',
      pathname,
    }, {
      'Cache-Control': 'no-store',
    });
  } catch (error: any) {
    console.error('Shared catalog lookup error:', error);
    return res.status(500).json({
      error: error?.message || 'Каталогийн холбоосыг нээж чадсангүй.',
      'Cache-Control': 'no-store',
    });
  }
}
