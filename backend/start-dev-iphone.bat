@echo off
title Glow Journal - Backend (DEV - iPhone access)
echo.
echo Getting your local IP address...
echo.

:: Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set LOCAL_IP=%%a
    goto :found
)
:found
set LOCAL_IP=%LOCAL_IP: =%

echo Your local IP: %LOCAL_IP%
echo.
echo On your iPhone, open: http://%LOCAL_IP%:3000
echo Make sure your iPhone is on the same WiFi network!
echo.

call venv\Scripts\activate.bat

:: Update BACKEND_URL in .env.development to use local IP
powershell -Command "(Get-Content .env.development) -replace 'BACKEND_URL=.*', 'BACKEND_URL=http://%LOCAL_IP%:8000' | Set-Content .env.development"

set ENV_FILE=.env.development
uvicorn main:app --reload --port 8000 --host 0.0.0.0 --env-file .env.development
