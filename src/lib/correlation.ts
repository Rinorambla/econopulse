import { fetchMultipleHistory } from './yahoo-history'

export interface CorrelationMatrix { symbols: string[]; matrix: number[][] }

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 5) return 0
  const as = a.slice(-n)
  const bs = b.slice(-n)
  const ma = mean(as); const mb = mean(bs)
  let num=0, da=0, db=0
  for (let i=0;i<n;i++) { const x=as[i]-ma; const y=bs[i]-mb; num+=x*y; da+=x*x; db+=y*y }
  const denom = Math.sqrt(da*db)
  return denom===0?0:(num/denom)
}
function mean(arr:number[]):number { return arr.reduce((s,v)=>s+v,0)/arr.length }

export async function computeCorrelation(symbols: string[], range='3mo'): Promise<CorrelationMatrix> {
  const histories = await fetchMultipleHistory(symbols, range, '1d')
  const priceSeries: Record<string, number[]> = {}
  histories.forEach(h=> priceSeries[h.symbol] = h.bars.map(b=>b.close))
  const matrix: number[][] = []
  for (let i=0;i<symbols.length;i++) {
    matrix[i] = []
    for (let j=0;j<symbols.length;j++) {
      if (j<i) { matrix[i][j] = matrix[j][i] } else {
        matrix[i][j] = pearson(priceSeries[symbols[i]]||[], priceSeries[symbols[j]]||[])
      }
    }
  }
  return { symbols, matrix }
}
