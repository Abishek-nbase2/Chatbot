import PPCImg from '../assets/image.png'

interface PPC4Props {
  onChatButtonClick: () => void;
}

function PPC4({ onChatButtonClick }: PPC4Props){
    return(
        <div className="relative w-full h-screen overflow-hidden">
            <img src={PPCImg} alt="background.png" className="w-full h-full object-cover" />
            <button 
                onClick={onChatButtonClick}
                className="absolute bottom-9 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors duration-200 cursor-pointer"
                title="Open Chat"
            >
                <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path 
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
        </div>
    )
}

export default PPC4;