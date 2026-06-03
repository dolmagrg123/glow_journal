# Run from the backend folder: cd backend; .\setup.ps1

Write-Host ""
Write-Host "=== Glow Journal - Setup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Create venv
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}
Write-Host "[OK] venv ready" -ForegroundColor Green

# 2. Install packages
Write-Host "Installing packages..." -ForegroundColor Yellow
venv\Scripts\pip.exe install -r requirements.txt
Write-Host "[OK] Packages installed" -ForegroundColor Green

# 3. Get postgres password
Write-Host ""
$PgPass = Read-Host "Enter PostgreSQL password (the one you set when installing PostgreSQL)"

# 4. Test connection
$env:PGPASSWORD = $PgPass
$result = & psql -U postgres -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Cannot connect to PostgreSQL." -ForegroundColor Red
    Write-Host "Tips:" -ForegroundColor Yellow
    Write-Host "  - Press Win+R, type 'services.msc', find PostgreSQL and make sure it's Running"
    Write-Host "  - Try password: postgres  or leave it blank"
    exit 1
}
Write-Host "[OK] PostgreSQL connected" -ForegroundColor Green

# 5. Create database
& psql -U postgres -c "CREATE DATABASE skincare_tracker;" 2>$null
Write-Host "[OK] Database ready" -ForegroundColor Green

# 6. Write .env.development
$envText = "DATABASE_URL=postgresql://postgres:$PgPass@localhost:5432/skincare_tracker
SECRET_KEY=local-dev-secret-do-not-use-in-prod
STORAGE_BACKEND=local
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
MAX_IMAGE_SIZE_MB=15
ANTHROPIC_API_KEY="

[System.IO.File]::WriteAllText("$PWD\.env.development", $envText)
Write-Host "[OK] .env.development created" -ForegroundColor Green

# 7. Seed products
Write-Host "Seeding products..." -ForegroundColor Yellow
$env:ENV_FILE = ".env.development"
venv\Scripts\python.exe scripts/seed_products.py
Write-Host "[OK] Done" -ForegroundColor Green

Write-Host ""
Write-Host "=== Setup complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Keep this window open as Window 1, run:  .\start-dev.ps1"
Write-Host "  2. Open a NEW PowerShell window, run:  cd frontend  then  npm start"
Write-Host "  3. Open browser: http://localhost:3000"
Write-Host ""
