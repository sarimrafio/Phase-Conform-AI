@echo off
REM One-click launcher for Phase-Conform AI (backend + frontend)
cd /d "%~dp0"

echo Stopping any old servers on ports 8000 / 3000...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000 " ^| findstr LISTENING') do taskkill /PID %%p /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do taskkill /PID %%p /F >nul 2>&1

echo Starting RDKit backend on http://localhost:8000 ...
start "Phase-Conform Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000"

echo Starting Next.js frontend on http://localhost:3000 ...
start "Phase-Conform Frontend" cmd /k "npm run dev"

echo Waiting for servers to boot...
timeout /t 10 /nobreak >nul
start "" http://localhost:3000
echo Done. Close the two server windows to stop.
