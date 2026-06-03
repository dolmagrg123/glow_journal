@echo off
setlocal enabledelayedexpansion
title Glow Journal - Local Setup

echo.
echo ==========================================
echo   Glow Journal ^- Local Setup (Windows)
echo ==========================================
echo.

:: ── Check Python ──────────────────────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found.
    echo   Download from: https://www.python.org/downloads/
    echo   IMPORTANT: Check "Add Python to PATH" during install
    pause & exit /b 1
)
echo [OK] Python found

:: ── Check Node ────────────────────────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo   Download from: https://nodejs.org  (choose LTS version)
    pause & exit /b 1
)
echo [OK] Node.js found

:: ── Check PostgreSQL ──────────────────────────────────────────────────────────
psql --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PostgreSQL not found.
    echo   Download from: https://www.postgresql.org/download/windows/
    echo   During install, remember the password you set for the postgres user
    pause & exit /b 1
)
echo [OK] PostgreSQL found

:: ── Get postgres password ──────────────────────────────────────────────────────
echo.
set /p PG_PASS=Enter your PostgreSQL password (set during install): 

:: ── Create database ───────────────────────────────────────────────────────────
echo.
echo Creating database...
set PGPASSWORD=%PG_PASS%
psql -U postgres -c "CREATE DATABASE skincare_tracker;" 2>nul
echo [OK] Database ready (skincare_tracker)

:: ── Backend setup ─────────────────────────────────────────────────────────────
echo.
echo Setting up backend...
cd backend

if not exist "venv" (
    python -m venv venv
    echo [OK] Virtual environment created
)

call venv\Scripts\activate.bat

pip install -q -r requirements.txt
echo [OK] Python packages installed

:: Create .env.development if missing
if not exist ".env.development" (
    echo DATABASE_URL=postgresql://postgres:%PG_PASS%@localhost:5432/skincare_tracker> .env.development
    echo SECRET_KEY=local-dev-secret-do-not-use-in-prod>> .env.development
    echo STORAGE_BACKEND=local>> .env.development
    echo BACKEND_URL=http://localhost:8000>> .env.development
    echo FRONTEND_URL=http://localhost:3000>> .env.development
    echo ENVIRONMENT=development>> .env.development
    echo ANTHROPIC_API_KEY=>> .env.development
    echo [OK] .env.development created
) else (
    echo [SKIP] .env.development already exists
)

:: Seed products
echo Seeding beauty products...
set ENV_FILE=.env.development
python scripts/seed_products.py
echo [OK] Products seeded

call venv\Scripts\deactivate.bat
cd ..

:: ── Frontend setup ────────────────────────────────────────────────────────────
echo.
echo Setting up frontend...
cd frontend
call npm install --silent
echo [OK] Node packages installed
cd ..

:: ── Done ──────────────────────────────────────────────────────────────────────
echo.
echo ==========================================
echo   Setup complete!
echo ==========================================
echo.
echo To start the app, run these in separate Command Prompt windows:
echo.
echo   [Window 1 - Backend]
echo     cd backend
echo     start-dev.bat
echo.
echo   [Window 2 - Frontend]
echo     cd frontend
echo     npm start
echo.
echo   Then open: http://localhost:3000
echo   API docs:  http://localhost:8000/docs
echo.
pause
