# Glow Journal - Start Backend (Development)
# Run from backend folder: .\start-dev.ps1

Write-Host ""
Write-Host "  Glow Journal Backend - DEVELOPMENT" -ForegroundColor Cyan
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "[ERROR] Virtual environment not found. Run setup first:" -ForegroundColor Red
    Write-Host "  .\setup.ps1" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path ".env.development")) {
    Write-Host "[ERROR] .env.development not found. Run setup first:" -ForegroundColor Red
    Write-Host "  .\setup.ps1" -ForegroundColor Yellow
    exit 1
}

$env:ENV_FILE = ".env.development"

Write-Host "  Backend: http://localhost:8000" -ForegroundColor Green
Write-Host "  API docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

& venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
