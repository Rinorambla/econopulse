// Curated symbol universe for macro dashboard (Yahoo Finance compatible symbols)
// Extend as needed. Grouped for analysts coverage.

export interface SymbolGroup { title: string; symbols: string[] }

export const INDICES: SymbolGroup = {
  title: 'Indices',
  symbols: [
    '^GSPC','^DJI','^IXIC','^RUT','^NDX','^VIX','^VXN','^VXD','^N225','^HSI','^SSEC','^GDAXI','^FCHI','^FTSE','^STOXX50E','^BSESN','^BVSP','^MXX','^AXJO','^KS11','^TA125.TA'
  ]
}

export const SECTOR_ETFS: SymbolGroup = {
  title:'US Sector ETFs',
  symbols:['XLB','XLE','XLF','XLI','XLK','XLP','XLRE','XLU','XLV','XLY','XME','SMH']
}

export const COUNTRY_ETFS: SymbolGroup = {
  title:'Country ETFs',
  symbols:['EEM','EWZ','EWW','EWT','EWY','EWA','EWG','EWQ','EWL','EWS','EWH','EWU','EWI','INDA','RSX','FXI']
}

export const FX_MAJORS: SymbolGroup = {
  title:'FX Majors',
  symbols:['EURUSD=X','GBPUSD=X','USDJPY=X','AUDUSD=X','NZDUSD=X','USDCAD=X','USDCHF=X','USDCNH=X','DX-Y.NYB']
}

export const COMMODITIES: SymbolGroup = {
  title:'Commodities',
  symbols:['GC=F','SI=F','HG=F','CL=F','BZ=F','NG=F','ZW=F','ZC=F','ZS=F','KC=F','CT=F','LE=F','HE=F']
}

export const CRYPTO: SymbolGroup = {
  title:'Crypto',
  symbols:['BTC-USD','ETH-USD','SOL-USD','XRP-USD','ADA-USD','DOGE-USD','AVAX-USD','DOT-USD','LINK-USD']
}

export const MEGACAP_EQUITIES: SymbolGroup = {
  title:'MegaCap Tech',
  symbols:['AAPL','MSFT','NVDA','AMZN','META','GOOGL','TSLA','AVGO','NFLX','AMD']
}

// Bond yields proxies (percent) use indexes: ^TNX (10Y), ^IRX (13W), ^FVX (5Y), ^TYX (30Y), plus German bund futures placeholder symbols or country ETFs for sovereign risk
export const RATES: SymbolGroup = {
  title:'Rates / Yields',
  symbols:['^IRX','^FVX','^TNX','^TYX','^MOVE']
}

export const ALTERNATIVES: SymbolGroup = {
  title:'Alt Assets',
  symbols:['GLD','SLV','DBC','URA','LIT','WOOD','PAVE']
}

export const DEFAULT_UNIVERSE: SymbolGroup[] = [
  INDICES, SECTOR_ETFS, RATES, FX_MAJORS, COMMODITIES, CRYPTO, MEGACAP_EQUITIES, COUNTRY_ETFS, ALTERNATIVES
]

export function flattenUniverse(groups: SymbolGroup[] = DEFAULT_UNIVERSE): string[] {
  return [...new Set(groups.flatMap(g=>g.symbols))]
}
