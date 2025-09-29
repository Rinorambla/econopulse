export interface HistoryBar { time:number; close:number }
export interface HistoryResponse { symbol:string; bars:HistoryBar[] }

export async function fetchHistory(symbol:string, range:string, interval:string): Promise<HistoryResponse | null> {
  const url = `/api/yahoo-history?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json()
  return json?.data || null
}
