import { list } from '@vercel/blob';
function validId(id: string) { return /^[a-zA-Z0-9_-]{6,96}$/.test(id); }
export default async function handler(request: Request): Promise<Response> {
  try {
    if (request.method !== 'GET') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const id = new URL(request.url).searchParams.get('id') || '';
    if (!validId(id)) return Response.json({ error: 'Буруу каталогийн холбоос.' }, { status: 400 });
    const recordResult = await list({ prefix: `share-links/${id}.json`, limit: 20 });
    const recordBlob = recordResult.blobs.find((b: any) => b.pathname === `share-links/${id}.json`) as any;
    if (!recordBlob?.url) return Response.json({ error: 'Каталогийн холбоос олдсонгүй.' }, { status: 404 });
    const rr = await fetch(recordBlob.url, { cache: 'no-store' });
    if (!rr.ok) return Response.json({ error: 'Каталогийн холбоосын мэдээлэл уншигдсангүй.' }, { status: 404 });
    const record = await rr.json();
    const result = await list({ prefix: `catalogs/${record.catalogId}`, limit: 100 });
    const blob = result.blobs.filter((b: any) => b.pathname.toLowerCase().startsWith(`catalogs/${record.catalogId}`) && b.pathname.toLowerCase().endsWith('.pdf')).sort((a: any,b: any)=>(b.uploadedAt?new Date(b.uploadedAt).getTime():0)-(a.uploadedAt?new Date(a.uploadedAt).getTime():0))[0];
    if (!blob?.url) return Response.json({ error: 'Каталогийн холбоос олдсонгүй.' }, { status: 404 });
    return Response.json({ id: record.catalogId, linkId: record.linkId || id, linkName: record.name || '', url: blob.url, fileSize: blob.size, filename: record.filename || 'G&G Catalog.pdf', contentType: blob.contentType || 'application/pdf', pathname: blob.pathname }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) { return Response.json({ error: e?.message || 'Каталогийн холбоос олдсонгүй.' }, { status: 500 }); }
}
