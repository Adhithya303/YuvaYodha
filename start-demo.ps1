# IdleWise - Schneider Electric Hackathon Demo Launch Script
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  IDLEWISE - Energy-Aware Machine Idle Optimization" -ForegroundColor Green
Write-Host "  Schneider Electric Hackathon Challenge 4 Demo Launch" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Setup Demo
Write-Host "[1/4] Setting up backend and database..." -ForegroundColor Yellow
Push-Location "$ScriptDir\backend"
python -m app.demo_setup
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Demo setup failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

# 2. Check Readiness
Write-Host ""
Write-Host "[2/4] Verifying system readiness..." -ForegroundColor Yellow
python -m app.demo_check
Pop-Location

# 3. Launch Backend
Write-Host ""
Write-Host "[3/4] Launching FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\backend'; python -m uvicorn app.main:app --port 8000 --host 127.0.0.1"

# 4. Launch Frontend
Write-Host ""
Write-Host "[4/4] Launching React Frontend on http://127.0.0.1:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\frontend'; npm run dev -- --host 127.0.0.1 --port 5173"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  IdleWise is launching!" -ForegroundColor Green
Write-Host "  Backend:  http://127.0.0.1:8000/docs" -ForegroundColor Gray
Write-Host "  Frontend: http://127.0.0.1:5173/" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan

Start-Sleep -Seconds 3
Start-Process "http://127.0.0.1:5173/"
