import { NextResponse } from 'next/server';
import { saveSubscription } from '@/lib/push';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !body.endpoint || !body.keys) {
      return NextResponse.json({ ok: false, error: 'Invalid subscription' }, { status: 400 });
    }
    saveSubscription({
      endpoint: body.endpoint,
      keys: body.keys,
      expirationTime: body.expirationTime || null,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
