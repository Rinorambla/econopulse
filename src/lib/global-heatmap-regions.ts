export interface RegionNode {
  id: string; // e.g. 'americas', 'eu', 'asia'
  title: string;
  countries: string[]; // ISO country codes
}

export const REGIONS: RegionNode[] = [
  { id: 'americas', title: 'Americas', countries: ['US','CA','BR','MX'] },
  { id: 'europe', title: 'Europe', countries: ['GB','DE','FR','IT','ES','NL','CH'] },
  { id: 'asia', title: 'Asia-Pacific', countries: ['JP','CN','HK','IN','AU','KR','TW'] },
  { id: 'mea', title: 'Middle East & Africa', countries: ['ZA','SA','AE'] }
]

export function regionForCountry(cc: string): string {
  const upper = cc.toUpperCase()
  for (const r of REGIONS) if (r.countries.includes(upper)) return r.id
  return 'other'
}

// Basic sector mapping placeholder (can be replaced with GICS dataset)
export function normalizeSector(raw?: string): string {
  if (!raw) return 'Other'
  const r = raw.toLowerCase()
  if (r.includes('tech')) return 'Technology'
  if (r.includes('financ')) return 'Financials'
  if (r.includes('health') || r.includes('pharma') || r.includes('biotech')) return 'Healthcare'
  if (r.includes('energy') || r.includes('oil') || r.includes('gas')) return 'Energy'
  if (r.includes('indust')) return 'Industrials'
  if (r.includes('consum')) return 'Consumer'
  if (r.includes('util')) return 'Utilities'
  if (r.includes('mat')) return 'Materials'
  if (r.includes('real')) return 'Real Estate'
  if (r.includes('tele') || r.includes('comm')) return 'Communication'
  return 'Other'
}
