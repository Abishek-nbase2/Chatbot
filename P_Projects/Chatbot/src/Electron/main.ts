import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { OllamaService } from './services/ollama-service.js';
import { GeminiService } from './services/gemini-service.js';
import { PDFProcessor } from './services/pdf-processor.js';
import { RAGSystem } from './services/rag-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow;
let ollamaService: OllamaService;
let geminiService: GeminiService;
let pdfProcessor: PDFProcessor;
let ragSystem: RAGSystem;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

//   if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
//     mainWindow.webContents.openDevTools();
//   } else {
//     mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
//   }
}

async function initializeServices(): Promise<void> {
  try {
    // Initialize services
    ollamaService = new OllamaService();
    geminiService = new GeminiService();
    pdfProcessor = new PDFProcessor();
    ragSystem = new RAGSystem(ollamaService, geminiService);

    // Process the PDF and build the knowledge base
    const pdfPath = path.join(__dirname, '../tas2781.pdf');
    console.log('Processing PDF:', pdfPath);
    
    const pdfData = await pdfProcessor.processPDF(pdfPath);
    console.log('PDF processed successfully');
    
    await ragSystem.buildKnowledgeBase(pdfData);
    console.log('RAG knowledge base built successfully');
    
  } catch (error) {
    console.error('Error initializing services:', error);
  }
}

app.whenReady().then(async () => {
  createWindow();
  await initializeServices();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('ollama:chat', async (_event, message: string) => {
  try {
    if (!ragSystem) {
      throw new Error('RAG system not initialized');
    }
    
    // Use RAG system to get contextual response
    const response = await ragSystem.chat(message);
    return response;
  } catch (error) {
    console.error('Chat error:', error);
    return 'I apologize, but I encountered an error processing your request. Please check your internet connection and try again.';
  }
});

ipcMain.handle('system:status', async () => {
  try {
    const ollamaStatus = await ollamaService?.checkConnection() || false;
    return {
      ollama: ollamaStatus,
      ragReady: ragSystem !== undefined
    };
  } catch (error) {
    return {
      ollama: false,
      ragReady: false
    };
  }
});
