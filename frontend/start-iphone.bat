@echo off
title Glow Journal - Frontend (iPhone access)

:: Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set LOCAL_IP=%%a
    goto :found
)
:found
set LOCAL_IP=%LOCAL_IP: =%

echo.
echo ======================================
echo  Starting frontend for iPhone access
echo ======================================
echo.
echo Your laptop IP: %LOCAL_IP%
echo.
echo On your iPhone browser, open:
echo   http://%LOCAL_IP%:3000
echo.
echo Make sure both devices are on the SAME WiFi!
echo.

set REACT_APP_API_URL=http://%LOCAL_IP%:8000
set HOST=0.0.0.0
npm start
