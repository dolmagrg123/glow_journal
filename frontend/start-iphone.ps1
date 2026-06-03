# Glow Journal - Start Frontend (iPhone access)
# Run from frontend folder: .\start-iphone.ps1

Write-Host ""
Write-Host "  Glow Journal Frontend - iPhone Access" -ForegroundColor Cyan
Write-Host "  =======================================" -ForegroundColor Cyan
Write-Host ""

$LocalIP = (
    Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } |
    Select-Object -First 1
).IPAddress

if (-not $LocalIP) {
    $LocalIP = Read-Host "Enter your WiFi IP (e.g. 192.168.1.5)"
}

Write-Host "  Your laptop IP: $LocalIP" -ForegroundColor Green
Write-Host ""
Write-Host "  On your iPhone, open Safari and go to:" -ForegroundColor Yellow
Write-Host "    http://${LocalIP}:3000" -ForegroundColor White
Write-Host ""
Write-Host "  Make sure iPhone is on the SAME WiFi as your laptop!" -ForegroundColor Yellow
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

$env:REACT_APP_API_URL = "http://${LocalIP}:8000"
$env:HOST = "0.0.0.0"
npm start
