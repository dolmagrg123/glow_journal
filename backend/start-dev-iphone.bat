@echo off
title Glow Journal - Backend (DEV + iPhone)
echo.
echo  Starting Glow Journal Backend - iPhone Access
echo  ===============================================
echo.

if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found. Run setup-local.bat first.
    pause & exit /b 1
)

if not exist ".env.development" (
    echo [ERROR] .env.development not found. Run setup-local.bat first.
    pause & exit /b 1
)

:: Get local WiFi IP address
set LOCAL_IP=
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /R /C:"IPv4 Address"') do (
    set RAWIP=%%A
    goto :gotip
)
:gotip
:: Strip leading space
set LOCAL_IP=%RAWIP: =%

if "%LOCAL_IP%"=="" (
    echo [WARNING] Could not detect IP automatically.
    set /p LOCAL_IP=Enter your laptop IP address manually (e.g. 192.168.1.5): 
)

echo  Your laptop IP: %LOCAL_IP%
echo.
echo  On your iPhone (same WiFi), open Safari and go to:
echo    http://%LOCAL_IP%:3000
echo.

:: Update BACKEND_URL in .env.development
powershell -Command "(Get-Content .env.development) -replace 'BACKEND_URL=http://[^`r`n]*', 'BACKEND_URL=http://%LOCAL_IP%:8000' | Set-Content .env.development"
echo  Updated BACKEND_URL in .env.development to http://%LOCAL_IP%:8000

call venv\Scripts\activate.bat
set ENV_FILE=.env.development

echo.
echo  Starting server on http://0.0.0.0:8000 (accessible on network)
echo  Press Ctrl+C to stop
echo.

python -m uvicorn main:app --reload --port 8000 --host 0.0.0.0

echo.
echo  Server stopped.
:: Reset BACKEND_URL back to localhost when done
powershell -Command "(Get-Content .env.development) -replace 'BACKEND_URL=http://[^`r`n]*', 'BACKEND_URL=http://localhost:8000' | Set-Content .env.development"
echo  Reset BACKEND_URL back to localhost
pause
