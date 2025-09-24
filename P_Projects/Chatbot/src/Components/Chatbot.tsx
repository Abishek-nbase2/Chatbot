import { useState, useEffect } from "react";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  isThinking?: boolean;
}

interface ChatbotProps {
  isVisible: boolean;
  onClose: () => void;
}

function Chatbot({ isVisible, onClose }: ChatbotProps){
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [systemReady, setSystemReady] = useState(false)

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const status = await window.electron.ipcRenderer.invoke('system:status')
        setSystemReady(status.ollama && status.ragReady)
        
        // Add welcome message based on system status
        const welcomeMessage: Message = {
          id: 'welcome',
          text: status.ollama && status.ragReady 
            ? 'Hello! I\'m your AI assistant for the TAS2781 technical documentation. I have processed the complete document including text, tables, and images. I can help you with questions about registers, addresses, commands, system configurations, and any technical details from the TAS2781 document. What would you like to know?'
            : 'Hello! I\'m initializing and processing the TAS2781 documentation. Please wait a moment while I get ready to assist you. Make sure Ollama is running on your system.',
          sender: 'bot'
        }
        
        setMessages([welcomeMessage])
      } catch (error) {
        console.error('Error checking system status:', error)
        const errorMessage: Message = {
          id: 'error',
          text: 'Hello! I\'m having trouble connecting to the AI system. Please make sure Ollama is installed and running, then refresh the application.',
          sender: 'bot'
        }
        setMessages([errorMessage])
      }
    }

    if (isVisible) {
      checkSystemStatus()
    }
  }, [isVisible])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    
    if (!systemReady) {
      const systemMessage: Message = {
        id: Date.now().toString(),
        text: 'The AI system is still initializing. Please wait a moment and try again.',
        sender: 'bot'
      }
      setMessages(prev => [...prev, systemMessage])
      return
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user'
    }
    
    const thinkingMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: 'Thinking...',
      sender: 'bot',
      isThinking: true
    }
    
    setMessages(prev => [...prev, userMessage, thinkingMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Call main process via IPC
      const reply = await window.electron.ipcRenderer.invoke('ollama:chat', input)
      
      // Replace thinking message with actual response
      setMessages(prev => prev.map(msg => 
        msg.isThinking ? { ...msg, text: reply, isThinking: false } : msg
      ))
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.isThinking ? { ...msg, text: 'Sorry, I encountered an error. Please try again.', isThinking: false } : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className={`fixed top-0 right-0 w-96 h-screen bg-gray-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
      isVisible ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">AI Chat</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl cursor-pointer"
            title="Close Chat"
          >
            ×
          </button>
        </div>
        
        <div className="flex-1 overflow-auto space-y-3 mb-4 px-2">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-700 text-gray-100 rounded-bl-none'
              } ${message.isThinking ? 'animate-pulse' : ''}`}>
                <div className="text-sm font-medium mb-1 opacity-75">
                  {message.sender === 'user' ? 'You' : 'Bot'}
                </div>
                <div className="text-sm leading-relaxed">
                  {message.text}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
            className="flex-1 p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={isLoading ? "Bot is thinking..." : systemReady ? "Type a message..." : "System initializing..."}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className="ml-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Chatbot;