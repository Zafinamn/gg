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

    const pathname = `catalogs/${id}.pdf`;

    // Use list() to resolve the actual Blob object and its public URL.
    // This is more robust for client/signed uploads because the URL can
    // contain the Blob service's immutable object suffix even when the
    // logical pathname is stable.
    const result = await list({ prefix: pathname, limit: 20 });
    const blob = result.blobs.find((item: any) => item.pathname === pathname)
      || result.blobs.find((item: any) => item.pathname.startsWith(pathname));

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
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    });
  } catch (error: any) {
    console.error('Catalog lookup error:', error);
    return Response.json({
      error: error?.message || 'Каталогийн холбоос олдсонгүй.'
    }, { status: 404 });
  }
}
