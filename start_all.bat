@echo off
echo =====================================
echo NotebookLM-like Chatbot Setup
echo =====================================
echo.

echo [1/3] Checking Python virtual environment...
if not exist "venv\Scripts\activate" (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo [2/3] Activating virtual environment and starting backend...
call venv\Scripts\activate
start "Backend Server" cmd /k "echo Starting FastAPI backend server... && python backend/main.py"

echo [3/3] Starting React development server...
timeout /t 3 >nul
start "Frontend Dev Server" cmd /k "echo Starting React development server... && npm run dev:react"

echo.
echo =====================================
echo Setup Complete!
echo =====================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo To start Electron app: npm run dev:electron
echo To setup data: python setup_data.py
echo.
echo Press any key to open Electron app...
pause >nul

npm run dev:electron