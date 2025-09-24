@echo off
REM Ollama Startup Script with Custom Model Path
REM Replace this path with your actual model directory
set OLLAMA_MODELS=C:\Your\Custom\Model\Path

echo Starting Ollama with custom model path: %OLLAMA_MODELS%
ollama serve

pause