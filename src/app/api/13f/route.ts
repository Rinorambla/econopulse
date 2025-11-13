import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { getClientIp, rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

// Ensure Node runtime for fs and external fetches
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Holding = {
  nameOfIssuer?: string
  titleOfClass?: string
  cusip?: string
  value?: number // reported in thousands USD in 13F
  sshPrnamt?: number
  sshPrnamtType?: string
  putCall?: string
  investmentDiscretion?: string
  votingAuthority?: { Sole?: number; Shared?: number; None?: number }
}

type FilingMeta = {
  accessionNumber: string
  reportCalendarOrQuarter?: string
  filingDate?: string
  acceptedDate?: string
  primaryDocument?: string
}

const SNAP_DIR = path.join(process.cwd(), 'data-snapshots', '13f')

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true }).catch(() => {})
}

// SEC requires a descriptive User-Agent. We'll build one from public info if available.
function secHeaders() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.BASE_URL || 'https://localhost'
  return {
    'User-Agent': `EconoPulse-13F/1.0 (+${site}; contact: support@econo-pulse.local)`,
    'Accept': 'application/json,*/*;q=0.8',
  }
}

function stripLeadingZeros(s: string) { return s.replace(/^0+/, '') || '0' }
function padCik(cik: string) { return (cik || '').replace(/\D/g,'').padStart(10, '0') }
function unDash(s: string) { return (s || '').replace(/-/g, '') }

async function fetchJson<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { headers: secHeaders(), next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`)
  return res.json() as Promise<T>
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: secHeaders(), next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`)
  return res.text()
}

// Find latest 13F filing for a CIK via submissions JSON
async function getLatest13F(cik10: string): Promise<FilingMeta | null> {
  const cikNoZeros = stripLeadingZeros(cik10)
  const url = `https://data.sec.gov/submissions/CIK${cik10}.json`
  const data: any = await fetchJson(url)
  const forms: string[] = data?.filings?.recent?.form || []
  const acc: string[] = data?.filings?.recent?.accessionNumber || []
  const dates: string[] = data?.filings?.recent?.filingDate || []
  const accepted: string[] = data?.filings?.recent?.acceptanceDateTime || []
  const prim: string[] = data?.filings?.recent?.primaryDocument || []
  const period: string[] = data?.filings?.recent?.reportDate || data?.filings?.recent?.reportCalendarOrQuarter || []
  let idx = -1
  for (let i = 0; i < forms.length; i++) {
    const f = String(forms[i]||'')
    if (f === '13F-HR' || f === '13F-HR/A') { idx = i; break }
  }
  if (idx < 0) return null
  return {
    accessionNumber: String(acc[idx]||'').trim(),
    filingDate: String(dates[idx]||'').trim(),
    acceptedDate: String(accepted[idx]||'').trim(),
    primaryDocument: String(prim[idx]||'').trim(),
    reportCalendarOrQuarter: String(period[idx]||'').trim(),
  }
}

// Given cik and accession, list files in the filing folder and pick the infotable XML
async function getInfoTableUrl(cik10: string, accession: string): Promise<string | null> {
  const cikNoZeros = stripLeadingZeros(cik10)
  const accNoDash = unDash(accession)
  const base = `https://www.sec.gov/Archives/edgar/data/${cikNoZeros}/${accNoDash}`
  // directory index json is available on sec archives
  const indexUrl = `${base}/index.json`
  const idx: any = await fetchJson(indexUrl)
  const items: Array<{ name: string }> = idx?.directory?.item || []
  // Select file containing xml and likely infotable
  const xmlCandidates = items.filter(it => /\.xml$/i.test(it.name))
  const preferred = xmlCandidates.find(it => /(info|table|form13f)/i.test(it.name)) || xmlCandidates[0]
  if (!preferred) return null
  return `${base}/${preferred.name}`
}

// Lightweight XML parser tailored for 13F infoTable
function parseInfoTableXml(xml: string): Holding[] {
  // Remove namespaces to simplify tag matching
  const noNs = xml.replace(/<\/?[a-zA-Z0-9_-]+:/g, m => m.replace(/^[^:]+:/, ''))
  // Split by infoTable blocks
  const blocks = noNs.split(/<infoTable[^>]*>/i).slice(1).map(b => b.split(/<\/infoTable>/i)[0])
  const getTag = (src: string, tag: string) => {
    const m = src.match(new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'i'))
    return m ? m[1].trim() : undefined
  }
  const getNum = (src: string, tag: string) => {
    const v = getTag(src, tag)
    const n = v ? Number(String(v).replace(/[,]/g, '')) : NaN
    return Number.isFinite(n) ? n : undefined
  }
  const getVote = (src: string, tag: string) => {
    const sect = getTag(src, 'votingAuthority') || ''
    const m = sect.match(new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'i'))
    const n = m ? Number(String(m[1]).replace(/[,]/g, '')) : NaN
    return Number.isFinite(n) ? n : undefined
  }
  const out: Holding[] = []
  for (const b of blocks) {
    const h: Holding = {
      nameOfIssuer: getTag(b, 'nameOfIssuer'),
      titleOfClass: getTag(b, 'titleOfClass'),
      cusip: getTag(b, 'cusip'),
      value: getNum(b, 'value'),
      sshPrnamt: getNum(b, 'sshPrnamt'),
      sshPrnamtType: getTag(b, 'sshPrnamtType'),
      putCall: getTag(b, 'putCall'),
      investmentDiscretion: getTag(b, 'investmentDiscretion'),
      votingAuthority: {
        Sole: getVote(b, 'Sole'),
        Shared: getVote(b, 'Shared'),
        None: getVote(b, 'None'),
      }
    }
    out.push(h)
  }
  return out
}

