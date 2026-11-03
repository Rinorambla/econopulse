// Catalogue for the indicator search on /economics: Trading Economics country
// slugs × indicator slugs → chart path "/{country}/{indicator}". Client-safe.
// Not every pair exists upstream (the chart shows an empty frame for unknown
// series), so the catalogue sticks to broadly published indicators.

export type TeCountry = { slug: string; name: string; code: string; aliases?: string[] };
export type TeIndicator = { slug: string; name: string; group: string; aliases?: string[] };

export const TE_COUNTRIES: TeCountry[] = [
  { code: 'US', name: 'United States', slug: 'united-states', aliases: ['usa', 'america', 'stati uniti', 'fed', 'treasury', 'treasuries'] },
  { code: 'EU', name: 'Euro Area', slug: 'euro-area', aliases: ['eurozone', 'eurozona', 'ecb', 'bce'] },
  { code: 'CN', name: 'China', slug: 'china', aliases: ['cina', 'prc'] },
  { code: 'JP', name: 'Japan', slug: 'japan', aliases: ['giappone', 'boj', 'jgb'] },
  { code: 'DE', name: 'Germany', slug: 'germany', aliases: ['germania', 'deutschland', 'bund'] },
  { code: 'GB', name: 'United Kingdom', slug: 'united-kingdom', aliases: ['uk', 'britain', 'regno unito', 'boe', 'gilt', 'gilts'] },
  { code: 'FR', name: 'France', slug: 'france', aliases: ['francia', 'oat'] },
  { code: 'IT', name: 'Italy', slug: 'italy', aliases: ['italia', 'btp'] },
  { code: 'IN', name: 'India', slug: 'india', aliases: ['rbi'] },
  { code: 'CA', name: 'Canada', slug: 'canada', aliases: ['boc'] },
  { code: 'BR', name: 'Brazil', slug: 'brazil', aliases: ['brasile'] },
  { code: 'KR', name: 'South Korea', slug: 'south-korea', aliases: ['korea', 'corea'] },
  { code: 'AU', name: 'Australia', slug: 'australia', aliases: ['rba'] },
  { code: 'MX', name: 'Mexico', slug: 'mexico', aliases: ['messico'] },
  { code: 'ES', name: 'Spain', slug: 'spain', aliases: ['spagna', 'bonos'] },
  { code: 'ID', name: 'Indonesia', slug: 'indonesia' },
  { code: 'NL', name: 'Netherlands', slug: 'netherlands', aliases: ['olanda', 'holland', 'paesi bassi'] },
  { code: 'SA', name: 'Saudi Arabia', slug: 'saudi-arabia', aliases: ['arabia saudita'] },
  { code: 'TR', name: 'Turkey', slug: 'turkey', aliases: ['turchia', 'turkiye'] },
  { code: 'CH', name: 'Switzerland', slug: 'switzerland', aliases: ['svizzera', 'snb'] },
  { code: 'PL', name: 'Poland', slug: 'poland', aliases: ['polonia'] },
  { code: 'AR', name: 'Argentina', slug: 'argentina' },
  { code: 'BE', name: 'Belgium', slug: 'belgium', aliases: ['belgio'] },
  { code: 'SE', name: 'Sweden', slug: 'sweden', aliases: ['svezia', 'riksbank'] },
  { code: 'IE', name: 'Ireland', slug: 'ireland', aliases: ['irlanda'] },
  { code: 'AT', name: 'Austria', slug: 'austria' },
  { code: 'NO', name: 'Norway', slug: 'norway', aliases: ['norvegia'] },
  { code: 'IL', name: 'Israel', slug: 'israel', aliases: ['israele'] },
  { code: 'TH', name: 'Thailand', slug: 'thailand', aliases: ['thailandia'] },
  { code: 'AE', name: 'United Arab Emirates', slug: 'united-arab-emirates', aliases: ['uae', 'emirati', 'dubai'] },
  { code: 'SG', name: 'Singapore', slug: 'singapore' },
  { code: 'MY', name: 'Malaysia', slug: 'malaysia' },
  { code: 'VN', name: 'Vietnam', slug: 'vietnam' },
  { code: 'PH', name: 'Philippines', slug: 'philippines', aliases: ['filippine'] },
  { code: 'DK', name: 'Denmark', slug: 'denmark', aliases: ['danimarca'] },
  { code: 'HK', name: 'Hong Kong', slug: 'hong-kong' },
  { code: 'FI', name: 'Finland', slug: 'finland', aliases: ['finlandia'] },
  { code: 'PT', name: 'Portugal', slug: 'portugal', aliases: ['portogallo'] },
  { code: 'GR', name: 'Greece', slug: 'greece', aliases: ['grecia'] },
  { code: 'NZ', name: 'New Zealand', slug: 'new-zealand', aliases: ['nuova zelanda', 'rbnz'] },
  { code: 'CL', name: 'Chile', slug: 'chile', aliases: ['cile'] },
  { code: 'CO', name: 'Colombia', slug: 'colombia' },
  { code: 'ZA', name: 'South Africa', slug: 'south-africa', aliases: ['sudafrica'] },
  { code: 'EG', name: 'Egypt', slug: 'egypt', aliases: ['egitto'] },
  { code: 'CZ', name: 'Czech Republic', slug: 'czech-republic', aliases: ['czechia', 'repubblica ceca'] },
  { code: 'RO', name: 'Romania', slug: 'romania' },
  { code: 'HU', name: 'Hungary', slug: 'hungary', aliases: ['ungheria'] },
  { code: 'RU', name: 'Russia', slug: 'russia' },
  { code: 'TW', name: 'Taiwan', slug: 'taiwan' },
  { code: 'NG', name: 'Nigeria', slug: 'nigeria' },
  { code: 'PK', name: 'Pakistan', slug: 'pakistan' },
  { code: 'BD', name: 'Bangladesh', slug: 'bangladesh' },
  { code: 'PE', name: 'Peru', slug: 'peru', aliases: ['perù'] },
  { code: 'QA', name: 'Qatar', slug: 'qatar' },
  { code: 'KW', name: 'Kuwait', slug: 'kuwait' },
  { code: 'MA', name: 'Morocco', slug: 'morocco', aliases: ['marocco'] },
  { code: 'KE', name: 'Kenya', slug: 'kenya' },
  { code: 'UA', name: 'Ukraine', slug: 'ukraine', aliases: ['ucraina'] },
  { code: 'KZ', name: 'Kazakhstan', slug: 'kazakhstan' },
  { code: 'IS', name: 'Iceland', slug: 'iceland', aliases: ['islanda'] },
  { code: 'LU', name: 'Luxembourg', slug: 'luxembourg', aliases: ['lussemburgo'] },
  { code: 'SK', name: 'Slovakia', slug: 'slovakia', aliases: ['slovacchia'] },
  { code: 'SI', name: 'Slovenia', slug: 'slovenia' },
  { code: 'HR', name: 'Croatia', slug: 'croatia', aliases: ['croazia'] },
  { code: 'BG', name: 'Bulgaria', slug: 'bulgaria' },
  { code: 'LT', name: 'Lithuania', slug: 'lithuania', aliases: ['lituania'] },
  { code: 'LV', name: 'Latvia', slug: 'latvia', aliases: ['lettonia'] },
  { code: 'EE', name: 'Estonia', slug: 'estonia' },
  { code: 'CY', name: 'Cyprus', slug: 'cyprus', aliases: ['cipro'] },
  { code: 'MT', name: 'Malta', slug: 'malta' },
];

