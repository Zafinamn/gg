import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function sign(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const password = String((req.body && typeof req.body === 'object' ? req.body.password : '') || '');
    const secret = process.env.ADMIN_PASSWORD || '';
    if (!secret) return res.status(503).json({ error: 'ADMIN_PASSWORD is not configured.' });

    const expected = Buffer.from(secret);
    const actual = Buffer.from(password);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      return res.status(401).json({ error: 'Нууц үг буруу байна.' });
    }

    const exp = Date.now() + 12 * 60 * 60 * 1000;
    const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
    return res.status(200).json({ token: `${payload}.${sign(payload, secret)}`, expiresAt: exp });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Authentication failed' });
  }
}
