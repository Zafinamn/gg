import crypto from 'node:crypto';

function sign(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export default async function handler(request: Request): Promise<Response> {
  try {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const body = await request.json().catch(() => ({}));
    const password = String(body?.password || '');
    const secret = process.env.ADMIN_PASSWORD || '';
    if (!secret) return Response.json({ error: 'ADMIN_PASSWORD is not configured.' }, { status: 503 });
    const expected = Buffer.from(secret);
    const actual = Buffer.from(password);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      return Response.json({ error: 'Нууц үг буруу байна.' }, { status: 401 });
    }
    const exp = Date.now() + 12 * 60 * 60 * 1000;
    const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
    return Response.json({ token: `${payload}.${sign(payload, secret)}`, expiresAt: exp });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Authentication failed' }, { status: 500 });
  }
}
