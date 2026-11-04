// Economic-data catalogue for the /market-data symbol search (TradingView
// "Economy" tab style). Every entry is a FRED-hosted series (FRED mirrors BEA,
// BLS, Federal Reserve Board, Freddie Mac, ICE BofA, U.S. Treasury, Census,
// OECD, ECB…), charted through /api/fred-history. `code` is the familiar
// TradingView-style economics ticker, `source` the publishing agency shown in
// the search results.
//
// Series ids: "<FRED_ID>" or "<FRED_ID>@PC1" (YoY % change) / "@PCH" (period %).

export type EconSeries = { symbol: string; code: string; name: string; source: string; country: string; group: string }

const S = (code: string, id: string, name: string, source: string, country = 'US', group = 'Economy'): EconSeries =>
  ({ symbol: `FRED:${id}`, code, name, source, country, group })

export const ECON_CATALOG: EconSeries[] = [
  // ── BEA (Bureau of Economic Analysis) ─────────────────────────────────────
  S('USGDP', 'GDPC1', 'Real GDP', 'BEA', 'US', 'GDP'),
  S('USGDPQQ', 'A191RL1Q225SBEA', 'GDP Growth Rate QoQ (SAAR)', 'BEA', 'US', 'GDP'),
  S('USGDPYY', 'GDPC1@PC1', 'GDP Growth YoY', 'BEA', 'US', 'GDP'),
  S('USNGDP', 'GDP', 'Nominal GDP', 'BEA', 'US', 'GDP'),
  S('USGDPDEF', 'GDPDEF', 'GDP Deflator', 'BEA', 'US', 'GDP'),
  S('USGDI', 'A261RX1Q020SBEA', 'Real Gross Domestic Income', 'BEA', 'US', 'GDP'),
  S('USPCE', 'PCE', 'Personal Consumption Expenditures', 'BEA', 'US', 'Consumer'),
  S('USPCEMM', 'PCE@PCH', 'Personal Spending MoM', 'BEA', 'US', 'Consumer'),
  S('USRPCE', 'PCEC96', 'Real Consumer Spending', 'BEA', 'US', 'Consumer'),
  S('USPCEPI', 'PCEPI', 'PCE Price Index', 'BEA', 'US', 'Inflation'),
  S('USPCEPIYY', 'PCEPI@PC1', 'PCE Inflation YoY', 'BEA', 'US', 'Inflation'),
  S('USPCEPIMM', 'PCEPI@PCH', 'PCE Price Index MoM', 'BEA', 'US', 'Inflation'),
  S('USCPCEPI', 'PCEPILFE', 'Core PCE Price Index', 'BEA', 'US', 'Inflation'),
  S('USCPCEPIYY', 'PCEPILFE@PC1', 'Core PCE Inflation YoY', 'BEA', 'US', 'Inflation'),
  S('USCPCEPIMM', 'PCEPILFE@PCH', 'Core PCE MoM', 'BEA', 'US', 'Inflation'),
  S('USPI', 'PI', 'Personal Income', 'BEA', 'US', 'Consumer'),
  S('USPIMM', 'PI@PCH', 'Personal Income MoM', 'BEA', 'US', 'Consumer'),
  S('USDPI', 'DSPIC96', 'Real Disposable Personal Income', 'BEA', 'US', 'Consumer'),
  S('USPSAVERT', 'PSAVERT', 'Personal Saving Rate', 'BEA', 'US', 'Consumer'),
  S('USCA', 'IEABC', 'Current Account Balance', 'BEA', 'US', 'Trade'),
  S('USBOT', 'BOPGSTB', 'Balance of Trade (Goods & Services)', 'BEA', 'US', 'Trade'),
  S('USEXP', 'BOPTEXP', 'Exports of Goods & Services', 'BEA', 'US', 'Trade'),
  S('USIMP', 'BOPTIMP', 'Imports of Goods & Services', 'BEA', 'US', 'Trade'),
  S('USCORPPROF', 'CP', 'Corporate Profits After Tax', 'BEA', 'US', 'Business'),
  S('USFIXINV', 'FPI', 'Private Fixed Investment', 'BEA', 'US', 'Business'),
  // ── BLS (Bureau of Labor Statistics) ──────────────────────────────────────
  S('USCPI', 'CPIAUCSL', 'CPI (All Urban Consumers)', 'BLS', 'US', 'Inflation'),
  S('USIRYY', 'CPIAUCSL@PC1', 'Inflation Rate YoY', 'BLS', 'US', 'Inflation'),
  S('USCPIMM', 'CPIAUCSL@PCH', 'Inflation Rate MoM', 'BLS', 'US', 'Inflation'),
  S('USCCPI', 'CPILFESL', 'Core CPI', 'BLS', 'US', 'Inflation'),
  S('USCIRYY', 'CPILFESL@PC1', 'Core Inflation Rate YoY', 'BLS', 'US', 'Inflation'),
  S('USCCPIMM', 'CPILFESL@PCH', 'Core CPI MoM', 'BLS', 'US', 'Inflation'),
  S('USFOODINF', 'CPIUFDSL@PC1', 'Food Inflation YoY', 'BLS', 'US', 'Inflation'),
  S('USENERGYINF', 'CPIENGSL@PC1', 'Energy Inflation YoY', 'BLS', 'US', 'Inflation'),
  S('USSHELTER', 'CUSR0000SAH1@PC1', 'Shelter Inflation YoY', 'BLS', 'US', 'Inflation'),
  S('USPPI', 'PPIFIS', 'PPI Final Demand', 'BLS', 'US', 'Inflation'),
  S('USPPIYY', 'PPIFIS@PC1', 'Producer Price Inflation YoY', 'BLS', 'US', 'Inflation'),
  S('USPPIMM', 'PPIFIS@PCH', 'PPI MoM', 'BLS', 'US', 'Inflation'),
  S('USCPPI', 'PPIFES', 'Core PPI (ex Food & Energy)', 'BLS', 'US', 'Inflation'),
  S('USCPPIYY', 'PPIFES@PC1', 'Core PPI YoY', 'BLS', 'US', 'Inflation'),
  S('USIMPPRC', 'IR@PC1', 'Import Prices YoY', 'BLS', 'US', 'Inflation'),
  S('USEXPPRC', 'IQ@PC1', 'Export Prices YoY', 'BLS', 'US', 'Inflation'),
  S('USUR', 'UNRATE', 'Unemployment Rate', 'BLS', 'US', 'Labour'),
  S('USU6', 'U6RATE', 'U-6 Unemployment Rate', 'BLS', 'US', 'Labour'),
  S('USNFP', 'PAYEMS', 'Nonfarm Payrolls (level)', 'BLS', 'US', 'Labour'),
  S('USNFPCHG', 'PAYEMS@CHG', 'Nonfarm Payrolls (monthly change)', 'BLS', 'US', 'Labour'),
  S('USPRIVNFP', 'USPRIV@CHG', 'Private Payrolls (monthly change)', 'BLS', 'US', 'Labour'),
  S('USMFGPAY', 'MANEMP@CHG', 'Manufacturing Payrolls (change)', 'BLS', 'US', 'Labour'),
  S('USGOVPAY', 'USGOVT@CHG', 'Government Payrolls (change)', 'BLS', 'US', 'Labour'),
  S('USAHE', 'CES0500000003', 'Average Hourly Earnings', 'BLS', 'US', 'Labour'),
  S('USAHEYY', 'CES0500000003@PC1', 'Average Hourly Earnings YoY', 'BLS', 'US', 'Labour'),
  S('USAHEMM', 'CES0500000003@PCH', 'Average Hourly Earnings MoM', 'BLS', 'US', 'Labour'),
  S('USAWH', 'AWHAETP', 'Average Weekly Hours', 'BLS', 'US', 'Labour'),
  S('USPART', 'CIVPART', 'Labor Force Participation Rate', 'BLS', 'US', 'Labour'),
  S('USEPOP', 'EMRATIO', 'Employment-Population Ratio', 'BLS', 'US', 'Labour'),
  S('USPTEMP', 'LNS12032194', 'Part-Time for Economic Reasons', 'BLS', 'US', 'Labour'),
  S('USJOLTS', 'JTSJOL', 'JOLTS Job Openings', 'BLS', 'US', 'Labour'),
  S('USJOLTSQ', 'JTSQUR', 'JOLTS Quits Rate', 'BLS', 'US', 'Labour'),
  S('USJOLTSH', 'JTSHIR', 'JOLTS Hires Rate', 'BLS', 'US', 'Labour'),
  S('USJOLTSL', 'JTSLDR', 'JOLTS Layoffs Rate', 'BLS', 'US', 'Labour'),
  S('USULC', 'ULCNFB@PCH', 'Unit Labor Costs QoQ', 'BLS', 'US', 'Labour'),
  S('USPROD', 'OPHNFB@PCH', 'Nonfarm Productivity QoQ', 'BLS', 'US', 'Labour'),
  S('USECI', 'ECIALLCIV@PCH', 'Employment Cost Index QoQ', 'BLS', 'US', 'Labour'),
  S('USREALAHE', 'LES1252881600Q', 'Real Median Weekly Earnings', 'BLS', 'US', 'Labour'),
  // ── DOL / ETA (weekly claims) ─────────────────────────────────────────────
  S('USIJC', 'ICSA', 'Initial Jobless Claims', 'DOL', 'US', 'Labour'),
  S('USIJC4W', 'IC4WSA', 'Initial Claims 4-Week Average', 'DOL', 'US', 'Labour'),
  S('USCJC', 'CCSA', 'Continuing Jobless Claims', 'DOL', 'US', 'Labour'),
  // ── Federal Reserve Board (FRB / H.15 / G.17 / H.8 / H.4.1 / G.19) ───────
  S('USINTR', 'FEDFUNDS', 'Fed Funds Rate (monthly)', 'FRB', 'US', 'Rates'),
  S('USDFF', 'DFF', 'Fed Funds Effective Rate (daily)', 'FRB', 'US', 'Rates'),
  S('USFFTARGU', 'DFEDTARU', 'Fed Funds Target Range — Upper', 'FRB', 'US', 'Rates'),
  S('USFFTARGL', 'DFEDTARL', 'Fed Funds Target Range — Lower', 'FRB', 'US', 'Rates'),
  S('USIORB', 'IORB', 'Interest on Reserve Balances', 'FRB', 'US', 'Rates'),
  S('USDISC', 'DPCREDIT', 'Discount Window Primary Credit Rate', 'FRB', 'US', 'Rates'),
  S('USPRIME', 'DPRIME', 'Bank Prime Loan Rate', 'FRB', 'US', 'Rates'),
  S('USSOFR', 'SOFR', 'SOFR', 'NY Fed', 'US', 'Rates'),
  S('USCBBS', 'WALCL', 'Fed Balance Sheet — Total Assets', 'FRB', 'US', 'Money'),
  S('USRESBAL', 'WRESBAL', 'Reserve Balances with Fed Banks', 'FRB', 'US', 'Money'),
  S('USTGA', 'WTREGEN', 'Treasury General Account', 'FRB', 'US', 'Money'),
  S('USRRP', 'RRPONTSYD', 'Overnight Reverse Repo', 'NY Fed', 'US', 'Money'),
  S('USM1', 'M1SL', 'Money Supply M1', 'FRB', 'US', 'Money'),
  S('USM2', 'M2SL', 'Money Supply M2', 'FRB', 'US', 'Money'),
  S('USM2YY', 'M2SL@PC1', 'M2 Growth YoY', 'FRB', 'US', 'Money'),
  S('USIP', 'INDPRO', 'Industrial Production Index', 'FRB', 'US', 'Business'),
  S('USIPMM', 'INDPRO@PCH', 'Industrial Production MoM', 'FRB', 'US', 'Business'),
  S('USIPYY', 'INDPRO@PC1', 'Industrial Production YoY', 'FRB', 'US', 'Business'),
  S('USMFGPROD', 'IPMAN@PCH', 'Manufacturing Production MoM', 'FRB', 'US', 'Business'),
  S('USCAPU', 'TCU', 'Capacity Utilization', 'FRB', 'US', 'Business'),
  S('USCCREDIT', 'TOTALSL', 'Total Consumer Credit', 'FRB', 'US', 'Credit'),
  S('USCCREDITCHG', 'TOTALSL@CHG', 'Consumer Credit Change (monthly)', 'FRB', 'US', 'Credit'),
  S('USREVOL', 'REVOLSL', 'Revolving Consumer Credit', 'FRB', 'US', 'Credit'),
  S('USBANKDEP', 'DPSACBW027SBOG', 'Bank Deposits (all commercial banks)', 'FRB', 'US', 'Credit'),
  S('USBANKLOANS', 'TOTLL', 'Bank Loans & Leases', 'FRB', 'US', 'Credit'),
  S('USCILOANS', 'BUSLOANS', 'Commercial & Industrial Loans', 'FRB', 'US', 'Credit'),
  S('USCCDELINQ', 'DRCCLACBS', 'Credit Card Delinquency Rate', 'FRB', 'US', 'Credit'),
  S('USMTGDELINQ', 'DRSFRMACBS', 'Mortgage Delinquency Rate', 'FRB', 'US', 'Credit'),
  S('USSLOOS', 'DRTSCILM', 'SLOOS: Banks Tightening C&I Standards', 'FRB', 'US', 'Credit'),
  S('USNFCI', 'NFCI', 'Chicago Fed Financial Conditions Index', 'Chicago Fed', 'US', 'Business'),
  S('USCFNAI', 'CFNAI', 'Chicago Fed National Activity Index', 'Chicago Fed', 'US', 'Business'),
  S('USGDPNOW', 'GDPNOW', 'GDPNow Nowcast', 'Atlanta Fed', 'US', 'GDP'),
  S('USSAHM', 'SAHMREALTIME', 'Sahm Rule Recession Indicator', 'St. Louis Fed', 'US', 'Labour'),
  S('USRECPROB', 'RECPROUSM156N', 'Recession Probability (smoothed)', 'St. Louis Fed', 'US', 'Business'),
  // ── U.S. Treasury (yields, curve, real yields, breakevens) ───────────────
  S('US01MY', 'DGS1MO', '1M Treasury Yield', 'US Treasury', 'US', 'Bonds'),
  S('US03MY', 'DGS3MO', '3M Treasury Yield', 'US Treasury', 'US', 'Bonds'),
  S('US06MY', 'DGS6MO', '6M Treasury Yield', 'US Treasury', 'US', 'Bonds'),
  S('US01Y', 'DGS1', '1Y Treasury Yield', 'US Treasury', 'US', 'Bonds'),
  S('US02Y', 'DGS2', '2Y Treasury Yield', 'US Treasury', 'US', 'Bonds'),
  S('US03Y', 'DGS3', '3Y Treasury Yield', 'US Treasury', 'US', 'Bonds'),
  S('US05Y', 'DGS5', '5Y Treasury Yield', 'US Treasury', 'US', 'Bonds'),
  S('US07Y', 'DGS7', '7Y Treasury Yield', 'US Treasury', 'US', 'Bonds'),
  S('US10Y', 'DGS10', '10Y Treasury Yield', 'US Treasury', 'US', 'Bonds'),
  S('US20Y', 'DGS20', '20Y Treasury Yield', 'US Treasury', 'US', 'Bonds'),
  S('US30Y', 'DGS30', '30Y Treasury Yield', 'US Treasury', 'US', 'Bonds'),
  S('US10Y2Y', 'T10Y2Y', '10Y–2Y Spread', 'US Treasury', 'US', 'Bonds'),
  S('US10Y3M', 'T10Y3M', '10Y–3M Spread', 'US Treasury', 'US', 'Bonds'),
  S('US05YTIPS', 'DFII5', '5Y Real Yield (TIPS)', 'US Treasury', 'US', 'Bonds'),
  S('US10YTIPS', 'DFII10', '10Y Real Yield (TIPS)', 'US Treasury', 'US', 'Bonds'),
  S('US30YTIPS', 'DFII30', '30Y Real Yield (TIPS)', 'US Treasury', 'US', 'Bonds'),
  S('US05YBE', 'T5YIE', '5Y Breakeven Inflation', 'US Treasury', 'US', 'Inflation'),
  S('US10YBE', 'T10YIE', '10Y Breakeven Inflation', 'US Treasury', 'US', 'Inflation'),
  S('US5Y5Y', 'T5YIFR', '5Y5Y Forward Inflation Expectation', 'US Treasury', 'US', 'Inflation'),
  S('USDEBT', 'GFDEBTN', 'Federal Debt: Total Public Debt', 'US Treasury', 'US', 'Government'),
  S('USDEBTGDP', 'GFDEGDQ188S', 'Federal Debt to GDP', 'US Treasury', 'US', 'Government'),
  S('USBUDGET', 'MTSDS133FMS', 'Federal Budget Surplus/Deficit (monthly)', 'US Treasury', 'US', 'Government'),
  S('USFEDREC', 'MTSR133FMS', 'Federal Receipts (monthly)', 'US Treasury', 'US', 'Government'),
  S('USFEDOUT', 'MTSO133FMS', 'Federal Outlays (monthly)', 'US Treasury', 'US', 'Government'),
  S('USINTPAY', 'A091RC1Q027SBEA', 'Federal Interest Payments', 'BEA', 'US', 'Government'),
  // ── Freddie Mac (PMMS) & housing (Census / HUD / NAR / FHFA / S&P) ───────
  S('USMORTG30', 'MORTGAGE30US', '30Y Fixed Mortgage Rate', 'Freddie Mac', 'US', 'Housing'),
  S('USMORTG15', 'MORTGAGE15US', '15Y Fixed Mortgage Rate', 'Freddie Mac', 'US', 'Housing'),
  S('USHOUST', 'HOUST', 'Housing Starts', 'Census', 'US', 'Housing'),
  S('USPERMIT', 'PERMIT', 'Building Permits', 'Census', 'US', 'Housing'),
  S('USHSN1F', 'HSN1F', 'New Home Sales', 'Census', 'US', 'Housing'),
  S('USEXHOSLUSM495S', 'EXHOSLUSM495S', 'Existing Home Sales', 'NAR', 'US', 'Housing'),
  S('USHOSINV', 'HOSINVUSM495N', 'Existing Home Inventory', 'NAR', 'US', 'Housing'),
  S('USMEDPRICE', 'MSPUS', 'Median Sales Price of Houses Sold', 'Census', 'US', 'Housing'),
  S('USCASESHILLER', 'CSUSHPINSA', 'Case-Shiller National Home Price Index', 'S&P', 'US', 'Housing'),
  S('USCASESHILLERYY', 'CSUSHPINSA@PC1', 'Case-Shiller Home Prices YoY', 'S&P', 'US', 'Housing'),
  S('USFHFA', 'HPIPONM226S', 'FHFA House Price Index', 'FHFA', 'US', 'Housing'),
  S('USCONSTR', 'TTLCONS', 'Construction Spending', 'Census', 'US', 'Housing'),
  S('USHOMEOWN', 'RHORUSQ156N', 'Homeownership Rate', 'Census', 'US', 'Housing'),
  S('USRENTVAC', 'RRVRUSQ156N', 'Rental Vacancy Rate', 'Census', 'US', 'Housing'),
  // ── Census (retail, orders, inventories, trade) ───────────────────────────
  S('USRSALES', 'RSAFS', 'Retail Sales (Advance)', 'Census', 'US', 'Consumer'),
  S('USRSMM', 'RSAFS@PCH', 'Retail Sales MoM', 'Census', 'US', 'Consumer'),
  S('USRSYY', 'RSAFS@PC1', 'Retail Sales YoY', 'Census', 'US', 'Consumer'),
  S('USRSXAUTO', 'RSFSXMV@PCH', 'Retail Sales ex Autos MoM', 'Census', 'US', 'Consumer'),
  S('USCONTROL', 'RSXFS@PCH', 'Retail Sales ex Food Services MoM', 'Census', 'US', 'Consumer'),
  S('USDGORD', 'DGORDER@PCH', 'Durable Goods Orders MoM', 'Census', 'US', 'Business'),
  S('USDGORDL', 'DGORDER', 'Durable Goods Orders (level)', 'Census', 'US', 'Business'),
  S('USCOREDG', 'ADXTNO@PCH', 'Durable Goods ex Transportation MoM', 'Census', 'US', 'Business'),
  S('USCAPGOODS', 'NEWORDER@PCH', 'Core Capital Goods Orders MoM', 'Census', 'US', 'Business'),
  S('USFACTORD', 'AMTMNO@PCH', 'Factory Orders MoM', 'Census', 'US', 'Business'),
  S('USBUSINV', 'BUSINV@PCH', 'Business Inventories MoM', 'Census', 'US', 'Business'),
  S('USWHOLINV', 'WHLSLRIMSA@PCH', 'Wholesale Inventories MoM', 'Census', 'US', 'Business'),
  S('USGOODSBOT', 'BOPGTB', 'Goods Trade Balance', 'Census', 'US', 'Trade'),
  S('USVEHSALES', 'TOTALSA', 'Total Vehicle Sales (SAAR)', 'BEA', 'US', 'Consumer'),
  S('USPOP', 'POPTHM', 'Population', 'Census', 'US', 'Demographics'),
  // ── Surveys (UMich, Conference Board via proxy, NFIB, regional Feds, ISM via DBN) ─
  S('USUMCSENT', 'UMCSENT', 'Michigan Consumer Sentiment', 'UMich', 'US', 'Sentiment'),
  S('USMICH1Y', 'MICH', 'Michigan 1-Year Inflation Expectations', 'UMich', 'US', 'Sentiment'),
  S('USEMPIRE', 'GACDISA066MSFRBNY', 'NY Empire State Manufacturing Index', 'NY Fed', 'US', 'Sentiment'),
  S('USPHILLY', 'GACDFSA066MSFRBPHI', 'Philadelphia Fed Manufacturing Index', 'Philadelphia Fed', 'US', 'Sentiment'),
  S('USDALLAS', 'BACTSAMFRBDAL', 'Dallas Fed Manufacturing Index', 'Dallas Fed', 'US', 'Sentiment'),
  S('USKANSAS', 'KCFSI', 'Kansas City Fed Financial Stress Index', 'Kansas City Fed', 'US', 'Sentiment'),
  S('USEPU', 'USEPUINDXD', 'Economic Policy Uncertainty Index', 'policyuncertainty.com', 'US', 'Sentiment'),
  // ── ICE BofA (credit spreads & indices) ───────────────────────────────────
  S('USHYOAS', 'BAMLH0A0HYM2', 'ICE BofA US High Yield OAS', 'ICE BofA', 'US', 'Credit'),
  S('USHYYIELD', 'BAMLH0A0HYM2EY', 'ICE BofA US High Yield Effective Yield', 'ICE BofA', 'US', 'Credit'),
  S('USIGOAS', 'BAMLC0A0CM', 'ICE BofA US Corporate (IG) OAS', 'ICE BofA', 'US', 'Credit'),
  S('USIGYIELD', 'BAMLC0A0CMEY', 'ICE BofA US Corporate Effective Yield', 'ICE BofA', 'US', 'Credit'),
  S('USAAAOAS', 'BAMLC0A1CAAA', 'ICE BofA AAA Corporate OAS', 'ICE BofA', 'US', 'Credit'),
  S('USBBBOAS', 'BAMLC0A4CBBB', 'ICE BofA BBB Corporate OAS', 'ICE BofA', 'US', 'Credit'),
  S('USBBOAS', 'BAMLH0A1HYBB', 'ICE BofA BB High Yield OAS', 'ICE BofA', 'US', 'Credit'),
  S('USCCCOAS', 'BAMLH0A3HYC', 'ICE BofA CCC & Lower OAS', 'ICE BofA', 'US', 'Credit'),
  S('EMHYOAS', 'BAMLEMHBHYCRPIOAS', 'ICE BofA EM High Yield OAS', 'ICE BofA', 'EM', 'Credit'),
  S('EUHYOAS', 'BAMLHE00EHYIOAS', 'ICE BofA Euro High Yield OAS', 'ICE BofA', 'EU', 'Credit'),
  S('USMOVE', 'VIXCLS', 'CBOE VIX (close)', 'CBOE', 'US', 'Markets'),
  // ── Commodities & FX reference (FRED-hosted) ─────────────────────────────
  S('WTIOIL', 'DCOILWTICO', 'WTI Crude Oil Spot', 'EIA', 'US', 'Commodities'),
  S('BRENTOIL', 'DCOILBRENTEU', 'Brent Crude Oil Spot', 'EIA', 'EU', 'Commodities'),
  S('USGASOLINE', 'GASREGW', 'US Regular Gasoline Price', 'EIA', 'US', 'Commodities'),
  S('USNATGAS', 'DHHNGSP', 'Henry Hub Natural Gas Spot', 'EIA', 'US', 'Commodities'),
  S('DXYBROAD', 'DTWEXBGS', 'Trade-Weighted Dollar Index (Broad)', 'FRB', 'US', 'Markets'),
  S('EURUSDFRED', 'DEXUSEU', 'EUR/USD (noon buying rate)', 'FRB', 'US', 'Markets'),
  S('USDJPYFRED', 'DEXJPUS', 'USD/JPY (noon buying rate)', 'FRB', 'US', 'Markets'),
  S('USDCNYFRED', 'DEXCHUS', 'USD/CNY (noon buying rate)', 'FRB', 'US', 'Markets'),
  // ── Euro Area / ECB / Eurostat ────────────────────────────────────────────
  S('EUINTR', 'ECBDFR', 'ECB Deposit Facility Rate', 'ECB', 'EU', 'Rates'),
  S('EUREFI', 'ECBMRRFR', 'ECB Main Refinancing Rate', 'ECB', 'EU', 'Rates'),
  S('EUIRYY', 'CP0000EZ19M086NEST@PC1', 'Euro Area HICP Inflation YoY', 'Eurostat', 'EU', 'Inflation'),
  S('EUGDP', 'CLVMNACSCAB1GQEA19', 'Euro Area Real GDP', 'Eurostat', 'EU', 'GDP'),
  S('EUGDPQQ', 'CLVMNACSCAB1GQEA19@PCH', 'Euro Area GDP Growth QoQ', 'Eurostat', 'EU', 'GDP'),
  S('EUCBBS', 'ECBASSETSW', 'ECB Balance Sheet — Total Assets', 'ECB', 'EU', 'Money'),
  S('EU10Y', 'IRLTLT01EZM156N', 'Euro Area 10Y Govt Bond Yield', 'OECD', 'EU', 'Bonds'),
  // ── Germany ───────────────────────────────────────────────────────────────
  S('DEIRYY', 'CP0000DEM086NEST@PC1', 'Germany HICP Inflation YoY', 'Eurostat', 'DE', 'Inflation'),
  S('DEUR', 'LRHUTTTTDEM156S', 'Germany Unemployment Rate', 'OECD', 'DE', 'Labour'),
  S('DEGDP', 'CLVMNACSCAB1GQDE', 'Germany Real GDP', 'Eurostat', 'DE', 'GDP'),
  S('DEGDPQQ', 'CLVMNACSCAB1GQDE@PCH', 'Germany GDP Growth QoQ', 'Eurostat', 'DE', 'GDP'),
  S('DE10Y', 'IRLTLT01DEM156N', 'Germany 10Y Bund Yield', 'OECD', 'DE', 'Bonds'),
  // ── Italy ─────────────────────────────────────────────────────────────────
  S('ITIRYY', 'CP0000ITM086NEST@PC1', 'Italy HICP Inflation YoY', 'Eurostat', 'IT', 'Inflation'),
  S('ITUR', 'LRHUTTTTITM156S', 'Italy Unemployment Rate', 'OECD', 'IT', 'Labour'),
  S('ITGDP', 'CLVMNACSCAB1GQIT', 'Italy Real GDP', 'Eurostat', 'IT', 'GDP'),
  S('ITGDPQQ', 'CLVMNACSCAB1GQIT@PCH', 'Italy GDP Growth QoQ', 'Eurostat', 'IT', 'GDP'),
  S('IT10Y', 'IRLTLT01ITM156N', 'Italy 10Y BTP Yield', 'OECD', 'IT', 'Bonds'),
  S('ITDEBTGDP', 'GGGDTAITA188N', 'Italy Government Debt to GDP', 'IMF', 'IT', 'Government'),
  // ── France / Spain ────────────────────────────────────────────────────────
  S('FRIRYY', 'CP0000FRM086NEST@PC1', 'France HICP Inflation YoY', 'Eurostat', 'FR', 'Inflation'),
  S('FRUR', 'LRHUTTTTFRM156S', 'France Unemployment Rate', 'OECD', 'FR', 'Labour'),
  S('FRGDP', 'CLVMNACSCAB1GQFR', 'France Real GDP', 'Eurostat', 'FR', 'GDP'),
  S('FR10Y', 'IRLTLT01FRM156N', 'France 10Y OAT Yield', 'OECD', 'FR', 'Bonds'),
  S('ESIRYY', 'CP0000ESM086NEST@PC1', 'Spain HICP Inflation YoY', 'Eurostat', 'ES', 'Inflation'),
  S('ESUR', 'LRHUTTTTESM156S', 'Spain Unemployment Rate', 'OECD', 'ES', 'Labour'),
  S('ESGDP', 'CLVMNACSCAB1GQES', 'Spain Real GDP', 'Eurostat', 'ES', 'GDP'),
  S('ES10Y', 'IRLTLT01ESM156N', 'Spain 10Y Bono Yield', 'OECD', 'ES', 'Bonds'),
  // ── United Kingdom ────────────────────────────────────────────────────────
  S('GBINTR', 'IUDSOIA', 'UK SONIA Rate', 'BoE', 'GB', 'Rates'),
  S('GBIRYY', 'GBRCPIALLMINMEI@PC1', 'UK CPI Inflation YoY', 'OECD', 'GB', 'Inflation'),
  S('GBUR', 'LRHUTTTTGBM156S', 'UK Unemployment Rate', 'OECD', 'GB', 'Labour'),
  S('GB10Y', 'IRLTLT01GBM156N', 'UK 10Y Gilt Yield', 'OECD', 'GB', 'Bonds'),
  // ── Japan ─────────────────────────────────────────────────────────────────
  S('JPINTR', 'IRSTCI01JPM156N', 'Japan Short-Term Interest Rate', 'OECD', 'JP', 'Rates'),
  S('JPUR', 'LRHUTTTTJPM156S', 'Japan Unemployment Rate', 'OECD', 'JP', 'Labour'),
  S('JPGDP', 'JPNRGDPEXP', 'Japan Real GDP', 'Cabinet Office', 'JP', 'GDP'),
  S('JP10Y', 'IRLTLT01JPM156N', 'Japan 10Y JGB Yield', 'OECD', 'JP', 'Bonds'),
  S('JPCBBS', 'JPNASSETS', 'Bank of Japan Total Assets', 'BoJ', 'JP', 'Money'),
  // ── China ─────────────────────────────────────────────────────────────────
  S('CNIRYY', 'CHNCPIALLMINMEI@PC1', 'China CPI Inflation YoY', 'OECD', 'CN', 'Inflation'),
  // ── Canada / Australia / Switzerland / others ─────────────────────────────
  S('CAINTR', 'IRSTCI01CAM156N', 'Canada Short-Term Interest Rate', 'OECD', 'CA', 'Rates'),
  S('CAIRYY', 'CANCPIALLMINMEI@PC1', 'Canada CPI Inflation YoY', 'OECD', 'CA', 'Inflation'),
  S('CAUR', 'LRUNTTTTCAM156S', 'Canada Unemployment Rate', 'OECD', 'CA', 'Labour'),
  S('CA10Y', 'IRLTLT01CAM156N', 'Canada 10Y Govt Bond Yield', 'OECD', 'CA', 'Bonds'),
  S('AUINTR', 'IRSTCI01AUM156N', 'Australia Short-Term Interest Rate', 'OECD', 'AU', 'Rates'),
  S('AUIRYY', 'AUSCPIALLQINMEI@PC1', 'Australia CPI Inflation YoY', 'OECD', 'AU', 'Inflation'),
  S('AUUR', 'LRHUTTTTAUM156S', 'Australia Unemployment Rate', 'OECD', 'AU', 'Labour'),
  S('AU10Y', 'IRLTLT01AUM156N', 'Australia 10Y Govt Bond Yield', 'OECD', 'AU', 'Bonds'),
  S('CHINTR', 'IR3TIB01CHM156N', 'Switzerland 3M Interbank Rate', 'OECD', 'CH', 'Rates'),
  S('CHIRYY', 'CHECPIALLMINMEI@PC1', 'Switzerland CPI Inflation YoY', 'OECD', 'CH', 'Inflation'),
  S('CH10Y', 'IRLTLT01CHM156N', 'Switzerland 10Y Govt Bond Yield', 'OECD', 'CH', 'Bonds'),
  S('KR10Y', 'IRLTLT01KRM156N', 'South Korea 10Y Govt Bond Yield', 'OECD', 'KR', 'Bonds'),
  S('MXIRYY', 'MEXCPIALLMINMEI@PC1', 'Mexico CPI Inflation YoY', 'OECD', 'MX', 'Inflation'),
  S('MX10Y', 'IRLTLT01MXM156N', 'Mexico 10Y Govt Bond Yield', 'OECD', 'MX', 'Bonds'),
  S('BRIRYY', 'BRACPIALLMINMEI@PC1', 'Brazil CPI Inflation YoY', 'OECD', 'BR', 'Inflation'),
  S('INIRYY', 'INDCPIALLMINMEI@PC1', 'India CPI Inflation YoY', 'OECD', 'IN', 'Inflation'),
  // World 10Y government bonds (OECD)
  S('PT10Y', 'IRLTLT01PTM156N', 'Portugal 10Y Govt Bond Yield', 'OECD', 'PT', 'Bonds'),
  S('GR10Y', 'IRLTLT01GRM156N', 'Greece 10Y Govt Bond Yield', 'OECD', 'GR', 'Bonds'),
  S('IE10Y', 'IRLTLT01IEM156N', 'Ireland 10Y Govt Bond Yield', 'OECD', 'IE', 'Bonds'),
  S('NL10Y', 'IRLTLT01NLM156N', 'Netherlands 10Y Govt Bond Yield', 'OECD', 'NL', 'Bonds'),
  S('BE10Y', 'IRLTLT01BEM156N', 'Belgium 10Y Govt Bond Yield', 'OECD', 'BE', 'Bonds'),
  S('AT10Y', 'IRLTLT01ATM156N', 'Austria 10Y Govt Bond Yield', 'OECD', 'AT', 'Bonds'),
  S('NZ10Y', 'IRLTLT01NZM156N', 'New Zealand 10Y Govt Bond Yield', 'OECD', 'NZ', 'Bonds'),
  S('SE10Y', 'IRLTLT01SEM156N', 'Sweden 10Y Govt Bond Yield', 'OECD', 'SE', 'Bonds'),
  S('NO10Y', 'IRLTLT01NOM156N', 'Norway 10Y Govt Bond Yield', 'OECD', 'NO', 'Bonds'),
  S('DK10Y', 'IRLTLT01DKM156N', 'Denmark 10Y Govt Bond Yield', 'OECD', 'DK', 'Bonds'),
  S('FI10Y', 'IRLTLT01FIM156N', 'Finland 10Y Govt Bond Yield', 'OECD', 'FI', 'Bonds'),
  S('PL10Y', 'IRLTLT01PLM156N', 'Poland 10Y Govt Bond Yield', 'OECD', 'PL', 'Bonds'),
]

