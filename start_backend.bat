@echo off
cd /d "%~dp0"
echo Starting NotebookLM-like Chatbot Backend...
echo.
echo Make sure you have activated the virtual environment:
echo   venv\Scripts\activate
echo.
echo Starting FastAPI server on http://localhost:8000
echo.
python backend/main.py