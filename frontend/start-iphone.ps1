# Glow Journal - Start Frontend (iPhone access)
# Run from frontend folder: .\start-iphone.ps1
#
# The iPhone talks only to this dev server (port 3000). API calls (/api) and
# photos (/uploads) are forwarded to the backend on this laptop by the dev
# server's proxy, so there are no cross-origin problems.
# HTTPS is required for the live camera in iPhone Safari; the certificate is
# self-signed, so Safari shows a warning the first time.

Write-Host ""
Write-Host "  Glow Journal Frontend - iPhone Access" -ForegroundColor Cyan
Write-Host "  =======================================" -ForegroundColor Cyan
Write-Host ""

# Wi-Fi/Ethernet adapter that has a default gateway = the address your phone can reach
$LocalIP = (
    Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
    Select-Object -First 1
).IPv4Address.IPAddress

if (-not $LocalIP) {
    $LocalIP = Read-Host "Enter your WiFi IP (e.g. 192.168.1.5)"
}

Write-Host "  On your iPhone (same Wi-Fi), open Safari and go to:" -ForegroundColor Yellow
Write-Host "    https://${LocalIP}:3000" -ForegroundColor White
Write-Host ""
Write-Host "  First time only:" -ForegroundColor Gray
Write-Host "   - Safari says 'This Connection Is Not Private': tap Show Details > visit this website" -ForegroundColor Gray
Write-Host "   - Windows asks to allow Node.js on the network: allow Private networks" -ForegroundColor Gray
Write-Host "  The backend must be running too (backend\start-dev-iphone.ps1 or start-dev.ps1)." -ForegroundColor Gray
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

Remove-Item Env:REACT_APP_API_URL -ErrorAction SilentlyContinue  # use the dev proxy, not a direct backend URL
$env:HOST = "0.0.0.0"
$env:HTTPS = "true"
$env:BROWSER = "none"
npm start
