// Script semplice per verificare i settori nel backend
const fs = require('fs');
const path = require('path');

// Leggi il file route.ts del backend
const routePath = path.join(__dirname, 'src', 'app', 'api', 'dashboard-data', 'route.ts');
const routeContent = fs.readFileSync(routePath, 'utf8');

// Estrai la funzione getSectorForTicker
const getSectorMatch = routeContent.match(/function getSectorForTicker\([\s\S]*?^}/m);
if (!getSectorMatch) {
  console.error('❌ Non riesco a trovare la funzione getSectorForTicker');
  process.exit(1);
}

// Estrai l'array TIINGO_SYMBOLS
const symbolsMatch = routeContent.match(/const TIINGO_SYMBOLS = \[([\s\S]*?)\];/);
if (!symbolsMatch) {
  console.error('❌ Non riesco a trovare l\'array TIINGO_SYMBOLS');
  process.exit(1);
}

// Estrai i simboli dall'array
const symbolsString = symbolsMatch[1];
const symbols = symbolsString
  .split(',')
  .map(s => s.trim().replace(/['"]/g, ''))
  .filter(s => s.length > 0);

console.log(`✅ Trovati ${symbols.length} simboli nel backend`);

// Crea una versione semplificata della funzione getSectorForTicker
function getSectorForTicker(ticker) {
  const sectorMapping = {
    // Technology
    'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'GOOG': 'Technology', 
    'NVDA': 'Technology', 'META': 'Technology', 'TSLA': 'Technology', 'NFLX': 'Technology',
    'CRM': 'Technology', 'ORCL': 'Technology', 'ADBE': 'Technology', 'AMD': 'Technology',
    'INTC': 'Technology', 'QCOM': 'Technology', 'AVGO': 'Technology', 'TXN': 'Technology',
    'INTU': 'Technology', 'CSCO': 'Technology', 'IBM': 'Technology', 'SNOW': 'Technology',
    'MU': 'Technology', 'ADI': 'Technology', 'AMAT': 'Technology', 'LRCX': 'Technology',
    'KLAC': 'Technology', 'MRVL': 'Technology', 'FTNT': 'Technology', 'PANW': 'Technology',
    'CRWD': 'Technology', 'ZS': 'Technology', 'OKTA': 'Technology', 'NET': 'Technology',
    'DDOG': 'Technology', 'ZM': 'Technology', 'TEAM': 'Technology', 'WDAY': 'Technology',
    'VEEV': 'Technology', 'SPLK': 'Technology', 'NOW': 'Technology', 'TWLO': 'Technology',
    'MDB': 'Technology', 'ESTC': 'Technology', 'DT': 'Technology', 'GTLB': 'Technology',
    'S': 'Technology', 'PATH': 'Technology', 'AI': 'Technology', 'PLTR': 'Technology',
    'U': 'Technology', 'RBLX': 'Technology', 'ROKU': 'Technology', 'SQ': 'Technology',
    'PYPL': 'Technology', 'SHOP': 'Technology', 'UBER': 'Technology', 'LYFT': 'Technology',
    'ABNB': 'Technology', 'DASH': 'Technology', 'PINS': 'Technology', 'SNAP': 'Technology',
    'TWTR': 'Technology', 'ZI': 'Technology', 'BILL': 'Technology', 'SMAR': 'Technology',
    'DOCN': 'Technology', 'FROG': 'Technology', 'APPN': 'Technology', 'SUMO': 'Technology',
    'DOCU': 'Technology', 'BOX': 'Technology', 'DBX': 'Technology', 'ZUO': 'Technology',
    'PD': 'Technology', 'WORK': 'Technology', 'ASANA': 'Technology', 'NOTION': 'Technology',
    'FIGMA': 'Technology', 'CANVA': 'Technology', 'ZOOM': 'Technology', 'TEAMS': 'Technology',
    'SLACK': 'Technology', 'DISCORD': 'Technology', 'TELEGRAM': 'Technology', 'WHATSAPP': 'Technology',
    'TWITTER': 'Technology', 'FACEBOOK': 'Technology', 'INSTAGRAM': 'Technology', 'YOUTUBE': 'Technology',
    'TIKTOK': 'Technology', 'LINKEDIN': 'Technology', 'REDDIT': 'Technology', 'PINTEREST': 'Technology',
    'SNAPCHAT': 'Technology', 'CLUBHOUSE': 'Technology', 'SIGNAL': 'Technology', 'VIBER': 'Technology',
    'SKYPE': 'Technology', 'MEET': 'Technology', 'WEBEX': 'Technology', 'GOTOMEETING': 'Technology',
    'JIRA': 'Technology', 'CONFLUENCE': 'Technology', 'GITLAB': 'Technology', 'GITHUB': 'Technology',
    'BITBUCKET': 'Technology', 'SOURCETREE': 'Technology', 'VISUAL': 'Technology', 'SUBLIME': 'Technology',
    'ATOM': 'Technology', 'ECLIPSE': 'Technology', 'INTELLIJ': 'Technology', 'PYCHARM': 'Technology',
    'WEBSTORM': 'Technology', 'ANDROID': 'Technology', 'STUDIO': 'Technology', 'XCODE': 'Technology',
    'UNITY': 'Technology', 'UNREAL': 'Technology', 'BLENDER': 'Technology', 'PHOTOSHOP': 'Technology',
    
    // Financial
    'JPM': 'Financial', 'BAC': 'Financial', 'WFC': 'Financial', 'C': 'Financial',
    'GS': 'Financial', 'MS': 'Financial', 'AXP': 'Financial', 'V': 'Financial',
    'MA': 'Financial', 'BRK.A': 'Financial', 'BRK.B': 'Financial', 'COF': 'Financial',
    'USB': 'Financial', 'PNC': 'Financial', 'TFC': 'Financial', 'BK': 'Financial',
    'STT': 'Financial', 'NTRS': 'Financial', 'RF': 'Financial', 'CFG': 'Financial',
    'KEY': 'Financial', 'ZION': 'Financial', 'FITB': 'Financial', 'HBAN': 'Financial',
    'CMA': 'Financial', 'MTB': 'Financial', 'SIVB': 'Financial', 'PACW': 'Financial',
    'WAL': 'Financial', 'EWBC': 'Financial', 'SBNY': 'Financial', 'CBSH': 'Financial',
    'ONB': 'Financial', 'UMBF': 'Financial', 'PB': 'Financial', 'OZK': 'Financial',
    'FFIN': 'Financial', 'BOKF': 'Financial', 'FHN': 'Financial', 'SNV': 'Financial',
    'BANC': 'Financial', 'FULT': 'Financial', 'WTFC': 'Financial', 'PBCT': 'Financial',
    'SSB': 'Financial', 'TCBI': 'Financial', 'COLB': 'Financial', 'WAFD': 'Financial',
    'CVBF': 'Financial', 'BANF': 'Financial', 'FIBK': 'Financial', 'TRMK': 'Financial',
    'HOPE': 'Financial', 'LION': 'Financial', 'WASH': 'Financial', 'NWBI': 'Financial',
    'EGBN': 'Financial', 'CHCO': 'Financial', 'BYFC': 'Financial', 'PFBC': 'Financial',
    'RBNC': 'Financial', 'RBCAA': 'Financial', 'HAFC': 'Financial', 'BRKL': 'Financial',
    'STBA': 'Financial', 'UVSP': 'Financial', 'CATY': 'Financial', 'PPBI': 'Financial',
    'SASR': 'Financial', 'EFSC': 'Financial', 'GLBZ': 'Financial', 'TFSL': 'Financial',
    'SFNC': 'Financial', 'GSBC': 'Financial', 'NECB': 'Financial', 'AMAL': 'Financial',
    
    // Healthcare
    'JNJ': 'Healthcare', 'UNH': 'Healthcare', 'PFE': 'Healthcare', 'ABBV': 'Healthcare',
    'TMO': 'Healthcare', 'DHR': 'Healthcare', 'MRK': 'Healthcare', 'BMY': 'Healthcare',
    'ABT': 'Healthcare', 'LLY': 'Healthcare', 'MDT': 'Healthcare', 'AMGN': 'Healthcare',
    'GILD': 'Healthcare', 'VRTX': 'Healthcare', 'REGN': 'Healthcare', 'BIIB': 'Healthcare',
    'ZTS': 'Healthcare', 'ILMN': 'Healthcare', 'MRNA': 'Healthcare', 'BNTX': 'Healthcare',
    
    // Consumer Staples
    'PG': 'Consumer Staples', 'KO': 'Consumer Staples', 'PEP': 'Consumer Staples', 'WMT': 'Consumer Staples',
    'COST': 'Consumer Staples', 'CL': 'Consumer Staples', 'KMB': 'Consumer Staples', 'GIS': 'Consumer Staples',
    'K': 'Consumer Staples', 'HSY': 'Consumer Staples', 'MKC': 'Consumer Staples', 'CLX': 'Consumer Staples',
    'CHD': 'Consumer Staples', 'KR': 'Consumer Staples', 'SYY': 'Consumer Staples', 'TSN': 'Consumer Staples',
    'POST': 'Consumer Staples', 'LANC': 'Consumer Staples', 'FRPT': 'Consumer Staples', 'TPG': 'Consumer Staples',
    'CALM': 'Consumer Staples', 'JJSF': 'Consumer Staples', 'CVGW': 'Consumer Staples', 'BGS': 'Consumer Staples',
    'SENEA': 'Consumer Staples', 'STKL': 'Consumer Staples', 'CHS': 'Consumer Staples', 'INGR': 'Consumer Staples',
    'SAM': 'Consumer Staples', 'DPZ': 'Consumer Staples', 'WBA': 'Consumer Staples', 'USFD': 'Consumer Staples',
    
    // Consumer Discretionary
    'AMZN': 'Consumer Discretionary', 'HD': 'Consumer Discretionary', 'MCD': 'Consumer Discretionary', 'NKE': 'Consumer Discretionary',
    'SBUX': 'Consumer Discretionary', 'LOW': 'Consumer Discretionary', 'TJX': 'Consumer Discretionary', 'BKNG': 'Consumer Discretionary',
    'DIS': 'Consumer Discretionary', 'CMG': 'Consumer Discretionary', 'LULU': 'Consumer Discretionary', 'RCL': 'Consumer Discretionary',
    
    // Energy
    'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'EOG': 'Energy',
    'SLB': 'Energy', 'PSX': 'Energy', 'VLO': 'Energy', 'MPC': 'Energy',
    'KMI': 'Energy', 'OKE': 'Energy', 'WMB': 'Energy', 'ENB': 'Energy',
    
    // Industrials
    'BA': 'Industrials', 'CAT': 'Industrials', 'GE': 'Industrials', 'MMM': 'Industrials',
    'HON': 'Industrials', 'UPS': 'Industrials', 'RTX': 'Industrials', 'LMT': 'Industrials',
    'DE': 'Industrials', 'UNP': 'Industrials', 'FDX': 'Industrials', 'CSX': 'Industrials',
    
    // Materials
    'LIN': 'Materials', 'APD': 'Materials', 'SHW': 'Materials', 'FCX': 'Materials',
    'NEM': 'Materials', 'DOW': 'Materials', 'DD': 'Materials', 'PPG': 'Materials',
    'ECL': 'Materials', 'FMC': 'Materials', 'LYB': 'Materials', 'CF': 'Materials',
    
    // Utilities
    'NEE': 'Utilities', 'DUK': 'Utilities', 'SO': 'Utilities', 'D': 'Utilities',
    'AEP': 'Utilities', 'EXC': 'Utilities', 'XEL': 'Utilities', 'SRE': 'Utilities',
    'PEG': 'Utilities', 'ES': 'Utilities', 'AWK': 'Utilities', 'ATO': 'Utilities',
    
    // Real Estate
    'AMT': 'Real Estate', 'PLD': 'Real Estate', 'CCI': 'Real Estate', 'EQIX': 'Real Estate',
    'SBAC': 'Real Estate', 'PSA': 'Real Estate', 'DLR': 'Real Estate', 'O': 'Real Estate',
    'WELL': 'Real Estate', 'EXR': 'Real Estate', 'AVB': 'Real Estate', 'EQR': 'Real Estate',
    
    // Communication Services
    'GOOGL': 'Communication Services', 'GOOG': 'Communication Services', 'META': 'Communication Services', 'NFLX': 'Communication Services',
    'DIS': 'Communication Services', 'CMCSA': 'Communication Services', 'VZ': 'Communication Services', 'T': 'Communication Services',
    'CHTR': 'Communication Services', 'TMUS': 'Communication Services', 'DISH': 'Communication Services', 'SIRI': 'Communication Services',
    
    // ETFs
    'SPY': 'ETF', 'QQQ': 'ETF', 'IWM': 'ETF', 'VTI': 'ETF',
    'VOO': 'ETF', 'VEA': 'ETF', 'VWO': 'ETF', 'BND': 'ETF',
    'TLT': 'ETF', 'GLD': 'ETF', 'SLV': 'ETF', 'DIA': 'ETF',
    'VNQ': 'ETF', 'XLF': 'ETF', 'XLK': 'ETF', 'XLE': 'ETF',
    'XLI': 'ETF', 'XLV': 'ETF', 'XLP': 'ETF', 'XLY': 'ETF',
    'XLU': 'ETF', 'XLB': 'ETF', 'XLRE': 'ETF', 'XLC': 'ETF',
    
    // Currency
    'UUP': 'Currency', 'FXE': 'Currency', 'FXY': 'Currency', 'FXB': 'Currency',
    'FXF': 'Currency', 'CYB': 'Currency', 'CEW': 'Currency', 'DBV': 'Currency',
    'UDN': 'Currency', 'EUO': 'Currency', 'YCS': 'Currency', 'BZF': 'Currency',
    
    // Crypto
    'BTC-USD': 'Crypto', 'ETH-USD': 'Crypto', 'ADA-USD': 'Crypto', 'DOT-USD': 'Crypto',
    'BNB-USD': 'Crypto', 'XRP-USD': 'Crypto', 'SOL-USD': 'Crypto', 'DOGE-USD': 'Crypto',
    'AVAX-USD': 'Crypto', 'MATIC-USD': 'Crypto', 'LINK-USD': 'Crypto', 'UNI-USD': 'Crypto',
    'GBTC': 'Crypto', 'ETHE': 'Crypto', 'BITO': 'Crypto', 'BITI': 'Crypto',
  };
  
  return sectorMapping[ticker] || 'Other';
}

// Conta i simboli per settore
const sectorCounts = {};
symbols.forEach(symbol => {
  const sector = getSectorForTicker(symbol);
  sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
});

console.log('\n📊 CONTEGGIO SETTORI NEL BACKEND:');
console.log('=====================================');
Object.entries(sectorCounts)
  .sort(([,a], [,b]) => b - a)
  .forEach(([sector, count]) => {
    console.log(`${sector}: ${count} simboli`);
  });

console.log('\n🔍 ESEMPI DI SIMBOLI PER SETTORE:');
console.log('===================================');
Object.keys(sectorCounts).forEach(sector => {
  const exampleSymbols = symbols
    .filter(symbol => getSectorForTicker(symbol) === sector)
    .slice(0, 5);
  console.log(`${sector}: ${exampleSymbols.join(', ')}${exampleSymbols.length < symbols.filter(s => getSectorForTicker(s) === sector).length ? '...' : ''}`);
});
