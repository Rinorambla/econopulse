/*
  A tiny, safe fetch wrapper for server/client with timeout, JSON parse guard,
  and a consistent result shape. Use for non-critical UI queries to avoid
  unhandled rejections bubbling into error boundaries.
*/

export type FetchSafeResult<T = unknown> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
};

export interface FetchSafeOptions extends RequestInit {
  timeoutMs?: number;
  asJson?: boolean; // if false, returns text
}

export async function fetchSafe<T = any>(
  input: RequestInfo | URL,
  { timeoutMs = 5000, asJson = true, ...init }: FetchSafeOptions = {}
): Promise<FetchSafeResult<T>> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined as any;
  const timeout = (typeof setTimeout !== 'undefined' && controller)
    ? setTimeout(() => controller.abort(), timeoutMs)
    : undefined;

  try {
    const res = await fetch(input, { ...init, signal: controller?.signal });
    let payload: any;

    if (asJson) {
      try {
        payload = await res.json();
      } catch {
        // fall back to text if JSON parse fails
        try { payload = await res.text(); } catch { payload = undefined; }
      }
    } else {
      try { payload = await res.text(); } catch { payload = undefined; }
    }

    return { ok: res.ok, status: res.status, data: payload };
  } catch (err: any) {
    const msg = (err?.name === 'AbortError') ? 'timeout' : (err?.message || 'fetch_failed');
    return { ok: false, status: 0, error: msg };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