function toCsv(rows: Holding[]): string {
  const headers = ['Issuer','Class','CUSIP','Value(USD thousands)','Shares','ShareType','PutCall','Discretion','VoteSole','VoteShared','VoteNone']
  const lines = rows.map(r => [
    r.nameOfIssuer || '',
    r.titleOfClass || '',
    r.cusip || '',
    r.value ?? '',
    r.sshPrnamt ?? '',
    r.sshPrnamtType || '',
    r.putCall || '',
    r.investmentDiscretion || '',
    r.votingAuthority?.Sole ?? '',
    r.votingAuthority?.Shared ?? '',
    r.votingAuthority?.None ?? '',
  ].map(v => String(v).replace(/"/g,'""')).map(v => /[",\n]/.test(v) ? `"${v}"` : v).join(','))
  return [headers.join(','), ...lines].join('\n')
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req as unknown as Request)
  const rl = rateLimit(`13f:${ip}`, 40, 60_000)
  if (!rl.ok) {
    const res = NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    Object.entries(rateLimitHeaders(rl)).forEach(([k,v]) => res.headers.set(k, v))
    return res
  }

  const { searchParams } = new URL(req.url)
  const cikRaw = (searchParams.get('cik') || '').trim()
  const urlRaw = (searchParams.get('url') || '').trim()
  const asCsv = (searchParams.get('format') || '').toLowerCase() === 'csv'

  if (!cikRaw && !urlRaw) {
    const res = NextResponse.json({ error: 'Provide either cik=########## or url=https://www.sec.gov/Archives/... to a specific filing.' }, { status: 400 })
    Object.entries(rateLimitHeaders(rl)).forEach(([k,v]) => res.headers.set(k, v))
    return res
  }

  try {
    await ensureDir(SNAP_DIR)

    let cik10 = ''
    let accession = ''

    if (urlRaw) {
      // Try to extract cik and accession from the URL
      // Expected like: /Archives/edgar/data/{cik}/{accNoNoDash}/...
      const m = urlRaw.match(/\/edgar\/data\/(\d+)\/(\d{10}\d*)/i)
      if (m) {
        cik10 = padCik(m[1])
        accession = m[2]
      }
    }

    if (!cik10 && cikRaw) {
      cik10 = padCik(cikRaw)
    }

    if (!cik10) {
      const res = NextResponse.json({ error: 'Unable to resolve CIK from input' }, { status: 400 })
      Object.entries(rateLimitHeaders(rl)).forEach(([k,v]) => res.headers.set(k, v))
      return res
    }

    // If no accession provided, discover latest 13F
    let meta: FilingMeta | null = null
    if (!accession) {
      meta = await getLatest13F(cik10)
      if (!meta) throw new Error('No recent 13F filings found for this CIK')
      accession = meta.accessionNumber
    }

    const accNoDash = unDash(accession)
    const snapPath = path.join(SNAP_DIR, `${cik10}-${accNoDash}.json`)
    try {
      const cached = await fs.readFile(snapPath, 'utf8')
      const j = JSON.parse(cached)
      if (asCsv) {
        const csv = toCsv(j.holdings || [])
        const res = new NextResponse(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename=13f-${cik10}-${accNoDash}.csv` } })
        Object.entries(rateLimitHeaders(rl)).forEach(([k,v]) => res.headers.set(k, v))
        return res
      }
      const res = NextResponse.json({ ok: true, cached: true, ...j })
      Object.entries(rateLimitHeaders(rl)).forEach(([k,v]) => res.headers.set(k, v))
      res.headers.set('Cache-Control', 'public, max-age=300')
      return res
    } catch {}

    // Discover XML url via directory index
    const xmlUrl = await getInfoTableUrl(cik10, accession)
    if (!xmlUrl) throw new Error('Could not locate infoTable XML in filing directory')
    const xml = await fetchText(xmlUrl)
    const holdings = parseInfoTableXml(xml)
    const positions = holdings.length
    const totalValue = holdings.reduce((s, h) => s + (h.value || 0), 0)

    const out = {
      ok: true,
      filer: { cik: cik10 },
      filing: {
        accessionNumber: accession,
        reportCalendarOrQuarter: meta?.reportCalendarOrQuarter,
        filingDate: meta?.filingDate,
        acceptedDate: meta?.acceptedDate,
        infoTableUrl: xmlUrl,
      },
      totals: { positions, marketValueUsdThousands: totalValue },
      holdings,
      source: 'sec'
    }

    await fs.writeFile(snapPath, JSON.stringify(out), 'utf8').catch(()=>{})

    if (asCsv) {
      const csv = toCsv(holdings)
      const res = new NextResponse(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename=13f-${cik10}-${accNoDash}.csv` } })
      Object.entries(rateLimitHeaders(rl)).forEach(([k,v]) => res.headers.set(k, v))
      return res
    }

    const res = NextResponse.json(out)
    Object.entries(rateLimitHeaders(rl)).forEach(([k,v]) => res.headers.set(k, v))
    res.headers.set('Cache-Control', 'public, max-age=300')
    return res
  } catch (e: any) {
    console.error('13F API error:', e?.message || e)
    const res = NextResponse.json({ ok: false, error: 'Failed to fetch 13F data', detail: String(e?.message||e) }, { status: 500 })
    Object.entries(rateLimitHeaders(rl)).forEach(([k,v]) => res.headers.set(k, v))
    res.headers.set('Cache-Control', 'no-store')
    return res
  }
}
