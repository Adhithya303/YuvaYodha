@echo off
title IdleWise - Schneider Electric Hackathon Demo
echo ========================================================
echo   IDLEWISE - Energy-Aware Machine Idle Optimization
echo   Schneider Electric Hackathon Challenge 4 Demo Launch
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/4] Setting up backend and database...
cd backend
python -m app.demo_setup
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Demo setup failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Verifying system readiness...
python -m app.demo_check
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Pre-demo check failed! Proceeding anyway...
)

echo.
echo [3/4] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "IdleWise Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --port 8000 --host 127.0.0.1"

echo.
echo [4/4] Launching React Frontend on http://127.0.0.1:5173 ...
start "IdleWise Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 127.0.0.1 --port 5173"

echo.
echo ========================================================
echo   IdleWise is launching!
echo   Backend:  http://127.0.0.1:8000/docs
echo   Frontend: http://127.0.0.1:5173/
echo ========================================================
timeout /t 3 >nul
start http://127.0.0.1:5173/
