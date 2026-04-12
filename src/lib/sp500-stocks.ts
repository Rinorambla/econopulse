// ─── S&P 500 Complete Stock Universe (~503 stocks) ──────────────────
// Source: S&P 500 index constituents (updated April 2026)
// Organized by GICS Sector with approximate market-cap weights

export const SP500_SECTORS: Record<string, string[]> = {
  'Technology': [
    'AAPL','MSFT','NVDA','AVGO','ORCL','CRM','ADBE','CSCO','ACN','INTC','AMD','QCOM','TXN','NOW','INTU',
    'IBM','AMAT','MU','LRCX','KLAC','ADI','SNPS','PANW','FTNT','MSI','CDNS','FI','KEYS','CTSH',
    'NXPI','MPWR','ON','FSLR','MCHP','SWKS','TER','FFIV','EPAM','AKAM','PTC','ANSS','VRSN',
    'ZBRA','GEN','SEDG','JNPR','WDC','STX','HPE','HPQ','NTAP','ENPH','CTXS','PAYC','TRMB',
    'TYL','IT','BR','CDW','ROP','MANH','FICO','GDDY','TOST','CRWD','ABNB','TEAM','ZS','DDOG','SNOW','PLTR',
  ],
  'Healthcare': [
    'UNH','LLY','JNJ','ABBV','MRK','PFE','TMO','ABT','DHR','BMY','AMGN','GILD','ISRG','VRTX',
    'CI','CVS','SYK','BSX','MDT','MCK','HCA','ELV','REGN','BDX','ZTS','IDXX','DXCM','EW',
    'A','IQV','MTD','WAT','BAX','CRL','HOLX','RMD','ALGN','TECH','BIO','PKI','LH','DGX',
    'VTRS','INCY','MOH','HSIC','STE','TFX','XRAY','OGN','DVA','CTLT','WST','PODD','RVTY','GEHC',
  ],
  'Financial': [
    'BRK-B','JPM','V','MA','BAC','WFC','GS','MS','SPGI','BLK','AXP','PYPL','SCHW','CME','ICE',
    'CB','PGR','AON','MMC','COF','USB','PNC','TFC','AIG','MET','PRU','ALL','AFL','TRV','CINF',
    'AJG','FITB','HBAN','KEY','CFG','RF','NTRS','STT','BK','RJF','CBOE','MTB','FRC','SIVB',
    'WRB','GL','RE','ERIE','L','BEN','IVZ','TROW','FDS','MSCI','NDAQ','MKTX','MCO',
    'FISV','GPN','SYF','DFS','ALLY','ZION','CMA','EG','ACGL','JKHY',
  ],
  'Consumer Discretionary': [
    'AMZN','TSLA','HD','MCD','NKE','LOW','SBUX','TJX','BKNG','CMG','GM','F','ORLY','AZO','ROST',
    'MAR','HLT','YUM','LULU','EBAY','APTV','LEN','DHI','NVR','PHM','BWA','GRMN','POOL','BBY',
    'DRI','WYNN','LVS','MGM','CZR','RCL','CCL','NCLH','MHK','RL','PVH','TPR','HAS','WHR',
    'GPC','BBWI','DG','DLTR','TSCO','KMX','AAP','ETSY','ULTA','DECK','EXPE','LKQ','CASY','UBER',
  ],
  'Communication': [
    'GOOGL','META','NFLX','DIS','CMCSA','T','VZ','TMUS','CHTR','EA','TTWO','WBD',
    'OMC','IPG','PARA','LYV','FOXA','FOX','NWSA','NWS','MTCH','LUMN','GOOG',
  ],
  'Industrials': [
    'GE','CAT','UNP','HON','UPS','BA','RTX','DE','LMT','ETN','ITW','EMR','NOC','GD','CSX',
    'FDX','WM','NSC','PCAR','TT','IR','PH','ROK','FAST','CTAS','OTIS','AME','CARR','DOV',
    'SWK','GWW','XYL','J','NDSN','WAB','JBHT','CHRW','EXPD','CPRT','ODFL','DAL','UAL',
    'LUV','AAL','PWR','GNRC','TDG','HWM','HII','LHX','AXON','VRSK','RSG','IEX',
    'MAS','AOS','SNA','RHI','LDOS','BAH','HUBB','ALLE','EME','VLTO','GEV','BLDR','FTV',
  ],
  'Consumer Staples': [
    'PG','KO','PEP','COST','WMT','PM','MO','MDLZ','CL','KMB','TGT','SYY','STZ','KHC','GIS',
    'KR','HSY','SJM','HRL','MKC','CHD','CPB','CAG','TSN','K','BF-B','TAP','ADM','BG',
    'CLX','MNST','EL','WBA','KDP','KVUE','LW',
  ],
  'Energy': [
    'XOM','CVX','COP','SLB','EOG','MPC','PXD','VLO','PSX','OXY','HAL','DVN',
    'FANG','HES','BKR','TRGP','WMB','KMI','OKE','CTRA','MRO','APA','EQT',
    'DINO','PBF','CEG','TPL','SMCI',
  ],
  'Utilities': [
    'NEE','DUK','SO','D','AEP','SRE','EXC','XEL','WEC','ED','DTE','EIX','PEG','ES','CMS',
    'FE','AEE','PPL','CNP','NRG','ATO','EVRG','NI','PNW','AWK','LNT',
  ],
  'Real Estate': [
    'PLD','AMT','CCI','EQIX','PSA','SPG','O','DLR','WELL','AVB','VICI','ARE','MAA','UDR',
    'EXR','REG','ESS','CPT','KIM','BXP','SLG','VTR','HST','PEAK','INVH','IRM','WY',
    'CBRE','SBAC','FRT','EQR','GLPI','DOC','STAG','CUZ',
  ],
  'Materials': [
    'LIN','APD','SHW','FCX','NEM','ECL','DD','NUE','VMC','MLM','PPG','IP','PKG','CF',
    'CE','EMN','IFF','FMC','ALB','WRK','SEE','BLL','AVY','AMCR','MOS','RPM','CTVA','SMG','STLD','RS','LYB',
  ],
};

