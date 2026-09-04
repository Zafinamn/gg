import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const payload = {
      catalogId: String(body.catalogId || ''),
      linkId: String(body.linkId || body.catalogId || ''),
      linkName: String(body.linkName || ''),
      filename: String(body.filename || 'G&G Catalog.pdf'),
      timestamp: new Date().toISOString(),
      country: String(req.headers['x-vercel-ip-country'] || ''),
      countryRegion: String(req.headers['x-vercel-ip-country-region'] || ''),
      city: String(req.headers['x-vercel-ip-city'] || ''),
      latitude: req.headers['x-vercel-ip-latitude'] ? Number(req.headers['x-vercel-ip-latitude']) : null,
      longitude: req.headers['x-vercel-ip-longitude'] ? Number(req.headers['x-vercel-ip-longitude']) : null,
    };
    if (!payload.catalogId) return res.status(400).json({ error: 'catalogId is required' });
    await put(`analytics/${cryptoRandomId()}.json`, JSON.stringify(payload), {
      access: 'public',
      contentType: 'application/json',
    });
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Analytics open error:', error);
    return res.status(500).json({ error: error?.message || 'Analytics event failed' });
  }
}

function cryptoRandomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
