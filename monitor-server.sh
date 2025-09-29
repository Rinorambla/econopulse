#!/bin/bash

# Script di monitoraggio automatico del server Next.js
# Mantiene il server sempre attivo

SERVER_URL="http://localhost:3000"
PING_ENDPOINT="${SERVER_URL}/api/ping"
LOG_FILE="server-monitor.log"
MAX_RETRIES=5

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

check_server() {
    if curl -s --max-time 5 $PING_ENDPOINT > /dev/null 2>&1; then
        return 0  # Server is running
    else
        return 1  # Server is down
    fi
}

start_server() {
    log_message "Starting Next.js server..."
    npm run dev &
    SERVER_PID=$!
    sleep 10  # Wait for server to start
}

monitor_server() {
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if check_server; then
            log_message "Server is running correctly"
            return 0
        else
            log_message "Server check failed (attempt $((retry_count + 1))/$MAX_RETRIES)"
            retry_count=$((retry_count + 1))
            sleep 5
        fi
    done
    
    log_message "Server is down after $MAX_RETRIES attempts. Restarting..."
    
    # Kill existing server processes
    pkill -f "next dev" 2>/dev/null || true
    sleep 3
    
    # Start new server
    start_server
    
    # Verify restart
    sleep 10
    if check_server; then
        log_message "Server restarted successfully"
    else
        log_message "Failed to restart server"
    fi
}

# Main monitoring loop
log_message "Starting server monitoring..."

# Initial server start
if ! check_server; then
    start_server
fi

# Continuous monitoring every 30 seconds
while true; do
    monitor_server
    sleep 30
done
