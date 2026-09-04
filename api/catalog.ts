import { head } from '@vercel/blob';

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') || '';

    if (!/^[a-f0-9-]{20,64}$/i.test(id)) {
      return Response.json({ error: 'Буруу каталогийн холбоос.' }, { status: 400 });
    }

    const blob = await head(`catalogs/${id}.pdf`);

    return Response.json({
      id,
      url: blob.url,
      fileSize: blob.size,
      filename: `G&G Catalog.pdf`,
      contentType: blob.contentType,
    }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    });
  } catch (error: any) {
    console.error('Catalog lookup error:', error);
    return Response.json({ error: 'Каталогийн холбоос олдсонгүй.' }, { status: 404 });
  }
}
