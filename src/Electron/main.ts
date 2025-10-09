import { app, BrowserWindow, shell, Menu } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn, ChildProcess } from 'child_process'
import { platform } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null

// Check if backend is running
async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8000/health')
    return response.ok
  } catch {
    return false
  }
}

// Start Python backend
function startBackend(): Promise<boolean> {
  return new Promise((resolve) => {
    const isWindows = platform() === 'win32'
    const pythonPath = isWindows 
      ? path.join(process.cwd(), 'venv', 'Scripts', 'python.exe')
      : path.join(process.cwd(), 'venv', 'bin', 'python')
    
    const backendPath = path.join(process.cwd(), 'backend', 'main.py')
    
    console.log('Starting backend with:', pythonPath, backendPath)
    
    backendProcess = spawn(pythonPath, [backendPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    })

    if (backendProcess.stdout) {
      backendProcess.stdout.on('data', (data) => {
        console.log('Backend stdout:', data.toString())
      })
    }

    if (backendProcess.stderr) {
      backendProcess.stderr.on('data', (data) => {
        console.log('Backend stderr:', data.toString())
      })
    }

    backendProcess.on('close', (code) => {
      console.log('Backend process exited with code:', code)
      backendProcess = null
    })

    // Give the backend time to start
    setTimeout(async () => {
      const isRunning = await checkBackendHealth()
      resolve(isRunning)
    }, 3000)
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../../public/vite.svg')
  })

  // Create menu
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => win.reload()
        },
        {
          label: 'Open DevTools',
          accelerator: 'F12',
          click: () => win.webContents.openDevTools()
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Backend',
      submenu: [
        {
          label: 'Check Backend Status',
          click: async () => {
            const isRunning = await checkBackendHealth()
            console.log('Backend status:', isRunning ? 'Running' : 'Not running')
          }
        },
        {
          label: 'Open Backend Docs',
          click: () => {
            shell.openExternal('http://localhost:8000/docs')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // Load the React app
    win.loadURL('http://localhost:5173')


  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow = win
}

app.whenReady().then(async () => {
  // Check if backend is already running
  const backendRunning = await checkBackendHealth()
  
  if (!backendRunning) {
    console.log('Backend not running, attempting to start...')
    const started = await startBackend()
    if (started) {
      console.log('Backend started successfully')
    } else {
      console.log('Failed to start backend')
    }
  } else {
    console.log('Backend is already running')
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // Clean up backend process
  if (backendProcess) {
    console.log('Terminating backend process...')
    backendProcess.kill()
    backendProcess = null
  }
})