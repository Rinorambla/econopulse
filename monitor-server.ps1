# Script di monitoraggio automatico del server Next.js per Windows PowerShell
# Mantiene il server sempre attivo

param(
    [string]$ServerUrl = "http://localhost:3000",
    [string]$PingEndpoint = "http://localhost:3000/api/ping",
    [int]$CheckInterval = 30,
    [int]$MaxRetries = 3
)

$LogFile = "server-monitor.log"
$ServerProcess = $null

function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "$Timestamp - $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry
}

function Test-Server {
    try {
        $Response = Invoke-WebRequest -Uri $PingEndpoint -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        return $Response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

function Start-NextServer {
    Write-Log "Starting Next.js server..."
    
    # Kill existing processes
    Get-Process -Name "node" -ErrorAction SilentlyContinue | 
        Where-Object { $_.ProcessName -eq "node" -and $_.CommandLine -like "*next*dev*" } |
        Stop-Process -Force -ErrorAction SilentlyContinue
    
    Start-Sleep -Seconds 2
    
    # Start new server
    $ServerProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden
    Write-Log "Server started with PID: $($ServerProcess.Id)"
    
    # Wait for startup
    Start-Sleep -Seconds 10
}

function Monitor-Server {
    $RetryCount = 0
    
    while ($RetryCount -lt $MaxRetries) {
        if (Test-Server) {
            Write-Log "✅ Server is healthy"
            return $true
        }
        else {
            $RetryCount++
            Write-Log "❌ Server check failed (attempt $RetryCount/$MaxRetries)"
            Start-Sleep -Seconds 5
        }
    }
    
    Write-Log "🔄 Server is down. Restarting..."
    Start-NextServer
    
    # Verify restart
    Start-Sleep -Seconds 15
    if (Test-Server) {
        Write-Log "✅ Server restarted successfully"
        return $true
    }
    else {
        Write-Log "❌ Failed to restart server"
        return $false
    }
}

# Main execution
Write-Log "🚀 Starting Next.js server monitoring..."
Write-Log "📊 Monitoring: $PingEndpoint"
Write-Log "⏱️ Check interval: $CheckInterval seconds"

# Initial server check/start
if (-not (Test-Server)) {
    Start-NextServer
}

# Main monitoring loop
try {
    while ($true) {
        Monitor-Server
        Start-Sleep -Seconds $CheckInterval
    }
}
catch {
    Write-Log "❌ Monitoring stopped: $($_.Exception.Message)"
}
finally {
    Write-Log "🛑 Server monitoring terminated"
}
