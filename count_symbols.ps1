# PowerShell script to count symbols per category

Write-Host "🔍 ANALISI SIMBOLI DASHBOARD" -ForegroundColor Green
Write-Host ""

# Read the API file
$content = Get-Content "src/app/api/dashboard-data/route.ts" -Raw

# Extract TIINGO_SYMBOLS array
$symbolsMatch = [regex]::Match($content, "TIINGO_SYMBOLS = \[([\s\S]*?)\];")
if (-not $symbolsMatch.Success) {
    Write-Host "❌ Non trovato TIINGO_SYMBOLS" -ForegroundColor Red
    exit 1
}

# Extract symbols
$symbolsString = $symbolsMatch.Groups[1].Value
$symbols = @()
$symbolsString -split '[,\n\r]' | ForEach-Object {
    $symbol = $_.Trim() -replace "['\s]", ""
    if ($symbol -and $symbol -notmatch "^//" -and $symbol.Length -gt 0) {
        $symbols += $symbol
    }
}

Write-Host "📊 TOTALE SIMBOLI: $($symbols.Count)" -ForegroundColor Cyan
Write-Host ""

# Extract sector mapping
$sectorMatch = [regex]::Match($content, "const sectors: \{ \[key: string\]: string \} = \{([\s\S]*?)\s*\};")
if (-not $sectorMatch.Success) {
    Write-Host "❌ Non trovata mappatura settori" -ForegroundColor Red
    exit 1
}

# Parse sector mapping
$sectorMapping = @{}
$sectorLines = $sectorMatch.Groups[1].Value -split '\n'
foreach ($line in $sectorLines) {
    if ($line -match "'([^']+)':\s*'([^']+)'") {
        $sectorMapping[$matches[1]] = $matches[2]
    }
}

# Count symbols per sector
$sectorCounts = @{}
$unmappedSymbols = @()

foreach ($symbol in $symbols) {
    $sector = $sectorMapping[$symbol]
    if (-not $sector) {
        $sector = "Other"
        $unmappedSymbols += $symbol
    }
    if (-not $sectorCounts[$sector]) {
        $sectorCounts[$sector] = 0
    }
    $sectorCounts[$sector]++
}

# Group sectors by logical categories
$categoryGroups = @{
    'Technology' = @('Technology', 'Technology ETF', 'Semiconductor ETF', 'Innovation ETF', 'Robotics ETF', 'Genomics ETF', 'Internet ETF')
    'Financial Services' = @('Financial Services', 'Financial ETF')
    'Healthcare' = @('Healthcare', 'Healthcare ETF')
    'Energy' = @('Energy', 'Energy ETF')
    'Consumer' = @('Consumer Discretionary', 'Consumer Staples', 'Consumer Discretionary ETF', 'Consumer Staples ETF', 'Retail')
    'ETF' = @('Technology ETF', 'Financial ETF', 'Healthcare ETF', 'Energy ETF', 'Consumer Discretionary ETF', 'Consumer Staples ETF', 'Real Estate ETF', 'Materials ETF', 'Industrial ETF', 'Utilities ETF', 'Transportation ETF', 'Currency ETF', 'Value ETF', 'Growth ETF', 'Index', 'Bond', 'Commodities')
    'Real Estate' = @('Real Estate', 'Real Estate ETF')
    'Currency' = @('Currency ETF')
    'Crypto' = @('Crypto ETF', 'Crypto Mining', 'Crypto Stocks')
    'Utilities' = @('Utilities', 'Utilities ETF')
    'Materials' = @('Materials', 'Materials ETF')
    'Industrial' = @('Industrial', 'Industrial ETF', 'Aerospace')
    'Communication' = @('Communication Services', 'Communication ETF')
    'International' = @('International', 'Emerging Markets')
    'Bonds' = @('Bond')
    'Commodities' = @('Commodities')
}

Write-Host "📊 CONTEGGIO PER CATEGORIA:" -ForegroundColor Yellow
Write-Host ""

$categoryTotals = @{}
foreach ($category in $categoryGroups.Keys) {
    $total = 0
    $sectors = $categoryGroups[$category]
    
    foreach ($sector in $sectors) {
        if ($sectorCounts[$sector]) {
            $total += $sectorCounts[$sector]
        }
    }
    
    $categoryTotals[$category] = $total
    Write-Host "$category`: $total simboli" -ForegroundColor White
}

Write-Host ""
Write-Host "📋 TUTTI I SETTORI MAPPATI:" -ForegroundColor Yellow
Write-Host ""

$sortedSectors = $sectorCounts.GetEnumerator() | Sort-Object Value -Descending
foreach ($sector in $sortedSectors) {
    Write-Host "$($sector.Key): $($sector.Value) simboli" -ForegroundColor White
}

if ($unmappedSymbols.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  SIMBOLI NON MAPPATI (categoria Other):" -ForegroundColor Orange
    Write-Host ($unmappedSymbols -join ', ') -ForegroundColor Orange
}

Write-Host ""
Write-Host "✅ VERIFICA TOTALI:" -ForegroundColor Green
Write-Host "Simboli nell'array: $($symbols.Count)"
Write-Host "Simboli mappati: $($symbols.Count - $unmappedSymbols.Count)"
Write-Host "Simboli non mappati: $($unmappedSymbols.Count)"

Write-Host ""
Write-Host "🎯 VERIFICA AFFERMAZIONI:" -ForegroundColor Magenta

$tech = $categoryTotals['Technology']
$financial = $categoryTotals['Financial Services']
$healthcare = $categoryTotals['Healthcare']
$energy = $categoryTotals['Energy']
$consumer = $categoryTotals['Consumer']
$etf = $categoryTotals['ETF']
$realEstate = $categoryTotals['Real Estate']
$currency = $categoryTotals['Currency']
$crypto = $categoryTotals['Crypto']

Write-Host "Technology: $tech (dichiarato: 100+) $(if($tech -ge 100){'✅'}else{'❌'})"
Write-Host "Financial Services: $financial (dichiarato: 80+) $(if($financial -ge 80){'✅'}else{'❌'})"
Write-Host "Healthcare: $healthcare (dichiarato: 100+) $(if($healthcare -ge 100){'✅'}else{'❌'})"
Write-Host "Energy: $energy (dichiarato: 50+) $(if($energy -ge 50){'✅'}else{'❌'})"
Write-Host "Consumer: $consumer (dichiarato: 170+) $(if($consumer -ge 170){'✅'}else{'❌'})"
Write-Host "ETF: $etf (dichiarato: 200+) $(if($etf -ge 200){'✅'}else{'❌'})"
Write-Host "Real Estate: $realEstate (dichiarato: 30+) $(if($realEstate -ge 30){'✅'}else{'❌'})"
Write-Host "Currency: $currency (dichiarato: 20+) $(if($currency -ge 20){'✅'}else{'❌'})"
Write-Host "Crypto: $crypto (dichiarato: 25+) $(if($crypto -ge 25){'✅'}else{'❌'})"
