@echo off
setlocal enabledelayedexpansion
title Glow Journal - Local Setup

echo.
echo ==========================================
echo   Glow Journal - Local Setup (Windows)
echo ==========================================
echo.

:: ── Check Python ──────────────────────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found.
    echo   1. Go to https://www.python.org/downloads/
    echo   2. Download Python 3.11 or newer
    echo   3. Run installer - CHECK the box "Add Python to PATH"
    echo   4. Re-run this script
    echo.
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('python --version') do echo [OK] %%v

:: ── Check pip ─────────────────────────────────────────────────────────────────
python -m pip --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] pip not found. Reinstall Python and check "Add to PATH".
    pause & exit /b 1
)
echo [OK] pip found

:: ── Check Node ────────────────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo   1. Go to https://nodejs.org
    echo   2. Download the LTS version
    echo   3. Install it, then re-run this script
    echo.
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo [OK] Node %%v

:: ── Check PostgreSQL ──────────────────────────────────────────────────────────
psql --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PostgreSQL not found or not in PATH.
    echo   1. Go to https://www.postgresql.org/download/windows/
    echo   2. Download and run the installer
    echo   3. Remember the password you set for the "postgres" user
    echo   4. After install, restart this script
    echo.
    echo   If already installed, add PostgreSQL bin folder to PATH:
    echo   Usually: C:\Program Files\PostgreSQL\16\bin
    echo.
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('psql --version') do echo [OK] %%v

:: ── PostgreSQL password ───────────────────────────────────────────────────────
echo.
echo Enter your PostgreSQL password (you set this during PostgreSQL install).
echo If you are not sure, the default user is "postgres".
echo.
set /p PG_PASS=PostgreSQL password: 

:: Test the connection
set PGPASSWORD=%PG_PASS%
psql -U postgres -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Could not connect to PostgreSQL with that password.
    echo   - Make sure PostgreSQL service is running
    echo   - Check password is correct
    echo   - Open Services (Win+R, type services.msc) and start postgresql-x64-XX
    echo.
    pause & exit /b 1
)
echo [OK] PostgreSQL connection successful

:: ── Create database ───────────────────────────────────────────────────────────
echo.
echo Creating database "skincare_tracker"...
psql -U postgres -c "CREATE DATABASE skincare_tracker;" >nul 2>&1
echo [OK] Database ready

:: ── Backend setup ─────────────────────────────────────────────────────────────
echo.
echo Setting up backend...
cd backend

if not exist "venv" (
    echo   Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause & exit /b 1
    )
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment already exists
)

echo   Installing Python packages (this takes a minute)...
call venv\Scripts\activate.bat
pip install -q -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install packages. Check your internet connection.
    pause & exit /b 1
)
echo [OK] Python packages installed

:: ── Create .env.development ───────────────────────────────────────────────────
if not exist ".env.development" (
    echo   Creating .env.development...
    (
        echo DATABASE_URL=postgresql://postgres:%PG_PASS%@localhost:5432/skincare_tracker
        echo SECRET_KEY=local-dev-secret-do-not-use-in-prod
        echo STORAGE_BACKEND=local
        echo BACKEND_URL=http://localhost:8000
        echo FRONTEND_URL=http://localhost:3000
        echo ENVIRONMENT=development
        echo MAX_IMAGE_SIZE_MB=15
        echo ANTHROPIC_API_KEY=
    ) > .env.development
    echo [OK] .env.development created
) else (
    echo [OK] .env.development already exists
)

:: ── Seed products ─────────────────────────────────────────────────────────────
echo   Seeding beauty products into database...
set ENV_FILE=.env.development
python scripts/seed_products.py
if errorlevel 1 (
    echo [WARNING] Product seeding failed. You can run it manually later:
    echo   cd backend ^& python scripts/seed_products.py
) else (
    echo [OK] Products seeded
)

call venv\Scripts\deactivate.bat
cd ..

:: ── Frontend setup ────────────────────────────────────────────────────────────
echo.
echo Setting up frontend (installing npm packages, takes a minute)...
cd frontend
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed. Check your internet connection.
    pause & exit /b 1
)
echo [OK] Frontend packages installed
cd ..

:: ── Done ──────────────────────────────────────────────────────────────────────
echo.
echo ==========================================
echo   Setup complete!
echo ==========================================
echo.
echo HOW TO RUN THE APP:
echo.
echo   Step 1: Open a Command Prompt window, run:
echo     cd backend
echo     start-dev.bat
echo.
echo   Step 2: Open ANOTHER Command Prompt window, run:
echo     cd frontend
echo     npm start
echo.
echo   Step 3: Open browser to http://localhost:3000
echo.
echo   For iPhone access (same WiFi):
echo     Use start-dev-iphone.bat instead of start-dev.bat
echo     Use start-iphone.bat in frontend folder
echo.
pause
