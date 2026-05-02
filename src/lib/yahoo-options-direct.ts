// Direct Yahoo Finance options chain fetch with crumb auth.
// Bypasses yahoo-finance2 which fails on Vercel serverless (cookie/crumb handshake unreliable).
// Flow: GET fc.yahoo.com → grab Set-Cookie → GET /v1/test/getcrumb with cookie → call /v7 with crumb+cookie.

let cache: { crumb: string; cookie: string; ts: number } | null = null;
const TTL = 30 * 60 * 1000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (cache && (Date.now() - cache.ts) < TTL) return { crumb: cache.crumb, cookie: cache.cookie };
  try {
    const r1 = await fetch('https://fc.yahoo.com/', {
      signal: AbortSignal.timeout(4000),
      headers: { 'User-Agent': UA },
    }).catch(() => null);
    const setCookieRaw = r1?.headers.get('set-cookie') || '';
    const cookie = setCookieRaw.split(/,(?=[^ ])/g).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
    if (!cookie) return null;
    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      signal: AbortSignal.timeout(4000),
      headers: { 'User-Agent': UA, 'Cookie': cookie },
    });
    if (!r2.ok) return null;
    const crumb = (await r2.text()).trim();
    if (!crumb) return null;
    cache = { crumb, cookie, ts: Date.now() };
    return { crumb, cookie };
  } catch {
    return null;
  }
}

// Fetch an options chain for one expiration (or first/nearest if `date` not provided).
export async function fetchYahooOptionsChain(symbol: string, date?: number): Promise<any | null> {
  const auth = await getYahooCrumb();
  if (!auth) return null;
  const dateParam = date ? `&date=${date}` : '';
  const hosts = ['query2.finance.yahoo.com', 'query1.finance.yahoo.com'];
  for (const host of hosts) {
    const url = `https://${host}/v7/finance/options/${encodeURIComponent(symbol)}?crumb=${encodeURIComponent(auth.crumb)}${dateParam}`;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Cookie': auth.cookie },
      });
      if (res.status === 401 || res.status === 403) {
        cache = null;
        const fresh = await getYahooCrumb();
        if (!fresh) continue;
        const retry = await fetch(`https://${host}/v7/finance/options/${encodeURIComponent(symbol)}?crumb=${encodeURIComponent(fresh.crumb)}${dateParam}`, {
          signal: AbortSignal.timeout(6000),
          headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Cookie': fresh.cookie },
        });
        if (!retry.ok) continue;
        const j = await retry.json();
        const r = j?.optionChain?.result?.[0];
        if (r) return r;
        continue;
      }
      if (!res.ok) continue;
      const j = await res.json();
      const r = j?.optionChain?.result?.[0];
      if (r) return r;
    } catch { /* try next host */ }
  }
  return null;
}
