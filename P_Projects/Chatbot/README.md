# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# AI Chatbot with RAG Setup Guide

## Project Overview
This is an AI Chatbot application built with Electron, React, and TypeScript that uses Ollama for AI responses and RAG (Retrieval Augmented Generation) for context-aware responses from the TAS2781 technical documentation.

## Prerequisites

### 1. Install Ollama
Ollama is required for the AI functionality to work.

**Windows Installation:**
1. Download Ollama from: https://ollama.ai/download
2. Run the installer
3. Ollama will automatically start as a Windows service

**Alternative - Manual Installation:**
```powershell
# Using Chocolatey
choco install ollama

# Using Scoop
scoop install ollama
```

### 2. Verify Ollama Installation
```powershell
# Check if Ollama is running
ollama --version

# List available models
ollama list
```

### 3. Install Required Models
The application uses these models:
```powershell
# Install main chat model (choose one)
ollama pull llama2        # Smaller, faster
ollama pull llama2:13b    # Better quality
ollama pull codellama     # Good for technical docs

# Install embedding model for RAG
ollama pull nomic-embed-text
```

## Running the Application

### 1. Install Dependencies
```powershell
npm install
```

### 2. Start Development Mode
```powershell
# Terminal 1: Start React dev server
npm run dev:react

# Terminal 2: Start Electron app
npm run dev:electron
```

### 3. Build for Production
```powershell
npm run build
```

## Features

### ✅ Completed Features
- [x] Electron app with React frontend
- [x] Modern UI with Tailwind CSS
- [x] Chatbot interface with slide-in panel
- [x] PDF processing (TAS2781 technical documentation)
- [x] RAG system with document chunking
- [x] Vector embeddings for semantic search
- [x] Ollama integration for AI responses
- [x] Error handling and fallback responses

### 📋 Current Status
- **PDF Processing**: ✅ Working with sample TAS2781 data
- **RAG System**: ✅ Functional with vector search
- **Ollama Integration**: ⚠️ Requires Ollama to be running
- **UI Components**: ✅ Fully functional
- **Welcome Messages**: ✅ Working

## Troubleshooting

### Issue: "Ollama is not running" Error
**Solution:**
1. Make sure Ollama is installed
2. Start Ollama service:
   ```powershell
   # Check if Ollama is running
   curl http://localhost:11434/api/tags
   
   # If not running, start Ollama
   ollama serve
   ```

### Issue: No AI Models Available
**Solution:**
```powershell
# Install a chat model
ollama pull llama2

# Install embedding model
ollama pull nomic-embed-text
```

### Issue: Slow Responses
**Solution:**
- Use smaller models like `llama2:7b` instead of larger ones
- Ensure adequate RAM (8GB+ recommended)
- Consider using `codellama` for technical documentation

## Configuration

### Model Selection
Edit `src/Electron/services/ollama-service.ts` to change models:
```typescript
constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama2') {
```

### RAG Settings
Edit `src/Electron/services/rag-system.ts` to adjust:
- Chunk size: Default 800 characters
- Overlap: Default 100 characters  
- Top-K results: Default 3 chunks

## Project Structure
```
src/
├── Components/
│   ├── Chatbot.tsx          # Main chat interface
│   └── PPC4.tsx             # Main app with chat button
├── Electron/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # IPC bridge
│   └── services/
│       ├── ollama-service.ts    # Ollama API integration
│       ├── pdf-processor.ts     # PDF parsing and extraction
│       └── rag-system.ts        # RAG implementation
└── App.tsx                  # React app entry point
```

## Quick Start Commands

### Install Ollama and Models
```powershell
# 1. Download and install Ollama from https://ollama.ai/download
# 2. Install models
ollama pull llama2
ollama pull nomic-embed-text

# 3. Verify installation
ollama list
```

### Start the Application
```powershell
# Terminal 1
npm run dev:react

# Terminal 2  
npm run dev:electron
```
