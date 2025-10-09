# NotebookLM-like Chatbot

A powerful RAG (Retrieval Augmented Generation) chatbot built with React, Electron, and Python. Similar to NotebookLM, this application allows you to chat with your documents using AI.

## 🚀 Features

- **RAG-powered conversations**: Chat with your documents using advanced retrieval techniques
- **Document processing**: Automatic chunking and embedding of Markdown files
- **Semantic search**: Uses sentence-transformers for accurate document retrieval
- **Vector storage**: ChromaDB for efficient similarity search
- **AI responses**: Google Gemini API for intelligent answers
- **Modern UI**: React frontend with Tailwind CSS
- **Desktop app**: Electron wrapper for native desktop experience

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Desktop**: Electron
- **Backend**: FastAPI + Python
- **Embeddings**: sentence-transformers (all-MiniLM-L6-v2)
- **Vector DB**: ChromaDB
- **LLM**: Google Gemini API
- **Document Processing**: Custom markdown chunking with tiktoken

## 📋 Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- Google Gemini API key ([Get one here](https://ai.google.dev/))

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

1. **Clone and install dependencies**:
   ```bash
   git clone <your-repo-url>
   cd Chatbot
   npm install
   ```

2. **Run the complete setup**:
   ```bash
   start_all.bat
   ```
   This will:
   - Create Python virtual environment
   - Install Python dependencies
   - Start the backend server
   - Start the React development server
   - Launch the Electron app

### Option 2: Manual Setup

1. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

2. **Set up Python environment**:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # On Windows
   # source venv/bin/activate  # On macOS/Linux
   pip install -r requirements.txt
   ```

3. **Start the backend server**:
   ```bash
   python backend/main.py
   ```

4. **In a new terminal, start the React dev server**:
   ```bash
   npm run dev:react
   ```

5. **In another terminal, start Electron**:
   ```bash
   npm run dev:electron
   ```

## 📊 Loading Your Data

1. **Using the setup script**:
   ```bash
   python setup_data.py
   ```
   This will automatically load the `tas2781.md` file and configure the Gemini API.

2. **Manual data loading**:
   - Start the backend server
   - Use the `/upload-document` API endpoint to upload your markdown files
   - Configure your Gemini API key via the frontend or `/configure-gemini` endpoint

## 🔧 Configuration

### API Endpoints

The backend server runs on `http://localhost:8000` with the following endpoints:

- `GET /health` - Check server health and status
- `POST /configure-gemini` - Configure Gemini API key
- `POST /upload-document` - Upload and process documents
- `POST /chat` - Send chat messages
- `GET /collection-stats` - Get document collection statistics
- `DELETE /clear-collection` - Clear all documents

Visit `http://localhost:8000/docs` for interactive API documentation.

## 📁 Project Structure

```
Chatbot/
├── backend/
│   └── main.py              # FastAPI backend server
├── src/
│   ├── components/
│   │   ├── ChatInterface.tsx # Main chat component
│   │   └── ApiKeySetup.tsx   # API key configuration
│   ├── Electron/
│   │   ├── main.ts          # Electron main process
│   │   └── preload.ts       # Electron preload script
│   ├── App.tsx              # Main React component
│   └── main.tsx             # React entry point
├── tas2781.md               # Sample document
├── setup_data.py            # Data loading script
├── requirements.txt         # Python dependencies
└── package.json             # Node.js dependencies
```

## 🖥️ Usage

1. **Start the application** using one of the setup methods above
2. **Configure your Gemini API key** when prompted
3. **Upload documents** using the setup script or manually via the API
4. **Start chatting** with your documents!

### Example Queries

Once you've loaded the TAS2781 document, try asking:

- "What are the key features of TAS2781?"
- "What is the output power specification?"
- "Tell me about the efficiency ratings"
- "What interfaces does this amplifier support?"

## 🔍 How It Works

1. **Document Processing**: Markdown files are chunked into manageable pieces using tiktoken
2. **Embedding Generation**: Each chunk is converted to vector embeddings using sentence-transformers
3. **Vector Storage**: Embeddings are stored in ChromaDB for fast similarity search
4. **Query Processing**: User questions are embedded and matched against stored chunks
5. **Context Retrieval**: Most relevant chunks are retrieved as context
6. **AI Response**: Gemini API generates responses based on the retrieved context

## 🛠️ Development

### Available Scripts

- `npm run dev:react` - Start React development server
- `npm run dev:electron` - Start Electron app
- `npm run dev:full` - Start both React and Electron concurrently
- `npm run start:backend` - Start Python backend
- `npm run setup:data` - Load sample data
- `npm run build` - Build for production
- `npm run lint` - Run linting

## 🚧 Troubleshooting

### Common Issues

1. **Backend not starting**:
   - Ensure Python virtual environment is activated
   - Check if all dependencies are installed: `pip install -r requirements.txt`
   - Verify Python version (3.8+)

2. **Frontend not connecting to backend**:
   - Ensure backend is running on `http://localhost:8000`
   - Check browser console for CORS errors
   - Verify the backend health endpoint: `http://localhost:8000/health`

3. **Gemini API errors**:
   - Verify your API key is valid
   - Check API quota and usage limits
   - Ensure proper internet connection

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.