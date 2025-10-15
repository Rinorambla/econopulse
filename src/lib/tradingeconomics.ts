export interface TECustomerConfig {
	host?: string // default api.tradingeconomics.com
	key?: string // TRADINGECONOMICS_CLIENT_KEY
}

export interface TECalParams {
	d1: string // YYYY-MM-DD
	d2: string // YYYY-MM-DD
	country?: string // comma separated or single
	importance?: string // high,medium,low or 3,2,1
}

interface EconEvent { date: string; time?: string; region: string; event: string; importance: 'High'|'Medium'|'Low'; previous?: string; forecast?: string; actual?: string; source: string }

const importanceMap: Record<string, 'High'|'Medium'|'Low'> = {
	'3':'High', 'high':'High',
	'2':'Medium', 'medium':'Medium',
	'1':'Low', 'low':'Low'
}

export async function getTradingEconomicsCalendar(params: TECalParams, cfg: TECustomerConfig = {}): Promise<EconEvent[]> {
	const host = cfg.host || 'api.tradingeconomics.com'
	const key = cfg.key || process.env.TRADINGECONOMICS_CLIENT_KEY || 'guest:guest'
	// Build query
	const qp = new URLSearchParams()
	qp.set('d1', params.d1)
	qp.set('d2', params.d2)
		qp.set('c', key)
		if (params.country) qp.set('country', params.country)
		if (params.importance) {
			const raw = params.importance.toLowerCase()
			// map textual to numeric importance expected by TE
			const mapped = raw
				.replace(/high/g, '3')
				.replace(/medium/g, '2')
				.replace(/low/g, '1')
			qp.set('importance', mapped)
		}

	const url = `https://${host}/calendar?${qp.toString()}`

	const res = await fetch(url, {
		headers: {
			'Accept': 'application/json'
		},
		// TE supports basic auth via key in URL path or guest; using query/string is fine with guest
		next: { revalidate: 60 }
	})
	if (!res.ok) throw new Error(`TE HTTP ${res.status}`)
	const data = await res.json()
	if (!Array.isArray(data)) return []
	// Map TE fields to our schema
	// Sample TE fields: Country, Category, Event, Date, Time, Importance, Previous, Forecast, Actual
	const mapped: EconEvent[] = data.map((row: any) => {
		const dateStr = (row.Date || row.CalendarDate || row.date) ? new Date(row.Date || row.CalendarDate || row.date).toISOString().slice(0,10) : ''
		const timeStr = row.Time || row.LastUpdate || ''
		const impRaw = String(row.Importance || row.ImportanceValue || '').toLowerCase()
		const imp: 'High'|'Medium'|'Low' = importanceMap[impRaw] || (impRaw.includes('3')? 'High' : impRaw.includes('2')? 'Medium' : 'Low')
		const prev = row.Previous || row.PreviousValue
		const forecast = row.Forecast || row.Estimate
		const actual = row.Actual || row.ACTS || row.LatestValue
		return {
			date: dateStr,
			time: timeStr ? String(timeStr) : undefined,
			region: row.Country || row.Currency || 'Global',
			event: row.Event || row.Category || 'Event',
			importance: imp,
			previous: prev != null ? String(prev) : undefined,
			forecast: forecast != null ? String(forecast) : undefined,
			actual: actual != null ? String(actual) : undefined,
			source: 'TradingEconomics'
		}
	}).filter(ev => !!ev.date && !!ev.event)

	// Sort by date then importance
	return mapped.sort((a,b)=> (a.date.localeCompare(b.date) || (a.importance===b.importance?0:(a.importance==='High'? -1: 1))))
}
