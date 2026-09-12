param([string]$Base = 'https://www.econopulse.ai')
$tests = @(
  @('yahoo-history?symbol=EURUSD%3DX&range=5d&interval=1m&prepost=1','FX 1m'),
  @('yahoo-history?symbol=EURUSD%3DX&range=1mo&interval=5m&prepost=1','FX 5m'),
  @('yahoo-history?symbol=EURUSD%3DX&range=1mo&interval=15m&prepost=1','FX 15m'),
  @('yahoo-history?symbol=EURUSD%3DX&range=1mo&interval=30m&prepost=1','FX 30m'),
  @('yahoo-history?symbol=EURUSD%3DX&range=1y&interval=1h','FX 1H'),
  @('yahoo-history?symbol=EURUSD%3DX&range=5d&interval=5m&prepost=1','FX 1D'),
  @('yahoo-history?symbol=EURUSD%3DX&range=2y&interval=1d','FX 1Y'),
  @('yahoo-history?symbol=EURUSD%3DX&range=10y&interval=1wk','FX 5Y'),
  @('yahoo-history?symbol=EURUSD%3DX&range=max&interval=1mo','FX MAX'),
  @('yahoo-history?symbol=AAPL&range=5d&interval=15m&prepost=1','AAPL 15m'),
  @('yahoo-history?symbol=GC%3DF&range=1mo&interval=30m','GOLD 30m'),
  @('yahoo-history?symbol=BTC-USD&range=5d&interval=5m','BTC 5m'),
  @('yahoo-history?symbol=%5EGSPC&range=2y&interval=1d','SPX 1d'),
  @('yahoo-history?symbol=GBPJPY%3DX&range=1mo&interval=15m&prepost=1','GBPJPY 15m'),
  @('fred-history?symbol=FRED%3ACPIAUCSL%40PC1&range=1y','FRED CPI YoY'),
  @('fred-history?symbol=FRED%3ADGS10&range=1y','FRED DGS10'),
  @('dbnomics-history?symbol=DBN%3AISM%2Fpmi%2Fpm&range=1y','ISM Mfg'),
  @('dbnomics-history?symbol=DBN%3AISM%2Fnm-pmi%2Fpm&range=1y','ISM Svc')
)
foreach ($t in $tests) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri "$Base/api/$($t[0])" -TimeoutSec 25
    $j = $r.Content | ConvertFrom-Json
    $n = 0
    if ($j.data -and $j.data.bars) { $n = @($j.data.bars).Count }
    Write-Output ("{0,-14} -> {1}  bars={2}" -f $t[1], [int]$r.StatusCode, $n)
  } catch {
    $code = '?'
    try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    Write-Output ("{0,-14} -> HTTP {1}" -f $t[1], $code)
  }
}