export const TE_INDICATORS: TeIndicator[] = [
  // Growth
  { slug: 'gdp-growth', name: 'GDP Growth Rate (QoQ)', group: 'Growth', aliases: ['pil', 'crescita'] },
  { slug: 'gdp-growth-annual', name: 'GDP Annual Growth Rate', group: 'Growth', aliases: ['gdp yoy', 'pil annuo'] },
  { slug: 'gdp', name: 'GDP (nominal, USD)', group: 'Growth' },
  { slug: 'gdp-per-capita', name: 'GDP per Capita', group: 'Growth', aliases: ['pro capite'] },
  { slug: 'full-year-gdp-growth', name: 'Full Year GDP Growth', group: 'Growth' },
  // Prices
  { slug: 'inflation-cpi', name: 'Inflation Rate (CPI YoY)', group: 'Prices', aliases: ['cpi', 'inflazione', 'prezzi', 'hicp'] },
  { slug: 'inflation-rate-mom', name: 'Inflation Rate MoM', group: 'Prices', aliases: ['cpi mom'] },
  { slug: 'core-inflation-rate', name: 'Core Inflation Rate', group: 'Prices', aliases: ['core cpi', 'inflazione core'] },
  { slug: 'food-inflation', name: 'Food Inflation', group: 'Prices', aliases: ['cibo', 'alimentari'] },
  { slug: 'producer-prices-change', name: 'Producer Prices (PPI YoY)', group: 'Prices', aliases: ['ppi', 'prezzi produzione'] },
  { slug: 'inflation-expectations', name: 'Inflation Expectations', group: 'Prices', aliases: ['aspettative'] },
  // Money & rates
  { slug: 'interest-rate', name: 'Policy Interest Rate', group: 'Money', aliases: ['rate', 'rates', 'policy rate', 'tassi', 'tasso', 'central bank', 'fed funds', 'refi', 'banca centrale'] },
  { slug: 'government-bond-yield', name: '10Y Government Bond Yield', group: 'Money', aliases: ['10y', 'yield', 'rendimento', 'btp', 'bund', 'treasury', 'gilt', 'jgb', 'oat', 'bond'] },
  { slug: 'interbank-rate', name: 'Interbank Rate', group: 'Money', aliases: ['euribor', 'sofr', 'libor'] },
  { slug: 'money-supply-m2', name: 'Money Supply M2', group: 'Money', aliases: ['m2'] },
  { slug: 'bank-lending-rate', name: 'Bank Lending Rate', group: 'Money' },
  { slug: 'loans-to-private-sector', name: 'Loans to Private Sector', group: 'Money', aliases: ['credito', 'prestiti'] },
  { slug: 'foreign-exchange-reserves', name: 'Foreign Exchange Reserves', group: 'Money', aliases: ['riserve'] },
  // Labour
  { slug: 'unemployment-rate', name: 'Unemployment Rate', group: 'Labour', aliases: ['disoccupazione', 'jobless', 'lavoro'] },
  { slug: 'youth-unemployment-rate', name: 'Youth Unemployment Rate', group: 'Labour', aliases: ['giovanile'] },
  { slug: 'employment-rate', name: 'Employment Rate', group: 'Labour', aliases: ['occupazione'] },
  { slug: 'labor-force-participation-rate', name: 'Labour Force Participation', group: 'Labour', aliases: ['partecipazione'] },
  { slug: 'non-farm-payrolls', name: 'Non Farm Payrolls', group: 'Labour', aliases: ['nfp', 'payrolls', 'buste paga'] },
  { slug: 'wage-growth', name: 'Wage Growth', group: 'Labour', aliases: ['salari', 'wages'] },
  { slug: 'wages', name: 'Wages', group: 'Labour', aliases: ['stipendi'] },
  { slug: 'job-vacancies', name: 'Job Vacancies', group: 'Labour', aliases: ['jolts', 'posti vacanti'] },
  { slug: 'initial-jobless-claims', name: 'Initial Jobless Claims', group: 'Labour', aliases: ['claims', 'sussidi'] },
  // Business
  { slug: 'manufacturing-pmi', name: 'Manufacturing PMI', group: 'Business', aliases: ['pmi manifatturiero'] },
  { slug: 'services-pmi', name: 'Services PMI', group: 'Business', aliases: ['pmi servizi'] },
  { slug: 'composite-pmi', name: 'Composite PMI', group: 'Business' },
  { slug: 'business-confidence', name: 'Business Confidence', group: 'Business', aliases: ['ism', 'ifo', 'fiducia imprese'] },
  { slug: 'industrial-production', name: 'Industrial Production (YoY)', group: 'Business', aliases: ['produzione industriale'] },
  { slug: 'industrial-production-mom', name: 'Industrial Production MoM', group: 'Business' },
  { slug: 'manufacturing-production', name: 'Manufacturing Production', group: 'Business' },
  { slug: 'capacity-utilization', name: 'Capacity Utilization', group: 'Business' },
  { slug: 'factory-orders', name: 'Factory Orders', group: 'Business', aliases: ['ordini'] },
  { slug: 'durable-goods-orders', name: 'Durable Goods Orders', group: 'Business', aliases: ['beni durevoli'] },
  { slug: 'car-registrations', name: 'Car Registrations', group: 'Business', aliases: ['auto', 'immatricolazioni'] },
  { slug: 'zew-economic-sentiment-index', name: 'ZEW Economic Sentiment', group: 'Business', aliases: ['zew'] },
  { slug: 'bankruptcies', name: 'Bankruptcies', group: 'Business', aliases: ['fallimenti'] },
  // Consumer
  { slug: 'consumer-confidence', name: 'Consumer Confidence', group: 'Consumer', aliases: ['michigan', 'fiducia consumatori', 'sentiment'] },
  { slug: 'retail-sales', name: 'Retail Sales MoM', group: 'Consumer', aliases: ['vendite al dettaglio'] },
  { slug: 'retail-sales-annual', name: 'Retail Sales YoY', group: 'Consumer' },
  { slug: 'consumer-spending', name: 'Consumer Spending', group: 'Consumer', aliases: ['consumi'] },
  { slug: 'personal-income', name: 'Personal Income', group: 'Consumer', aliases: ['reddito'] },
  { slug: 'consumer-credit', name: 'Consumer Credit', group: 'Consumer' },
  { slug: 'households-debt-to-gdp', name: 'Household Debt to GDP', group: 'Consumer', aliases: ['famiglie'] },
  { slug: 'gasoline-prices', name: 'Gasoline Prices', group: 'Consumer', aliases: ['benzina', 'carburante'] },
  // Housing
  { slug: 'housing-index', name: 'House Price Index', group: 'Housing', aliases: ['case', 'immobiliare', 'prezzi case'] },
  { slug: 'building-permits', name: 'Building Permits', group: 'Housing', aliases: ['permessi'] },
  { slug: 'housing-starts', name: 'Housing Starts', group: 'Housing' },
  { slug: 'existing-home-sales', name: 'Existing Home Sales', group: 'Housing' },
  { slug: 'new-home-sales', name: 'New Home Sales', group: 'Housing' },
  { slug: 'construction-output', name: 'Construction Output', group: 'Housing', aliases: ['costruzioni'] },
  { slug: 'mortgage-rate', name: 'Mortgage Rate', group: 'Housing', aliases: ['mutui'] },
  // Trade
  { slug: 'balance-of-trade', name: 'Balance of Trade', group: 'Trade', aliases: ['bilancia commerciale', 'trade balance'] },
  { slug: 'current-account', name: 'Current Account', group: 'Trade', aliases: ['partite correnti'] },
  { slug: 'current-account-to-gdp', name: 'Current Account to GDP', group: 'Trade' },
  { slug: 'exports', name: 'Exports', group: 'Trade', aliases: ['export', 'esportazioni'] },
  { slug: 'imports', name: 'Imports', group: 'Trade', aliases: ['import', 'importazioni'] },
  { slug: 'foreign-direct-investment', name: 'Foreign Direct Investment', group: 'Trade', aliases: ['fdi'] },
  { slug: 'terms-of-trade', name: 'Terms of Trade', group: 'Trade' },
  { slug: 'tourist-arrivals', name: 'Tourist Arrivals', group: 'Trade', aliases: ['turismo', 'turisti'] },
  { slug: 'gold-reserves', name: 'Gold Reserves', group: 'Trade', aliases: ['oro'] },
  // Government
  { slug: 'government-debt-to-gdp', name: 'Government Debt to GDP', group: 'Government', aliases: ['debito', 'debt'] },
  { slug: 'government-budget', name: 'Government Budget (% GDP)', group: 'Government', aliases: ['deficit', 'bilancio'] },
  { slug: 'government-budget-value', name: 'Government Budget Value', group: 'Government' },
  { slug: 'government-spending', name: 'Government Spending', group: 'Government', aliases: ['spesa pubblica'] },
  { slug: 'government-revenues', name: 'Government Revenues', group: 'Government', aliases: ['entrate'] },
  { slug: 'government-debt', name: 'Government Debt', group: 'Government' },
  { slug: 'credit-rating', name: 'Credit Rating', group: 'Government', aliases: ['rating'] },
  { slug: 'corporate-tax-rate', name: 'Corporate Tax Rate', group: 'Government', aliases: ['tasse', 'imposte'] },
  { slug: 'personal-income-tax-rate', name: 'Personal Income Tax Rate', group: 'Government', aliases: ['irpef'] },
  // Markets
  { slug: 'currency', name: 'Currency (vs USD)', group: 'Markets', aliases: ['fx', 'cambio', 'valuta', 'exchange rate', 'forex'] },
  { slug: 'stock-market', name: 'Stock Market Index', group: 'Markets', aliases: ['borsa', 'azioni', 'equity', 'index'] },
  // Demographics
  { slug: 'population', name: 'Population', group: 'Demographics', aliases: ['popolazione'] },
];

