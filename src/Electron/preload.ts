import { contextBridge } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // System info
  platform: process.platform,
  
  // Backend management
  checkBackendHealth: () => {
    return fetch('http://localhost:8000/health')
      .then(response => response.ok)
      .catch(() => false)
  },
  
  // App info
  getAppVersion: () => process.env.npm_package_version || '1.0.0',
  
  // Development helpers
  isDevelopment: process.env.NODE_ENV === 'development'
})

// Log that preload script has loaded
console.log('Preload script loaded successfully')