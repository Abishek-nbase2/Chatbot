import { useState, useEffect } from 'react'
import ChatInterface from './components/ChatInterface.tsx'
import ApiKeySetup from './components/ApiKeySetup.tsx'
import './App.css'

function App() {
  const [isGeminiConfigured, setIsGeminiConfigured] = useState(false)
  const [isBackendReady, setIsBackendReady] = useState(false)

  useEffect(() => {
    checkBackendHealth()
  }, [])

  const checkBackendHealth = async () => {
    try {
      const response = await fetch('http://localhost:8000/health')
      const health = await response.json()
      setIsBackendReady(true)
      setIsGeminiConfigured(health.gemini_configured)
    } catch (error) {
      console.error('Backend not available:', error)
      setIsBackendReady(false)
    }
  }

  const handleGeminiConfigured = () => {
    setIsGeminiConfigured(true)
  }

  if (!isBackendReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            NotebookLM-like Chatbot
          </h1>
          <div className="text-red-600 mb-4">
            ⚠️ Backend server is not running
          </div>
          <div className="text-gray-600 text-sm">
            <p>Please start the backend server:</p>
            <code className="bg-gray-100 px-2 py-1 rounded mt-2 block">
              python backend/main.py
            </code>
            <p className="mt-2">Or run the setup script:</p>
            <code className="bg-gray-100 px-2 py-1 rounded mt-2 block">
              python setup_data.py
            </code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            PPC4 Chatbot
          </h1>
          <p className="text-gray-600 text-sm">
            
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isGeminiConfigured ? (
          <ApiKeySetup onConfigured={handleGeminiConfigured} />
        ) : (
          <ChatInterface />
        )}
      </main>
    </div>
  )
}

export default App
