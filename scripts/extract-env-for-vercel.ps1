# Script per preparare Environment Variables per Vercel
# Estrae le variabili da .env.local e genera un formato pronto per il copy/paste

Write-Host "=== EconoPulse - Vercel Environment Variables Extractor ===" -ForegroundColor Cyan
Write-Host ""

$envFiles = @(".env.local", ".env", "temp-env-values.txt")
$foundFile = $null

foreach ($file in $envFiles) {
    if (Test-Path $file) {
        $foundFile = $file
        Write-Host "✓ Trovato file: $file" -ForegroundColor Green
        break
    }
}

if (-not $foundFile) {
    Write-Host "✗ Nessun file .env trovato!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Crea un file .env.local nella root del progetto con le tue variabili." -ForegroundColor Yellow
    Write-Host "Usa .env.example come riferimento." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "--- VARIABILI ESTRATTE (pronte per Vercel) ---" -ForegroundColor Yellow
Write-Host ""

# Leggi e processa il file
$content = Get-Content $foundFile -Raw
$lines = $content -split "`n"

$output = @()
$count = 0

foreach ($line in $lines) {
    $line = $line.Trim()
    
    # Salta commenti e righe vuote
    if ($line -match "^#" -or $line -eq "") {
        continue
    }
    
    # Valida formato KEY=VALUE
    if ($line -match '^([A-Z_][A-Z0-9_]*)=(.*)$') {
        $key = $Matches[1]
        $value = $Matches[2]
        
        # Rimuovi virgolette se presenti
        $value = $value -replace '^["\047]|["\047]$', ''
        
        # Maschera valori sensibili per il preview
        $maskedValue = $value
        if ($value.Length -gt 20) {
            $maskedValue = $value.Substring(0, 10) + "..." + $value.Substring($value.Length - 5)
        }
        
        Write-Host "$key=$maskedValue" -ForegroundColor Gray
        $output += "$key=$value"
        $count++
    }
}

Write-Host ""
Write-Host "--- TOTALE: $count variabili ---" -ForegroundColor Cyan
Write-Host ""

# Salva in file per import su Vercel
$outputFile = "vercel-env-import.txt"
$output | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "✓ Salvato in: $outputFile" -ForegroundColor Green
Write-Host ""
Write-Host "PROSSIMI PASSI:" -ForegroundColor Yellow
Write-Host "1. Vai su Vercel → econopulse → Settings → Environment Variables" -ForegroundColor White
Write-Host "2. Clicca 'Add New' o 'Import .env'" -ForegroundColor White
Write-Host "3. Incolla il contenuto di $outputFile" -ForegroundColor White
Write-Host "4. Seleziona gli ambienti (Production, Preview, Development)" -ForegroundColor White
Write-Host "5. Salva e fai un nuovo deployment" -ForegroundColor White
Write-Host ""

# Apri il file automaticamente
if (Test-Path $outputFile) {
    notepad $outputFile
}
