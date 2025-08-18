// Script per creare la mappatura corretta dei settori
const fs = require('fs');

// Leggi il file attuale
const content = fs.readFileSync('src/app/api/dashboard-data/route.ts', 'utf8');

// Nuova mappatura settori corretta
const newSectorMapping = `function getSectorForTicker(ticker: string): string {
  const sectors: { [key: string]: string } = {
    // === INDEX ETFs ===
    'SPY': 'Index', 'QQQ': 'Index', 'IWM': 'Index', 'DIA': 'Index', 'VTI': 'Index', 'VOO': 'Index',
    
    // === ETFs (General) ===
    'VEA': 'ETF', 'VWO': 'ETF', 'EFA': 'ETF', 'EEM': 'ETF', 'VTV': 'ETF', 'VUG': 'ETF', 'VHT': 'ETF',
    'XLF': 'ETF', 'XLE': 'ETF', 'XLI': 'ETF', 'XLK': 'ETF', 'XLP': 'ETF', 'XLU': 'ETF', 'XLV': 'ETF', 
    'XLB': 'ETF', 'XLY': 'ETF', 'XLRE': 'ETF', 'VDE': 'ETF', 'VDC': 'ETF', 'VIS': 'ETF', 'VGT': 'ETF', 
    'VNQ': 'ETF', 'VAW': 'ETF', 'VCR': 'ETF', 'VPU': 'ETF', 'VOX': 'ETF', 'IYR': 'ETF', 'IYE': 'ETF', 
    'IYF': 'ETF', 'IYH': 'ETF', 'IYT': 'ETF', 'FTEC': 'ETF', 'SOXX': 'ETF', 'SMH': 'ETF', 'ARKK': 'ETF', 
    'ARKQ': 'ETF', 'ARKG': 'ETF', 'ARKW': 'ETF', 'IEFA': 'ETF', 'IEMG': 'ETF', 'VGK': 'ETF', 'EWJ': 'ETF', 
    'EWZ': 'ETF', 'FXI': 'ETF', 'INDA': 'ETF', 'RSX': 'ETF', 'EWW': 'ETF', 'EWC': 'ETF', 'EWU': 'ETF',
    'IWF': 'ETF', 'IWD': 'ETF', 'IWN': 'ETF', 'IWO': 'ETF', 'VBK': 'ETF', 'VBR': 'ETF', 'MGK': 'ETF', 'MGV': 'ETF',
    
    // === BOND ETFs ===
    'AGG': 'Bond', 'BND': 'Bond', 'TLT': 'Bond', 'IEF': 'Bond', 'SHY': 'Bond', 'LQD': 'Bond', 'HYG': 'Bond', 
    'JNK': 'Bond', 'TIP': 'Bond', 'VTEB': 'Bond', 'VGIT': 'Bond', 'VGLT': 'Bond', 'VGSH': 'Bond', 
    'BIV': 'Bond', 'BSV': 'Bond',
    
    // === COMMODITIES ===
    'GLD': 'Commodities', 'SLV': 'Commodities', 'USO': 'Commodities', 'UNG': 'Commodities', 'DBA': 'Commodities', 
    'DBC': 'Commodities', 'PDBC': 'Commodities', 'CORN': 'Commodities', 'SOYB': 'Commodities', 'WEAT': 'Commodities',
    
    // === CURRENCY ===
    'UUP': 'Currency', 'FXE': 'Currency', 'FXY': 'Currency', 'FXB': 'Currency', 'FXA': 'Currency', 
    'FXC': 'Currency', 'UDN': 'Currency', 'DBV': 'Currency',
    
    // === CRYPTO ===
    'BITO': 'Crypto', 'RIOT': 'Crypto', 'MARA': 'Crypto', 'HUT': 'Crypto', 'BITF': 'Crypto', 
    'MSTR': 'Crypto', 'COIN': 'Crypto',
    
    // === TECHNOLOGY ===
    'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'GOOG': 'Technology', 'NVDA': 'Technology', 
    'TSLA': 'Technology', 'META': 'Technology', 'NFLX': 'Technology', 'ADBE': 'Technology', 'CRM': 'Technology', 
    'ORCL': 'Technology', 'IBM': 'Technology', 'INTC': 'Technology', 'AMD': 'Technology', 'QCOM': 'Technology', 
    'AVGO': 'Technology', 'TXN': 'Technology', 'MU': 'Technology', 'AMAT': 'Technology', 'LRCX': 'Technology', 
    'KLAC': 'Technology', 'MRVL': 'Technology', 'SNPS': 'Technology', 'CDNS': 'Technology', 'FTNT': 'Technology', 
    'PANW': 'Technology', 'CRWD': 'Technology', 'NOW': 'Technology', 'INTU': 'Technology', 'WDAY': 'Technology', 
    'VEEV': 'Technology', 'ZS': 'Technology', 'OKTA': 'Technology', 'SNOW': 'Technology', 'PLTR': 'Technology', 
    'DDOG': 'Technology', 'MDB': 'Technology', 'NET': 'Technology', 'TWLO': 'Technology', 'DOCU': 'Technology', 
    'ZOOM': 'Technology', 'SHOP': 'Technology', 'ROKU': 'Technology', 'SPOT': 'Technology', 'RBLX': 'Technology',
    'ADSK': 'Technology', 'ADI': 'Technology', 'AKAM': 'Technology', 'ANET': 'Technology', 'ANSS': 'Technology', 
    'APPN': 'Technology', 'ASML': 'Technology', 'BILL': 'Technology', 'BOX': 'Technology', 'CHKP': 'Technology', 
    'CIEN': 'Technology', 'CSCO': 'Technology', 'CTSH': 'Technology', 'CTXS': 'Technology', 'CYBR': 'Technology', 
    'DBX': 'Technology', 'DT': 'Technology', 'DXCM': 'Technology', 'FFIV': 'Technology', 'FICO': 'Technology', 
    'FIVN': 'Technology', 'FSLY': 'Technology', 'FTCH': 'Technology', 'GDS': 'Technology', 'GDDY': 'Technology', 
    'GLW': 'Technology', 'HPE': 'Technology', 'HPQ': 'Technology', 'HUBS': 'Technology', 'IDXX': 'Technology', 
    'ILMN': 'Technology', 'INFO': 'Technology', 'IPGP': 'Technology', 'IT': 'Technology', 'JKHY': 'Technology', 
    'KEYS': 'Technology', 'LOGI': 'Technology', 'LSCC': 'Technology', 'MCHP': 'Technology', 'MKSI': 'Technology', 
    'MLNX': 'Technology', 'MPWR': 'Technology', 'MXIM': 'Technology', 'NATI': 'Technology', 'NICE': 'Technology', 
    'NVMI': 'Technology', 'NXPI': 'Technology', 'ON': 'Technology', 'PAYC': 'Technology', 'PTC': 'Technology', 
    'QRVO': 'Technology', 'RNG': 'Technology', 'SAIL': 'Technology', 'SLAB': 'Technology', 'SPLK': 'Technology', 
    'SSYS': 'Technology', 'SWKS': 'Technology', 'TDC': 'Technology', 'TEAM': 'Technology', 'TRMB': 'Technology', 
    'TYL': 'Technology', 'UCTT': 'Technology', 'ULTI': 'Technology', 'VRSN': 'Technology', 'WDC': 'Technology', 
    'WORK': 'Technology', 'WU': 'Technology', 'XLNX': 'Technology', 'ZEN': 'Technology', 'ZUO': 'Technology', 
    'COUP': 'Technology', 'ESTC': 'Technology', 'GTLB': 'Technology', 'HCAT': 'Technology', 'JAMF': 'Technology', 
    'KNSL': 'Technology', 'LMND': 'Technology', 'MIME': 'Technology', 'NCNO': 'Technology', 'PTON': 'Technology', 
    'RVLV': 'Technology', 'SMAR': 'Technology', 'SPSC': 'Technology', 'SUMO': 'Technology', 'S': 'Technology', 
    'TENB': 'Technology', 'TWST': 'Technology', 'U': 'Technology', 'UPWK': 'Technology', 'ZI': 'Technology', 
    'AI': 'Technology', 'AMPL': 'Technology', 'PATH': 'Technology',
    
    // === FINANCIAL ===
    'JPM': 'Financial', 'BAC': 'Financial', 'WFC': 'Financial', 'GS': 'Financial', 'MS': 'Financial', 
    'C': 'Financial', 'USB': 'Financial', 'PNC': 'Financial', 'COF': 'Financial', 'AXP': 'Financial', 
    'V': 'Financial', 'MA': 'Financial', 'PYPL': 'Financial', 'SQ': 'Financial', 'FIS': 'Financial', 
    'FISV': 'Financial', 'BLK': 'Financial', 'SCHW': 'Financial', 'SPGI': 'Financial', 'ICE': 'Financial',
    'TFC': 'Financial', 'MTB': 'Financial', 'FITB': 'Financial', 'RF': 'Financial', 'KEY': 'Financial', 
    'HBAN': 'Financial', 'CMA': 'Financial', 'ZION': 'Financial', 'WBS': 'Financial', 'CFG': 'Financial', 
    'STI': 'Financial', 'ALLY': 'Financial', 'EWBC': 'Financial', 'PBCT': 'Financial', 'SNV': 'Financial', 
    'NTRS': 'Financial', 'BK': 'Financial', 'STT': 'Financial', 'CME': 'Financial', 'MCO': 'Financial', 
    'CB': 'Financial', 'AIG': 'Financial', 'PRU': 'Financial', 'MET': 'Financial', 'AFL': 'Financial', 
    'ALL': 'Financial', 'TRV': 'Financial', 'PGR': 'Financial', 'DFS': 'Financial', 'SYF': 'Financial', 
    'AMP': 'Financial', 'LNC': 'Financial', 'UNM': 'Financial', 'HIG': 'Financial', 'TMK': 'Financial', 
    'RGA': 'Financial', 'FNF': 'Financial', 'L': 'Financial', 'GL': 'Financial', 'RLI': 'Financial', 
    'AFG': 'Financial', 'Y': 'Financial', 'FLYW': 'Financial', 'GPN': 'Financial', 'WEX': 'Financial', 
    'EEFT': 'Financial', 'AFRM': 'Financial', 'UPST': 'Financial', 'LC': 'Financial', 'SOFI': 'Financial', 
    'HOOD': 'Financial', 'CBOE': 'Financial', 'NDAQ': 'Financial', 'MKTX': 'Financial', 'TROW': 'Financial', 
    'AMG': 'Financial', 'BRK-B': 'Financial', 'BRK-A': 'Financial',
    
    // === HEALTHCARE ===
    'ABBV': 'Healthcare', 'ABC': 'Healthcare', 'ABMD': 'Healthcare', 'AGIO': 'Healthcare', 'ALKS': 'Healthcare', 
    'ALNY': 'Healthcare', 'AMGN': 'Healthcare', 'ANTM': 'Healthcare', 'ARWR': 'Healthcare', 'ASMB': 'Healthcare', 
    'AZTA': 'Healthcare', 'BAX': 'Healthcare', 'BDX': 'Healthcare', 'BIIB': 'Healthcare', 'BMRN': 'Healthcare', 
    'BSX': 'Healthcare', 'CAH': 'Healthcare', 'CELG': 'Healthcare', 'CI': 'Healthcare', 'CNC': 'Healthcare', 
    'COO': 'Healthcare', 'CRISPR': 'Healthcare', 'CRL': 'Healthcare', 'CTLT': 'Healthcare', 'CVS': 'Healthcare', 
    'DEXCOM': 'Healthcare', 'DHR': 'Healthcare', 'DVA': 'Healthcare', 'EW': 'Healthcare', 'EXAS': 'Healthcare', 
    'FMS': 'Healthcare', 'GILD': 'Healthcare', 'HCA': 'Healthcare', 'HOLX': 'Healthcare', 'HUM': 'Healthcare', 
    'ICLR': 'Healthcare', 'INCY': 'Healthcare', 'IQV': 'Healthcare', 'ISRG': 'Healthcare', 'JNJ': 'Healthcare', 
    'LH': 'Healthcare', 'LLY': 'Healthcare', 'MCK': 'Healthcare', 'MDT': 'Healthcare', 'MRK': 'Healthcare', 
    'MRNA': 'Healthcare', 'MTD': 'Healthcare', 'NBIX': 'Healthcare', 'NVCR': 'Healthcare', 'PFE': 'Healthcare', 
    'PODD': 'Healthcare', 'REGN': 'Healthcare', 'RMD': 'Healthcare', 'SAGE': 'Healthcare', 'STE': 'Healthcare', 
    'SYK': 'Healthcare', 'TFX': 'Healthcare', 'THC': 'Healthcare', 'TMO': 'Healthcare', 'UHS': 'Healthcare', 
    'UNH': 'Healthcare', 'VAR': 'Healthcare', 'VRTX': 'Healthcare', 'WBA': 'Healthcare', 'XRAY': 'Healthcare', 
    'ZBH': 'Healthcare', 'ZTS': 'Healthcare', 'ACAD': 'Healthcare', 'ALXN': 'Healthcare', 'AMRN': 'Healthcare', 
    'BEAM': 'Healthcare', 'BLUE': 'Healthcare', 'CDNA': 'Healthcare', 'CRSP': 'Healthcare', 'EDIT': 'Healthcare', 
    'FATE': 'Healthcare', 'FOLD': 'Healthcare', 'HALO': 'Healthcare', 'IONS': 'Healthcare', 'MYGN': 'Healthcare', 
    'NTLA': 'Healthcare', 'NVTA': 'Healthcare', 'PTGX': 'Healthcare', 'RARE': 'Healthcare', 'SGMO': 'Healthcare', 
    'SRPT': 'Healthcare', 'VCYT': 'Healthcare',
    
    // === CONSUMER STAPLES ===
    'WMT': 'Consumer Staples', 'COST': 'Consumer Staples', 'PG': 'Consumer Staples', 'KO': 'Consumer Staples', 
    'PEP': 'Consumer Staples', 'CL': 'Consumer Staples', 'KMB': 'Consumer Staples', 'GIS': 'Consumer Staples', 
    'K': 'Consumer Staples', 'CPB': 'Consumer Staples', 'HSY': 'Consumer Staples', 'MDLZ': 'Consumer Staples', 
    'MNST': 'Consumer Staples', 'KHC': 'Consumer Staples', 'CAG': 'Consumer Staples', 'SJM': 'Consumer Staples', 
    'HRL': 'Consumer Staples', 'MKC': 'Consumer Staples', 'CLX': 'Consumer Staples', 'CHD': 'Consumer Staples', 
    'EL': 'Consumer Staples', 'TAP': 'Consumer Staples', 'STZ': 'Consumer Staples', 'BF.B': 'Consumer Staples', 
    'DEO': 'Consumer Staples', 'PM': 'Consumer Staples', 'MO': 'Consumer Staples', 'BTI': 'Consumer Staples', 
    'UVV': 'Consumer Staples', 'COTY': 'Consumer Staples', 'ELF': 'Consumer Staples', 'REV': 'Consumer Staples', 
    'IFF': 'Consumer Staples', 'FLO': 'Consumer Staples',
    
    // === CONSUMER DISCRETIONARY ===
    'AMZN': 'Consumer Discretionary', 'HD': 'Consumer Discretionary', 'LOW': 'Consumer Discretionary', 
    'TGT': 'Consumer Discretionary', 'TJX': 'Consumer Discretionary', 'ROST': 'Consumer Discretionary', 
    'KSS': 'Consumer Discretionary', 'M': 'Consumer Discretionary', 'JWN': 'Consumer Discretionary', 
    'GPS': 'Consumer Discretionary', 'ANF': 'Consumer Discretionary', 'AEO': 'Consumer Discretionary', 
    'URBN': 'Consumer Discretionary', 'LULU': 'Consumer Discretionary', 'NKE': 'Consumer Discretionary', 
    'DECK': 'Consumer Discretionary', 'CROX': 'Consumer Discretionary', 'SKX': 'Consumer Discretionary', 
    'EBAY': 'Consumer Discretionary', 'ETSY': 'Consumer Discretionary', 'W': 'Consumer Discretionary', 
    'WAYFAIR': 'Consumer Discretionary', 'CHWY': 'Consumer Discretionary', 'MCD': 'Consumer Discretionary', 
    'SBUX': 'Consumer Discretionary', 'CMG': 'Consumer Discretionary', 'QSR': 'Consumer Discretionary', 
    'YUM': 'Consumer Discretionary', 'DPZ': 'Consumer Discretionary', 'DNKN': 'Consumer Discretionary', 
    'DRI': 'Consumer Discretionary', 'EAT': 'Consumer Discretionary', 'TXRH': 'Consumer Discretionary', 
    'DIS': 'Consumer Discretionary', 'EA': 'Consumer Discretionary', 'ATVI': 'Consumer Discretionary', 
    'TTWO': 'Consumer Discretionary', 'ZNGA': 'Consumer Discretionary', 'F': 'Consumer Discretionary', 
    'GM': 'Consumer Discretionary', 'RIVN': 'Consumer Discretionary', 'LCID': 'Consumer Discretionary', 
    'NIO': 'Consumer Discretionary', 'XPEV': 'Consumer Discretionary', 'LI': 'Consumer Discretionary', 
    'UBER': 'Consumer Discretionary', 'LYFT': 'Consumer Discretionary', 'ABNB': 'Consumer Discretionary', 
    'BKNG': 'Consumer Discretionary', 'EXPE': 'Consumer Discretionary', 'TRIP': 'Consumer Discretionary', 
    'MAR': 'Consumer Discretionary', 'HLT': 'Consumer Discretionary', 'IHG': 'Consumer Discretionary', 
    'H': 'Consumer Discretionary', 'CCL': 'Consumer Discretionary', 'RCL': 'Consumer Discretionary',
    'BBY': 'Consumer Discretionary', 'ULTA': 'Consumer Discretionary', 'RH': 'Consumer Discretionary',
    
    // === ENERGY ===
    'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'EOG': 'Energy', 'SLB': 'Energy', 'HAL': 'Energy', 
    'BKR': 'Energy', 'OXY': 'Energy', 'PXD': 'Energy', 'FANG': 'Energy', 'DVN': 'Energy', 'MPC': 'Energy', 
    'VLO': 'Energy', 'PSX': 'Energy', 'HES': 'Energy', 'APA': 'Energy', 'CLR': 'Energy', 'CTRA': 'Energy', 
    'OVV': 'Energy', 'SM': 'Energy', 'KMI': 'Energy', 'EPD': 'Energy', 'ET': 'Energy', 'WMB': 'Energy', 
    'ENB': 'Energy', 'TRP': 'Energy', 'NEP': 'Energy', 'BEP': 'Energy', 'NOVA': 'Energy', 'FSLR': 'Energy', 
    'SPWR': 'Energy', 'ENPH': 'Energy', 'SEDG': 'Energy', 'RUN': 'Energy',
    'APC': 'Energy', 'AR': 'Energy', 'BHGE': 'Energy', 'BP': 'Energy', 'BPOM': 'Energy', 'CHK': 'Energy', 
    'CNX': 'Energy', 'CRC': 'Energy', 'CXO': 'Energy', 'DO': 'Energy', 'DNR': 'Energy', 'ECA': 'Energy', 
    'EQT': 'Energy', 'ESV': 'Energy', 'FTI': 'Energy', 'GPOR': 'Energy', 'HP': 'Energy', 'KOS': 'Energy', 
    'MTR': 'Energy', 'NBL': 'Energy', 'NFX': 'Energy', 'NOV': 'Energy', 'OAS': 'Energy', 'OIS': 'Energy', 
    'PE': 'Energy', 'QEP': 'Energy', 'RRC': 'Energy', 'SN': 'Energy', 'SWN': 'Energy', 'TOT': 'Energy', 
    'WLL': 'Energy', 'XEC': 'Energy', 'CSIQ': 'Energy', 'JKS': 'Energy', 'MAXN': 'Energy', 'PLUG': 'Energy', 
    'BLDP': 'Energy', 'FUV': 'Energy',
    
    // === UTILITIES ===
    'NEE': 'Utilities', 'DUK': 'Utilities', 'SO': 'Utilities', 'D': 'Utilities', 'EXC': 'Utilities', 
    'XEL': 'Utilities', 'ED': 'Utilities', 'PEG': 'Utilities', 'SRE': 'Utilities', 'PCG': 'Utilities', 
    'AEP': 'Utilities', 'AWK': 'Utilities', 'WEC': 'Utilities', 'ES': 'Utilities', 'DTE': 'Utilities', 
    'ETR': 'Utilities', 'FE': 'Utilities', 'CMS': 'Utilities', 'CNP': 'Utilities', 'NI': 'Utilities',
    
    // === INDUSTRIALS ===
    'BA': 'Industrials', 'CAT': 'Industrials', 'DE': 'Industrials', 'GE': 'Industrials', 'MMM': 'Industrials', 
    'HON': 'Industrials', 'UPS': 'Industrials', 'FDX': 'Industrials', 'LMT': 'Industrials', 'RTX': 'Industrials',
    
    // === MATERIALS ===
    'DOW': 'Materials', 'DD': 'Materials', 'LIN': 'Materials', 'APD': 'Materials', 'ECL': 'Materials', 
    'SHW': 'Materials', 'PPG': 'Materials', 'FCX': 'Materials', 'NEM': 'Materials', 'AA': 'Materials',
    
    // === COMMUNICATION SERVICES ===
    'CMCSA': 'Communication Services', 'VZ': 'Communication Services', 'T': 'Communication Services', 
    'TMUS': 'Communication Services', 'CHTR': 'Communication Services', 'DISH': 'Communication Services', 
    'TWTR': 'Communication Services', 'SNAP': 'Communication Services', 'PINS': 'Communication Services', 
    'MTCH': 'Communication Services', 'IAC': 'Communication Services',
    
    // === REAL ESTATE ===
    'AMT': 'Real Estate', 'PLD': 'Real Estate', 'CCI': 'Real Estate', 'EQIX': 'Real Estate', 'PSA': 'Real Estate', 
    'WELL': 'Real Estate', 'AVB': 'Real Estate', 'EQR': 'Real Estate', 'DLR': 'Real Estate', 'BXP': 'Real Estate',
    'SPG': 'Real Estate', 'EXR': 'Real Estate', 'ESS': 'Real Estate', 'VTR': 'Real Estate', 'O': 'Real Estate', 'REG': 'Real Estate',
  };
  
  return sectors[ticker] || 'Other';
}`;

// Trova e sostituisci la funzione getSectorForTicker
const startMarker = 'function getSectorForTicker(ticker: string): string {';
const endMarker = '  return sectors[ticker] || \'Other\';\n}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker) + endMarker.length;

if (startIndex === -1 || endIndex === -1) {
  console.error('❌ Non riesco a trovare la funzione getSectorForTicker');
  process.exit(1);
}

const newContent = content.substring(0, startIndex) + newSectorMapping + content.substring(endIndex);

// Scrivi il nuovo contenuto
fs.writeFileSync('src/app/api/dashboard-data/route.ts', newContent);

console.log('✅ Mappatura settori aggiornata!');
console.log('📊 Nuove categorie normalizzate:');
console.log('- Index, ETF, Bond, Commodities, Currency, Crypto');
console.log('- Technology, Financial, Healthcare'); 
console.log('- Consumer Staples, Consumer Discretionary');
console.log('- Energy, Utilities, Industrials, Materials');
console.log('- Communication Services, Real Estate');