// All S&P 500 symbols flattened
export const SP500_ALL_SYMBOLS: string[] = Object.values(SP500_SECTORS).flat();

// Market-cap weighting tiers (approximate, determines cell size in treemap)
// Tier weights: mega=30-18, large=8-5, mid=4-3, standard=2, small=1
export const SP500_WEIGHTS: Record<string, number> = {
  // ── Mega Cap (>$1T) ──
  AAPL: 30, MSFT: 28, NVDA: 26, AMZN: 18, GOOGL: 18, META: 14, 'BRK-B': 9, TSLA: 10,
  // ── Very Large Cap ($300B–$1T) ──
  AVGO: 8, LLY: 8, UNH: 8, JPM: 7, V: 7, MA: 6, JNJ: 6, XOM: 6, HD: 6, PG: 5,
  MRK: 5, ABBV: 5, CVX: 5, KO: 5, PEP: 4, COST: 5, WMT: 5, NFLX: 5, ORCL: 5,
  // ── Large Cap ($100B–$300B) ──
  CRM: 4, ADBE: 4, CSCO: 4, ACN: 4, MCD: 4, ABT: 4, DHR: 4, TMO: 4, INTC: 3,
  AMD: 4, QCOM: 3, TXN: 3, NOW: 4, INTU: 4, IBM: 3, PM: 3, NEE: 3, GE: 3,
  CAT: 3, UNP: 3, HON: 3, LOW: 3, BA: 3, RTX: 3, LMT: 3, GS: 3, DE: 3,
  ISRG: 3, SPGI: 3, BLK: 3, MS: 3, WFC: 3, BAC: 4, PFE: 3,
  AMGN: 3, GILD: 2, REGN: 3, VRTX: 3, CI: 2, ELV: 2,
  // ── Mid-Large Cap ($50B–$100B) ──
  NKE: 3, UPS: 2, DIS: 2, CMCSA: 2, T: 2, VZ: 2, SBUX: 2, TJX: 2, BKNG: 3,
  PLD: 2, AMT: 2, COP: 3, SLB: 2, EOG: 2, AXP: 2, PYPL: 2, SCHW: 2, CME: 2,
  ICE: 2, CB: 2, PGR: 2, AON: 2, MMC: 2, ADP: 2, FI: 2, PANW: 2, FTNT: 2,
  AMAT: 2, MU: 2, LRCX: 2, KLAC: 2, ADI: 2, SNPS: 2, CDNS: 2, MDLZ: 2, CL: 2,
  SYK: 2, BSX: 2, MDT: 2, MCK: 2, HCA: 2, ETN: 2, ITW: 2, EMR: 2, NOC: 2,
  GD: 2, CSX: 2, FDX: 2, WM: 2, NSC: 2, LIN: 3, APD: 2, SHW: 2, FCX: 2,
  NEM: 2, CMG: 2, BMW: 1, TMUS: 2, SPG: 2, EQIX: 2,
  TT: 2, IR: 2, PH: 2, CARR: 2, OTIS: 2, CTAS: 2, FAST: 2, ROK: 1,
  // ── Standard ($20B–$50B) ──
  BDX: 2, ZTS: 2, IDXX: 2, DXCM: 2, EW: 2, IQV: 1, RMD: 1, ALGN: 1,
  KMB: 1, TGT: 2, SYY: 1, STZ: 1, KHC: 1, HSY: 1, GIS: 1, SJM: 1, KR: 1, MO: 2,
  MPC: 2, PXD: 1, VLO: 1, PSX: 1, OXY: 1, HAL: 1, DVN: 1, FANG: 2, HES: 2, BKR: 1,
  TRGP: 1, WMB: 1, KMI: 1, OKE: 1,
  DUK: 2, SO: 2, D: 2, AEP: 2, SRE: 2, EXC: 1, XEL: 1, WEC: 1, ED: 1,
  PSA: 1, O: 1, DLR: 1, WELL: 1, AVB: 1, VICI: 1, CCI: 2,
  ECL: 1, DD: 1, NUE: 1, VMC: 1, MLM: 1, PPG: 1,
  COF: 1, USB: 1, PNC: 1, TFC: 1, AIG: 1, MET: 1, PRU: 1, ALL: 1, AFL: 1, TRV: 1,
  GM: 1, F: 1, ORLY: 1, AZO: 1, ROST: 1, MAR: 1, HLT: 1, YUM: 1, LULU: 1, EBAY: 1,
  LEN: 1, DHI: 1, NVR: 1, PHM: 1,
  EA: 1, TTWO: 1, WBD: 1, CHTR: 2, PARA: 1,
  MSI: 1, FIS: 1, KEYS: 1, CTSH: 1, HPQ: 1,
  DAL: 1, UAL: 1, LUV: 1,
  // ── Small/Standard (all remaining ≤ $20B) — weight 1
};

// Sector display names for treemap
export const SECTOR_SHORT: Record<string, string> = {
  'Technology': 'TECHNOLOGY',
  'Healthcare': 'HEALTHCARE',
  'Financial': 'FINANCIAL',
  'Consumer Discretionary': 'CONSUMER CYCLICAL',
  'Communication': 'COMMUNICATION',
  'Industrials': 'INDUSTRIALS',
  'Consumer Staples': 'CONSUMER STAPLES',
  'Energy': 'ENERGY',
  'Utilities': 'UTILITIES',
  'Real Estate': 'REAL ESTATE',
  'Materials': 'BASIC MATERIALS',
};

// Get weight for a symbol (default 1 for unlisted)
export function getStockWeight(symbol: string): number {
  return SP500_WEIGHTS[symbol] || 1;
}