export const DEFAULT_COUNTRY = TE_COUNTRIES[0];
export const DEFAULT_INDICATOR = TE_INDICATORS.find((i) => i.slug === 'inflation-cpi')!;

/** Headline indicator chips shown under the pickers for the selected country. */
export const HEADLINE_SLUGS = [
  'inflation-cpi', 'core-inflation-rate', 'interest-rate', 'gdp-growth', 'gdp-growth-annual', 'unemployment-rate',
  'government-bond-yield', 'manufacturing-pmi', 'retail-sales', 'consumer-confidence', 'balance-of-trade', 'government-debt-to-gdp',
];

export type SearchHit = { country: TeCountry; indicator: TeIndicator; url: string; score: number };

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const cText = new Map(TE_COUNTRIES.map((c) => [c.slug, norm([c.name, c.code, c.slug.replace(/-/g, ' '), ...(c.aliases || [])].join(' '))]));
const iText = new Map(TE_INDICATORS.map((i) => [i.slug, norm([i.name, i.slug.replace(/-/g, ' '), i.group, ...(i.aliases || [])].join(' '))]));
const iAlias = new Map(TE_INDICATORS.map((i) => [i.slug, new Set(norm((i.aliases || []).join(' ')).split(' ').filter(Boolean))]));
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function matchScore(tokens: string[], c: TeCountry, i: TeIndicator): number {
  const ct = cText.get(c.slug)!;
  const it = iText.get(i.slug)!;
  let score = 0;
  let countryHit = false;
  let indicatorHit = false;
  for (const t of tokens) {
    const inC = ct.includes(t);
    const inI = it.includes(t);
    if (!inC && !inI) return 0; // every token must match somewhere
    if (inC) countryHit = true;
    if (inI) indicatorHit = true;
    // Word-start matches rank above substrings; indicator matches above country.
    const re = new RegExp(`(^| )${esc(t)}`);
    score += (re.test(inI ? it : ct) ? 3 : 1) + (inI ? 1 : 0);
  }
  if (countryHit && indicatorHit) score += 6;
  // Tokens hitting an indicator's explicit keywords (aliases) outrank name
  // coincidences, so "boe rate" → Policy Interest Rate rather than CPI.
  const aliases = iAlias.get(i.slug)!;
  if (tokens.some((t) => aliases.has(t))) score += 5;
  return score;
}

// Ranked free-text search over the whole catalogue ("italy debt", "cpi", "boj").
// Country-only queries return that country's headline indicators; indicator-only
// queries fan out across economies in catalogue order (majors first).
export function searchIndicators(query: string, limit = 30): SearchHit[] {
  const tokens = norm(query).split(' ').filter((t) => t.length >= 2);
  if (!tokens.length) return [];
  const hits: SearchHit[] = [];
  for (const c of TE_COUNTRIES) {
    for (const i of TE_INDICATORS) {
      const score = matchScore(tokens, c, i);
      if (score > 0) {
        const headline = HEADLINE_SLUGS.indexOf(i.slug);
        hits.push({ country: c, indicator: i, url: `/${c.slug}/${i.slug}`, score: score * 10 + (headline >= 0 ? HEADLINE_SLUGS.length - headline : 0) });
      }
    }
  }
  hits.sort((a, b) => b.score - a.score || TE_COUNTRIES.indexOf(a.country) - TE_COUNTRIES.indexOf(b.country) || TE_INDICATORS.indexOf(a.indicator) - TE_INDICATORS.indexOf(b.indicator));
  return hits.slice(0, limit);
}
