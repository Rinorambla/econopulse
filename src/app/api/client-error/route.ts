import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json().catch(() => ({}));
    const now = new Date().toISOString();
    const ua = (req.headers.get('user-agent') || '').slice(0, 200);
    // eslint-disable-next-line no-console
    console.error('[ClientError]', { now, ua, ...data });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[ClientError] failed to parse body');
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
