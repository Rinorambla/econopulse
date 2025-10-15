// Extended multi-region, multi-asset symbol universe (subset starter)
// NOTE: Fetching all global symbols live is rate-limit heavy; we curate representative liquid names first.

export interface UniverseGroup { key:string; title:string; sector?:string; symbols:string[] }

export const US_MEGA_TECH: UniverseGroup = { key:'us_mega_tech', title:'US Mega Tech', symbols:['AAPL','MSFT','NVDA','AMZN','META','GOOGL','TSLA','AVGO','CRM','AMD','INTC','ORCL','ADBE'] }
export const US_FINANCIALS: UniverseGroup = { key:'us_financials', title:'US Financials', symbols:['JPM','BAC','WFC','GS','MS','C','BLK','SCHW','AXP','PYPL','V'] }
export const US_HEALTHCARE: UniverseGroup = { key:'us_healthcare', title:'US Healthcare', symbols:['UNH','JNJ','PFE','ABBV','MRK','LLY','TMO','ABT','BMY','AMGN'] }
export const US_CONSUMER: UniverseGroup = { key:'us_consumer', title:'US Consumer', symbols:['HD','MCD','NKE','SBUX','COST','KO','PEP','PG','PM','DIS'] }

export const EU_LARGECAP: UniverseGroup = { key:'eu_largecap', title:'Europe LargeCap', symbols:['ASML','SAP','SIE.DE','AIR.PA','OR.PA','RMS.PA','MC.PA','NESN.SW','NOVN.SW','AD.AS','BAS.DE','BAYN.DE'] }
export const UK_LARGECAP: UniverseGroup = { key:'uk_largecap', title:'UK LargeCap', symbols:['RIO.L','SHEL.L','BP.L','ULVR.L','AZN.L','HSBA.L','BATS.L','GSK.L','LSEG.L'] }
export const ASIA_LARGECAP: UniverseGroup = { key:'asia_largecap', title:'Asia LargeCap', symbols:['BHP.AX','CBA.AX','TCS.NS','INFY','TSM','TM','SONY','TCEHY','BABA'] }

export const SECTOR_ETFS_US: UniverseGroup = { key:'us_sector_etf', title:'US Sector ETFs', symbols:['XLB','XLE','XLF','XLI','XLK','XLP','XLRE','XLU','XLV','XLY','XLC','SMH','SOXX'] }
export const FACTOR_ETFS: UniverseGroup = { key:'factor_etf', title:'Factor / Style ETFs', symbols:['IWF','IWD','MTUM','QUAL','SIZE','VLUE','USMV'] }
export const BOND_ETFS: UniverseGroup = { key:'bond_etf', title:'Bond ETFs', symbols:['TLT','IEF','SHY','HYG','LQD','AGG','BND','TIP'] }
export const COMMODITY_ETFS: UniverseGroup = { key:'commodity_etf', title:'Commodity ETFs', symbols:['GLD','SLV','USO','UNG','DBC','CORN','WEAT','SOYB','URA','LIT'] }
export const CRYPTO_LIQUID: UniverseGroup = { key:'crypto', title:'Crypto', symbols:['BTC-USD','ETH-USD','SOL-USD','XRP-USD','ADA-USD','DOGE-USD','AVAX-USD','DOT-USD','LINK-USD'] }
export const FX_MAJORS_G: UniverseGroup = { key:'fx', title:'FX Majors', symbols:['EURUSD=X','GBPUSD=X','USDJPY=X','USDCHF=X','AUDUSD=X','NZDUSD=X','USDCAD=X','USDCNH=X','DX-Y.NYB'] }
export const RATES_PROXIES: UniverseGroup = { key:'rates', title:'Rates / Vol', symbols:['^IRX','^FVX','^TNX','^TYX','^VIX','^MOVE'] }
export const GLOBAL_INDICES: UniverseGroup = { key:'global_indices', title:'Global Indices', symbols:['^GSPC','^DJI','^NDX','^RUT','^FTSE','^GDAXI','^FCHI','^STOXX50E','^N225','^HSI','^SSEC'] }

export const DEFAULT_GROUPS: UniverseGroup[] = [
  GLOBAL_INDICES, RATES_PROXIES, FX_MAJORS_G, COMMODITY_ETFS, BOND_ETFS, SECTOR_ETFS_US,
  US_MEGA_TECH, US_FINANCIALS, US_HEALTHCARE, US_CONSUMER,
  EU_LARGECAP, UK_LARGECAP, ASIA_LARGECAP,
  FACTOR_ETFS, CRYPTO_LIQUID
]

export function allSymbols(groups: UniverseGroup[] = DEFAULT_GROUPS): string[] { return [...new Set(groups.flatMap(g=>g.symbols))] }