// ISM diffusion indexes are not on FRED — served through DBnomics.
export const ECON_DBN: EconSeries[] = [
  { symbol: 'DBN:ISM/pmi/pm', code: 'USBCOI', name: 'ISM Manufacturing PMI', source: 'ISM', country: 'US', group: 'Sentiment' },
  { symbol: 'DBN:ISM/nm-pmi/pm', code: 'USNMI', name: 'ISM Services PMI', source: 'ISM', country: 'US', group: 'Sentiment' },
]

export const ECON_ALL: EconSeries[] = [...ECON_CATALOG, ...ECON_DBN]
export const ECON_BY_SYMBOL = new Map(ECON_ALL.map((e) => [e.symbol.toUpperCase(), e]))
export const ECON_BY_CODE = new Map(ECON_ALL.map((e) => [e.code.toUpperCase(), e]))

const COUNTRY_NAME: Record<string, string> = {
  US: 'United States', EU: 'Euro Area', DE: 'Germany', IT: 'Italy', FR: 'France', ES: 'Spain', GB: 'United Kingdom',
  JP: 'Japan', CN: 'China', CA: 'Canada', AU: 'Australia', CH: 'Switzerland', KR: 'South Korea', MX: 'Mexico', BR: 'Brazil',
  IN: 'India', PT: 'Portugal', GR: 'Greece', IE: 'Ireland', NL: 'Netherlands', BE: 'Belgium', AT: 'Austria', NZ: 'New Zealand',
  SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland', EM: 'Emerging Markets',
}
export const econCountryName = (c: string) => COUNTRY_NAME[c] || c

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const ALIAS: Record<string, string[]> = {
  bea: ['BEA'], bls: ['BLS'], frb: ['FRB'], fed: ['FRB', 'NY Fed', 'Atlanta Fed', 'Chicago Fed', 'St. Louis Fed'], fred: ['*'],
  ice: ['ICE BofA'], bofa: ['ICE BofA'], freddie: ['Freddie Mac'], 'freddie mac': ['Freddie Mac'], treasury: ['US Treasury'],
  census: ['Census'], eia: ['EIA'], ecb: ['ECB'], eurostat: ['Eurostat'], oecd: ['OECD'], boe: ['BoE'], boj: ['BoJ'], ism: ['ISM'],
  umich: ['UMich'], michigan: ['UMich'], nar: ['NAR'], fhfa: ['FHFA'],
}

