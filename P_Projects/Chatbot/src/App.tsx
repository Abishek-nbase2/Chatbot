import { useState } from 'react'
import PPC4 from './Components/PPC4'
import Chatbot from './Components/Chatbot'


function App() {
  const [isChatVisible, setIsChatVisible] = useState(false)

  const handleChatButtonClick = () => {
    setIsChatVisible(true)
  }

  const handleChatClose = () => {
    setIsChatVisible(false)
  }

  return (
    <div className="App">
      <PPC4 onChatButtonClick={handleChatButtonClick} />
      <Chatbot isVisible={isChatVisible} onClose={handleChatClose} />
    </div>
  )
}

export default App
