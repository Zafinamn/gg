import { list } from '@vercel/blob';

function validCatalogId(id: string): boolean {
  return /^[a-f0-9-]{20,64}$/i.test(id);
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') || '';

    if (!validCatalogId(id)) {
      return Response.json({ error: 'Буруу каталогийн холбоос.' }, { status: 400 });
    }

    // The upload may be represented by an exact pathname or by a pathname
    // with a Blob-generated suffix. Resolve by prefix and return the actual
    // public object URL that Blob reports.
    const prefix = `catalogs/${id}`;
    const result = await list({ prefix, limit: 100 });
    const candidates = result.blobs
      .filter((item: any) => item.pathname.startsWith(prefix) && item.pathname.toLowerCase().endsWith('.pdf'))
      .sort((a: any, b: any) => (b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0) - (a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0));

    const blob = candidates[0];

    if (!blob?.url) {
      return Response.json({ error: 'Каталогийн холбоос олдсонгүй.' }, { status: 404 });
    }

    return Response.json({
      id,
      url: blob.url,
      fileSize: blob.size,
      filename: `G&G Catalog.pdf`,
      contentType: blob.contentType || 'application/pdf',
      pathname: blob.pathname,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('Catalog lookup error:', error);
    return Response.json({
      error: error?.message || 'Каталогийн холбоос олдсонгүй.'
    }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
