import { list } from '@vercel/blob';
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
  } catch { return false; }
}

function parseEvent(buffer: Buffer) {
  return JSON.parse(buffer.toString('utf8'));
}


async function fetchEvents(secret: string, prefix = 'analytics/') {
  const events: any[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const result = await list({ prefix, limit: 1000, cursor });
    for (const blob of result.blobs) {
      try {
        const res = await fetch(blob.url, { cache: 'no-store' });
        if (!res.ok) continue;
        const bytes = Buffer.from(await res.arrayBuffer());
        events.push(parseEvent(bytes));
      } catch (e) {
        console.error('Analytics decrypt error', blob.pathname, e);
      }
    }
    if (!result.hasMore || !result.cursor) break;
    cursor = result.cursor;
  }
  return events;
}

export default async function handler(request: Request): Promise<Response> {
  try {
    if (request.method !== 'GET') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const secret = process.env.ADMIN_PASSWORD || '';
    if (!secret) return Response.json({ error: 'ADMIN_PASSWORD is not configured.' }, { status: 503 });
    const auth = request.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ') || !verifyToken(auth.slice(7), secret)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await fetchEvents(secret);
    const catalogMap = new Map<string, any>();
    const locationMap = new Map<string, any>();
    const dailyMap = new Map<string, number>();

    for (const event of events) {
      const catalog = catalogMap.get(event.catalogId) || { id: event.catalogId, filename: event.filename || 'G&G Catalog.pdf', opens: 0, lastOpenedAt: null };
      catalog.opens += 1;
      if (!catalog.lastOpenedAt || new Date(event.timestamp) > new Date(catalog.lastOpenedAt)) catalog.lastOpenedAt = event.timestamp;
      catalogMap.set(event.catalogId, catalog);

      const locationKey = [event.country || '—', event.countryRegion || '', event.city || '—'].join('|');
      const location = locationMap.get(locationKey) || {
        country: event.country || '—', region: event.countryRegion || '', city: event.city || '—',
        latitude: event.latitude ?? null, longitude: event.longitude ?? null, opens: 0,
      };
      location.opens += 1;
      if (location.latitude == null && event.latitude != null) location.latitude = event.latitude;
      if (location.longitude == null && event.longitude != null) location.longitude = event.longitude;
      locationMap.set(locationKey, location);

      const day = String(event.timestamp).slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    }

    const topCity = [...locationMap.values()].sort((a, b) => b.opens - a.opens)[0] || null;
    return Response.json({
      generatedAt: new Date().toISOString(),
      summary: {
        totalOpens: events.length,
        totalCatalogs: catalogMap.size,
        countries: new Set(events.map((e) => e.country).filter(Boolean)).size,
        topCity: topCity ? `${topCity.city}${topCity.country && topCity.country !== '—' ? `, ${topCity.country}` : ''}` : '—',
      },
      catalogs: [...catalogMap.values()].sort((a, b) => b.opens - a.opens),
      locations: [...locationMap.values()].sort((a, b) => b.opens - a.opens),
      daily: [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, opens]) => ({ date, opens })),
    });
  } catch (error: any) {
    console.error('Admin analytics error:', error);
    return Response.json({ error: error?.message || 'Analytics failed' }, { status: 500 });
  }
}
