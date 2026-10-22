# Glow Journal - Start Backend (iPhone access)
# Run from backend folder: .\start-dev-iphone.ps1
#
# The phone never talks to the backend directly: the frontend dev server
# (frontend\start-iphone.ps1) forwards /api and /uploads to it. So the backend
# stays on localhost; this script only points share links at the phone URL.

Write-Host ""
Write-Host "  Glow Journal Backend - iPhone Access" -ForegroundColor Cyan
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "[ERROR] Run .\setup.ps1 first" -ForegroundColor Red
    exit 1
}

$LocalIP = (
    Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
    Select-Object -First 1
).IPv4Address.IPAddress

$env:ENV_FILE = ".env.development"
if ($LocalIP) {
    # Real environment variables override .env.development (nothing is written to the file)
    $env:FRONTEND_URL = "https://${LocalIP}:3000"
    Write-Host "  Share links point to https://${LocalIP}:3000" -ForegroundColor Gray
}

Write-Host "  Backend: http://localhost:8000 (reached from the phone through the frontend)" -ForegroundColor Green
Write-Host "  Now run frontend\start-iphone.ps1 in a second window." -ForegroundColor Yellow
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

& venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
