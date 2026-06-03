@echo off
title Glow Journal - Backend (DEV)
echo.
echo  Starting Glow Journal Backend - DEVELOPMENT
echo  ============================================
echo.

:: Check venv exists
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found.
    echo Please run setup-local.bat first.
    echo.
    pause
    exit /b 1
)

:: Check .env.development exists
if not exist ".env.development" (
    echo [ERROR] .env.development not found.
    echo Please run setup-local.bat first.
    echo.
    pause
    exit /b 1
)

:: Activate venv
call venv\Scripts\activate.bat

:: Set env file so main.py loads the right config
set ENV_FILE=.env.development

echo  Starting server on http://localhost:8000
echo  API docs at   http://localhost:8000/docs
echo  Press Ctrl+C to stop
echo.

python -m uvicorn main:app --reload --port 8000

echo.
echo  Server stopped.
pause
