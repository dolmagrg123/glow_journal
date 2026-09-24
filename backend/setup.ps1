# Run from the backend folder: cd backend; .\setup.ps1
# Safe to re-run: existing venv, database and .env.development are kept.

Write-Host ""
Write-Host "=== Glow Journal - Setup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Create venv with Python 3.11 (the pinned packages don't support 3.12+)
if (-not (Test-Path "venv\Scripts\python.exe")) {
    & py -3.11 --version *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Python 3.11 not found. Install it with:" -ForegroundColor Red
        Write-Host "  winget install --id Python.Python.3.11 --scope user"
        exit 1
    }
    Write-Host "Creating virtual environment (Python 3.11)..." -ForegroundColor Yellow
    py -3.11 -m venv venv
}
Write-Host "[OK] venv ready" -ForegroundColor Green

# 2. Install packages
Write-Host "Installing packages..." -ForegroundColor Yellow
venv\Scripts\pip.exe install -q -r requirements.txt
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] pip install failed" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Packages installed" -ForegroundColor Green

# 3. Database + .env.development (skipped if .env.development already exists)
if (-not (Test-Path ".env.development")) {
    $psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
    if (-not $psql) {
        $psql = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
    }
    if (-not $psql) {
        Write-Host "[ERROR] psql not found. Install PostgreSQL from https://postgresql.org/download/windows" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    $PgPort = Read-Host "PostgreSQL port [5433]"
    if (-not $PgPort) { $PgPort = "5433" }
    $PgPass = Read-Host "PostgreSQL password for user 'postgres'"

    $env:PGPASSWORD = $PgPass
    & $psql -U postgres -p $PgPort -c "SELECT 1;" *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[ERROR] Cannot connect to PostgreSQL on port $PgPort." -ForegroundColor Red
        Write-Host "  - Check the port with: netstat -ano | findstr `"543`""
        Write-Host "  - Press Win+R, type 'services.msc', and make sure PostgreSQL is Running"
        exit 1
    }
    Write-Host "[OK] PostgreSQL connected" -ForegroundColor Green

    $exists = & $psql -U postgres -p $PgPort -tAc "SELECT 1 FROM pg_database WHERE datname='skincare_tracker';"
    if ($exists -ne "1") { & $psql -U postgres -p $PgPort -c "CREATE DATABASE skincare_tracker;" | Out-Null }
    Write-Host "[OK] Database ready" -ForegroundColor Green

    $envText = "DATABASE_URL=postgresql://postgres:$PgPass@localhost:$PgPort/skincare_tracker
SECRET_KEY=local-dev-secret-do-not-use-in-prod
STORAGE_BACKEND=local
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
MAX_IMAGE_SIZE_MB=15
ANTHROPIC_API_KEY=
"
    [System.IO.File]::WriteAllText("$PWD\.env.development", $envText)
    Write-Host "[OK] .env.development created" -ForegroundColor Green
} else {
    Write-Host "[OK] .env.development already exists - skipping database setup" -ForegroundColor Green
}

# 4. Create tables + seed products
Write-Host "Creating tables and seeding products..." -ForegroundColor Yellow
$env:ENV_FILE = ".env.development"
venv\Scripts\python.exe scripts/seed_products.py
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Seeding failed - check DATABASE_URL in .env.development" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=== Setup complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. In this window run:  .\start-dev.ps1"
Write-Host "  2. In a NEW PowerShell window:  cd frontend; npm install; npm start"
Write-Host "  3. Open browser: http://localhost:3000"
Write-Host ""
