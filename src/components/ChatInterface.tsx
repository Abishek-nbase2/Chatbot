import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, FileText, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  sources?: Array<{
    filename: string
    chunk_index: number
    relevance_score: number
    preview: string
  }>
  timestamp: Date
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [collectionStats, setCollectionStats] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCollectionStats()
    // Add welcome message
    setMessages([
      {
        id: '1',
        type: 'assistant',
        content: 'Hello! I\'m your AI assistant.How can I help you?',
        timestamp: new Date(),
      },
    ])
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchCollectionStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/collection-stats')
      const stats = await response.json()
      setCollectionStats(stats)
    } catch (error) {
      console.error('Failed to fetch collection stats:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // Prepare conversation history
      const conversationHistory = messages.slice(-5).map(msg => ({
        user: msg.type === 'user' ? msg.content : '',
        assistant: msg.type === 'assistant' ? msg.content : '',
      }))

      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          conversation_history: conversationHistory,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        sources: data.sources,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col chat-container bg-white rounded-lg shadow-lg">
      {/* Header with collection stats */}
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bot className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">AI Assistant</h2>
          </div>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex message-fade-in ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-start">
                {message.type === 'assistant' && (
                  <Bot className="w-5 h-5 mr-2 mt-0.5 text-blue-600" />
                )}
                <div className="flex-1">
                  {message.type === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          table: ({children}) => (
                            <table className="min-w-full border-collapse border border-gray-300 my-4">
                              {children}
                            </table>
                          ),
                          thead: ({children}) => (
                            <thead className="bg-gray-50">
                              {children}
                            </thead>
                          ),
                          th: ({children}) => (
                            <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700">
                              {children}
                            </th>
                          ),
                          td: ({children}) => (
                            <td className="border border-gray-300 px-4 py-2">
                              {children}
                            </td>
                          ),
                          code: ({children, ...props}: any) => {
                            const inline = !String(props.className).includes('language-')
                            return inline ? (
                              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-blue-600">
                                {children}
                              </code>
                            ) : (
                              <code className="block bg-gray-100 p-3 rounded-lg overflow-x-auto text-sm font-mono">
                                {children}
                              </code>
                            )
                          },
                          pre: ({children}) => (
                            <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto">
                              {children}
                            </pre>
                          ),
                          blockquote: ({children}) => (
                            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600">
                              {children}
                            </blockquote>
                          ),
                          h1: ({children}) => (
                            <h1 className="text-xl font-bold text-gray-800 mt-4 mb-2">
                              {children}
                            </h1>
                          ),
                          h2: ({children}) => (
                            <h2 className="text-lg font-bold text-gray-800 mt-3 mb-2">
                              {children}
                            </h2>
                          ),
                          h3: ({children}) => (
                            <h3 className="text-base font-bold text-gray-800 mt-2 mb-1">
                              {children}
                            </h3>
                          ),
                          ul: ({children}) => (
                            <ul className="list-disc list-inside my-2 space-y-1">
                              {children}
                            </ul>
                          ),
                          ol: ({children}) => (
                            <ol className="list-decimal list-inside my-2 space-y-1">
                              {children}
                            </ol>
                          ),
                          li: ({children}) => (
                            <li className="text-gray-700">
                              {children}
                            </li>
                          ),
                          strong: ({children}) => (
                            <strong className="font-bold text-gray-800">
                              {children}
                            </strong>
                          ),
                          em: ({children}) => (
                            <em className="italic text-gray-700">
                              {children}
                            </em>
                          ),
                          p: ({children}) => (
                            <p className="mb-2 text-gray-700 leading-relaxed">
                              {children}
                            </p>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                  
                  {/* Sources */}
                  {/* {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs font-semibold text-gray-600 mb-2">
                        Sources:
                      </div>
                      <div className="space-y-2">
                        {message.sources.map((source, index) => (
                          <div
                            key={index}
                            className="bg-white border border-gray-200 rounded p-2 text-xs"
                          >
                            <div className="font-medium text-gray-700">
                              {source.filename} (chunk {source.chunk_index})
                            </div>
                            <div className="text-gray-600 mt-1">
                              Relevance: {(source.relevance_score * 100).toFixed(1)}%
                            </div>
                            <div className="text-gray-500 mt-1 italic">
                              "{source.preview}"
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )} */}
                </div>
                {message.type === 'user' && (
                  <User className="w-5 h-5 ml-2 mt-0.5" />
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center">
                <Bot className="w-5 h-5 mr-2 text-blue-600" />
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                <span className="ml-2 text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <div className="p-4 border-t bg-gray-50 rounded-b-lg">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        
        {collectionStats && collectionStats.total_chunks === 0 && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            No documents loaded. Upload documents using the setup script: <code>python setup_data.py</code>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatInterface