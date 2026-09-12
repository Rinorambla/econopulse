param([string]$Base = 'https://www.econopulse.ai')
# Verify FRED series candidates for the per-country Economy tab.
$series = @(
  'CPILFESL','MICH',
  'LRHUTTTTEZM156S','CLVMNACSCAB1GQEA19','CP0000EZ19M086NEST',
  'CP0000DEM086NEST','LRHUTTTTDEM156S','CLVMNACSCAB1GQDE',
  'CP0000ITM086NEST','LRHUTTTTITM156S','CLVMNACSCAB1GQIT',
  'CP0000FRM086NEST','LRHUTTTTFRM156S','CLVMNACSCAB1GQFR',
  'CP0000ESM086NEST','LRHUTTTTESM156S','CLVMNACSCAB1GQES',
  'GBRCPIALLMINMEI','LRHUTTTTGBM156S','IUDSOIA',
  'JPNCPIALLMINMEI','LRHUTTTTJPM156S','IRSTCI01JPM156N',
  'CHNCPIALLMINMEI',
  'CANCPIALLMINMEI','LRUNTTTTCAM156S','IRSTCI01CAM156N',
  'AUSCPIALLQINMEI','IRSTCI01AUM156N','LRHUTTTTAUM156S',
  'CHECPIALLMINMEI','IRSTCI01CHM156N',
  'ECBDFR','FEDFUNDS'
)
foreach ($s in $series) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri "$Base/api/fred-history?series=$s&range=1y" -TimeoutSec 20
    $j = $r.Content | ConvertFrom-Json
    Write-Output ("{0,-22} -> 200 bars={1}" -f $s, @($j.data.bars).Count)
  } catch {
    $code = '?'
    try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    Write-Output ("{0,-22} -> HTTP {1}" -f $s, $code)
  }
}