// Free-text search over the economic catalogue: matches code, name, source
// agency (bea, bls, frb, ice, freddie mac…), country, group and series id.
export function searchEcon(query: string, limit = 40): EconSeries[] {
  const q = norm(query)
  if (!q) return []
  const tokens = q.split(' ')
  const hay = (e: EconSeries) => norm(`${e.code} ${e.name} ${e.source} ${e.country} ${econCountryName(e.country)} ${e.group} ${e.symbol.replace(/^(FRED|DBN):/i, '')}`)
  const scored = ECON_ALL.map((e) => {
    const h = hay(e)
    let score = 0
    for (const t of tokens) {
      const srcAlias = ALIAS[t]
      const aliasHit = srcAlias && (srcAlias.includes('*') || srcAlias.includes(e.source))
      if (!h.includes(t) && !aliasHit) return null
      if (e.code.toLowerCase() === t) score += 10
      else if (e.code.toLowerCase().startsWith(t)) score += 6
      else if (new RegExp(`(^| )${t}`).test(norm(e.name))) score += 4
      else if (aliasHit) score += 3
      else score += 1
    }
    // Prefer US headline series on ties.
    if (e.country === 'US') score += 0.5
    return { e, score }
  }).filter((x): x is { e: EconSeries; score: number } => !!x)
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.e)
}
