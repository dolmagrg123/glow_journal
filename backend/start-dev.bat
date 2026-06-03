@echo off
title Glow Journal - Backend (DEV)
echo Starting backend in DEVELOPMENT mode...
echo.
call venv\Scripts\activate.bat
set ENV_FILE=.env.development
uvicorn main:app --reload --port 8000 --env-file .env.development
