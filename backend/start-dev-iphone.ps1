# Glow Journal - Start Backend (iPhone access)
# Run from backend folder: .\start-dev-iphone.ps1

Write-Host ""
Write-Host "  Glow Journal Backend - iPhone Access" -ForegroundColor Cyan
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "[ERROR] Run .\setup.ps1 first" -ForegroundColor Red
    exit 1
}

# Get local IP
$LocalIP = (
    Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } |
    Select-Object -First 1
).IPAddress

if (-not $LocalIP) {
    Write-Host "[WARNING] Could not auto-detect IP." -ForegroundColor Yellow
    $LocalIP = Read-Host "Enter your laptop's WiFi IP (e.g. 192.168.1.5)"
}

Write-Host "  Your laptop IP: $LocalIP" -ForegroundColor Green
Write-Host ""
Write-Host "  On your iPhone (same WiFi), open Safari:" -ForegroundColor Yellow
Write-Host "    http://${LocalIP}:3000" -ForegroundColor White
Write-Host ""

# Update BACKEND_URL in .env.development
(Get-Content .env.development) -replace 'BACKEND_URL=.*', "BACKEND_URL=http://${LocalIP}:8000" |
    Set-Content .env.development
Write-Host "  Updated BACKEND_URL to http://${LocalIP}:8000" -ForegroundColor Gray

$env:ENV_FILE = ".env.development"

Write-Host "  Press Ctrl+C to stop (BACKEND_URL will reset to localhost)" -ForegroundColor Gray
Write-Host ""

try {
    & venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000 --host 0.0.0.0
} finally {
    # Reset back to localhost when stopped
    (Get-Content .env.development) -replace 'BACKEND_URL=.*', 'BACKEND_URL=http://localhost:8000' |
        Set-Content .env.development
    Write-Host "  Reset BACKEND_URL back to localhost" -ForegroundColor Gray
}
