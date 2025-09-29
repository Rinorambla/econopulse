// Centralized symbol universe definitions for Tiingo-powered dashboard
// NOTE: Keep lists de-duplicated; route logic will enforce limits and scope.

export const CORE_SYMBOLS: string[] = [
  'SPY','QQQ','IWM','DIA','VTI','VOO','VEA','VWO','EFA','EEM','ITOT','SPLG','SPDW','SPEM','SPTM',
  'XLK','XLF','XLE','XLI','XLV','XLY','XLP','XLB','XLU','XLRE','VGT','VFH','VDE','VIS','VHT','VCR','VDC','VAW','VPU','VNQ',
  'RSP','MTUM','QUAL','VLUE','USMV','SPLV','VYM','DVY','SCHD','IWF','IWD','MGK','MGV',
  'AGG','BND','TLT','SHY','IEF','TIP','LQD','HYG','EMB','VGIT','VGSH','VGLT','VTEB',
  'GLD','SLV','GDX','GDXJ','IAU','DBO','USO','UNG','PDBC','OIH','XME',
  'DBA','WEAT','CORN','SOYB','CPER','URA','LIT','TAN','ICLN','WOOD','PHO','XOP','XRT','XHB','SIL',
  'SOXX','SMH','CLOU','SKYY','HACK','CIBR','BOTZ','ROBO','ARKK','ARKW','XBI','IBB','ITA','XAR','KWEB','KRE','IHI','XPH',
  'IEFA','IEMG','IXUS','VXUS','FXI','EWJ','EWZ','RSX','INDA','MCHI','EWY','EWT','EWH','EWW','EZA','EWC','EWU','EWG','EWQ','EWI','EWL','EWS','EWK','EWD',
  'VUG','VTV','IVW','IVE','VBK','VBR','SPYG','SPYV',
  'AAPL','MSFT','GOOGL','AMZN','TSLA','NVDA','META','NFLX','JPM','BAC','V','MA','JNJ','PG','UNH','HD',
  'WMT','DIS','PFE','ABBV','ORCL','CRM','ADBE','INTC','AMD','CSCO','KO','PEP','NKE','MCD','COST','T','VZ','BA','GE','CAT','MS','GS','BK','BLK','SCHW','AVGO','ASML','SAP','BHP','RIO','SHEL'
];

export const EXTENDED_SYMBOLS: string[] = [
  'ABT','ACN','ADP','AIG','ALGN','AMAT','AMGN','ANET','BKNG','BMY','C','CMCSA','COP','CSX','DE','DUK','EL','ETN','EXC','F','FDX','GD','GM','HON','IBM','LMT','LOW','MAR','MMM','MO','MRK','NEE','NOW','PANW','PYPL','QCOM','SBUX','SO','SPGI','TGT','TXN','UPS','WFC','ZTS','ABNB','PLTR','SNOW','SHOP','UBER','LYFT','TSM','BABA','JD','NIO','TCEHY',
  'VIXY','UVXY','SVXY','BUG','FIVG','CLEAN','GRID','IDRV','PAVE','DRIV','FINX','XT','XTL','JO','SGG','NIB','CANE','GLDM','KRBN',
  'EPU','EIRL','EIS','ENZL','EPOL','ECH','EPI','SCHE','SCHF','SCHC','SCHH','IYR','REET','BIL','SHV','ZROZ','EDV','JNK','BKLN','SRLN'
];

// S&P 500 (approx) ticker list (static snapshot; update periodically)
// Source: Public index constituents. Some symbols may change due to corporate actions.
export const SP500_SYMBOLS: string[] = [
  // Mega/Large Cap Growth & Core
  'AAPL','MSFT','AMZN','NVDA','GOOGL','GOOG','META','BRK.B','LLY','TSLA','AVGO','JPM','UNH','JNJ','XOM','V','PG','MA','HD','MRK','ABBV','CVX','PEP','COST','KO','ADBE','ASML','CSCO','MCD','CRM','ACN','WMT','NFLX','ABT','LIN','AMD','DHR','DIS','INTC','WFC','TXN','VZ','TMO','NKE','PM','BMY','NEE','UNP','RTX','MS','QCOM','LOW','IBM','CAT','AMGN','GS','UPS','INTU','PLD','SCHW','SBUX','NOW','HON','GE','DE','ISRG','SPGI','MDT','AXP','ELV','ADP','MDLZ','AMAT','MU','SYK','BLK','LRCX','LMT','ADI','GILD','MMC','TJX','C','BA','MO','ZTS','REGN','COF','PANW','TGT','CB','PYPL','PGR','BK','SO','CI','FISV','APD','CL','USB','PFE','BDX','DUK','FDX','ITW','ETN','GM','MMM','SHW','NSC','AON','AIG','ICE','CSX','EW','DOW','F','EMR','HCA','FCX','MCO','MCK','ADSK','HUM','NOC','ORLY','ATVI','CMCSA','PSX','TRV','MRNA','KMB','AFL','AEP','KMI','CME','MPC','KR','PSA','GIS','KHC','LULU','FIS','ROP','DXCM','LUV','AZO','APH','TEL','CTAS','EXC','PAYX','OXY','MAR','CDNS','ORCL','VLO','ROST','HES','HLT','A','AAL','HPQ','SRE','DHI','WELL','TROW','COR','IDXX','PRU','OTIS','YUM','ALL','VICI','WMB','HIG','ED','EOG','MTCH','PCAR','CNC','DAL','K','FAST','MLM','LEN','WBD','RCL','VTR','STZ','ALGN','FTNT','KEYS','EQT','CPRT','ODFL','PPG','GWW','STT','ZBH','VRSK','IR','PEG','AVB','CLX','TSCO','HSY','ANSS','CHTR','TT','LYB','FANG','BKR','GLW','SWK','HAL','NUE','PXD','CF','DLR','ILMN','ARE','RMD','MKC','EXR','BALL','CEG','FLT','DG','EFX','SYY','KIM','DTE','CMS','VMC','TYL','OKE','TSN','SYF','AEE','OMC','ETSY','NTRS','PH','STE','WEC','VTRS','AKAM','HBAN','XYL','LVS','HOLX','BBY','IP','DRI','PPL','ALB','ZBRA','CDW','NRG','CINF','CTLT','CAG','HSIC','MOS','HWM','FE','CHD','RJF','LH','ESS','WAT','AES','KEY','LHX','FMC','APA','MRO','GEN','EXPD','INCY','PARA','MTB','ROL','DOV','FFIV','JBHT','BEN','CBOE','KMX','PKI','WHR','IEX','NVR','HST','PAYC','BIO','WYNN','EPAM','TECH','DRE','ANET','LW','NCLH','PKG','MAS'
];
