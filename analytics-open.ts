import { put } from '@vercel/blob';
import crypto from 'node:crypto';

function clean(value: string | null, max = 120) {
  if (!value) return undefined;
  return value.slice(0, max);
}

export default async function handler(request: Request): Promise<Response> {
  try {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

    const body = await request.json().catch(() => ({}));
    const catalogId = clean(body?.catalogId, 100);
    const filename = clean(body?.filename, 180) || 'G&G Catalog.pdf';
    if (!catalogId) return Response.json({ error: 'Missing catalogId' }, { status: 400 });

    const country = clean(request.headers.get('x-vercel-ip-country'), 8);
    const countryRegion = clean(request.headers.get('x-vercel-ip-country-region'), 32);
    const city = clean(request.headers.get('x-vercel-ip-city'), 120);
    const continent = clean(request.headers.get('x-vercel-ip-continent'), 8);
    const timezone = clean(request.headers.get('x-vercel-ip-timezone'), 80);
    const latRaw = request.headers.get('x-vercel-ip-latitude');
    const lngRaw = request.headers.get('x-vercel-ip-longitude');
    const lat = latRaw ? Number(latRaw) : undefined;
    const lng = lngRaw ? Number(lngRaw) : undefined;
    const userAgent = clean(request.headers.get('user-agent'), 240);

    const event = {
      version: 1,
      type: 'catalog_open',
      eventId: crypto.randomBytes(12).toString('hex'),
      catalogId,
      filename,
      timestamp: new Date().toISOString(),
      country,
      countryRegion,
      city,
      continent,
      timezone,
      latitude: Number.isFinite(lat) ? Number(lat.toFixed(4)) : undefined,
      longitude: Number.isFinite(lng) ? Number(lng.toFixed(4)) : undefined,
      device: /mobile|android|iphone|ipad/i.test(userAgent || '') ? 'mobile' : /tablet/i.test(userAgent || '') ? 'tablet' : 'desktop',
    };

    await put(`analytics/${catalogId}/${event.eventId}.json`, JSON.stringify(event), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('Analytics open error:', error);
    // Analytics must never break the shared catalog viewer.
    return Response.json({ ok: false }, { status: 200 });
  }
}
